/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  GameMode,
  CameraMode,
  ShipModel,
  ShipColor,
  PlayerStats,
  ControlInputState,
  WorldRegionId,
} from '../types/game';
import { VEHICLES, WORLD_REGIONS } from '../data/constants';
import { soundEngine } from '../audio/soundEngine';
import {
  isSoftwareGl,
  createTrackTexture,
  createBoostPadTexture,
} from './materials';
import {
  createHovercraft,
  createCrystal,
  createShieldPickup,
  createBoostPadMesh,
  createLaserBarrier,
  createDroneHazard,
  createJumpRamp,
  createCitySpire,
  createTashkentTVTower,
  createKhivaKaltaMinor,
  createIchanQalaGate,
  createHighwayGantrySign,
  createStreetLightPole,
  createPedestrianCharacter,
  createGaiPatrolCar,
  VehicleParts,
  PedestrianParts,
} from './models';
import { buildGrandOpenWorld, WorldPoi, CITY_SPAWN_COORDS } from './openWorld';

// Pre-allocated math helpers to eliminate GC pauses
const _v1 = new THREE.Vector3();

interface SpawnedEntity {
  type: 'crystal' | 'shield' | 'boost_pad' | 'laser' | 'drone' | 'ramp' | 'arch' | 'landmark';
  group: THREE.Object3D;
  hitboxRadius: number;
  hitboxHeight: number;
  z: number;
  x: number;
  active: boolean;
  extra?: unknown;
}

export interface RivalRacer {
  id: string;
  name: string;
  parts: VehicleParts;
  model: ShipModel;
  color: ShipColor;
  pos: THREE.Vector3;
  speed: number;
  targetLaneX: number;
  laneChangeTimer: number;
  wheelRotationAngle: number;
  yaw: number;
  isPassed: boolean;
}

export class GameEngine {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;

  private container: HTMLElement;
  private animationFrameId: number = 0;
  private clock: THREE.Clock;

  // Game config & state
  public mode: GameMode = 'open_world';
  public cameraMode: CameraMode = 'chase';
  public shipModel: ShipModel = 'malibu2';
  public shipColor: ShipColor = 'white';

  // World Tour Navigation & Biomes
  public currentRegion: WorldRegionId = 'tashkent';
  private targetSkyColor: THREE.Color = new THREE.Color(0x071126);
  private targetFogColor: THREE.Color = new THREE.Color(0x0f1d38);

  // Stats
  public stats: PlayerStats = {
    score: 0,
    highScore: 0,
    distance: 0,
    speed: 0,
    maxSpeedReached: 0,
    gear: 1,
    rpm: 900,
    crystals: 0,
    multiplier: 1,
    comboCount: 0,
    shields: 4,
    maxShields: 4,
    nitro: 100,
    isNitroActive: false,
    lapTime: 0,
    bestLapTime: 0,
    stuntScore: 0,
    lastStuntName: '',
    currentRegion: 'tashkent',
    regionName: 'Katta Ochiq Dunyo • O‘zbekiston',
    regionProgress: 0,
    worldX: 0,
    worldZ: 0,
    racePosition: 1,
    totalRacers: 6,
    isOnFoot: false,
    energy: 100,
    hunger: 100,
    sirenActive: false,
    migalkaActive: false,
    nearbyPoi: 'none',
    nearbyPoiLabel: '',
    nearCar: true,
    gaiAlert: 0,
    gaiFines: 0,
    headlightsOn: true,
  };

  public isRunning: boolean = false;
  public isGameOver: boolean = false;

  // Controls input (starts neutral so car only drives when Gaz is pressed)
  public input: ControlInputState = {
    steer: 0,
    throttle: 0,
    boost: false,
    jump: false,
    drift: false,
  };

  public onStatsUpdate: ((stats: PlayerStats) => void) | null = null;
  public onGameOver: ((stats: PlayerStats) => void) | null = null;
  public onRegionChange: ((region: WorldRegionId) => void) | null = null;

  // Player 3D Vehicle & Wheel Parts
  private playerGroup: THREE.Group = new THREE.Group();
  private playerParts: VehicleParts | null = null;
  private wheelRotationAngle: number = 0;

  // On-foot Pedestrian & Park/Choyxona state
  private isOnFoot: boolean = false;
  private pedestrian: PedestrianParts | null = null;
  private pedestrianPos = new THREE.Vector3(0, 0, 0);
  private pedestrianHeading: number = 0;
  private pedestrianVelocityY: number = 0;
  private pedestrianGrounded: boolean = true;
  private pedestrianWalkCycle: number = 0;
  private poiTriggerCooldown: number = 0;
  private lastAutoPoiId: string = '';

  // Headlights (Faralar), Migalka / Sirena & GAI YPX Patrol state
  private headlightsOn: boolean = true;
  private migalkaActive: boolean = false;
  private sirenActive: boolean = false;
  private gaiGraceCooldown: number = 0;
  private gaiBeaconPairs: { red: THREE.Mesh; blue: THREE.Mesh }[] = [];
  private gaiPatrols: {
    parts: VehicleParts;
    pos: THREE.Vector3;
    heading: number;
    speed: number;
    chasing: boolean;
    patrolAxis: 'z' | 'x';
    patrolLane: number;
    patrolDir: number;
  }[] = [];

  // Open World City & POIs
  private openWorldGroup: THREE.Group = new THREE.Group();
  private openWorldBuilt: boolean = false;
  private openWorldPois: WorldPoi[] = [];

  // Player physics
  private playerPos = new THREE.Vector3(0, 0, 0);
  private playerHeading: number = 0; // heading angle in radians for open world
  private playerYaw: number = 0; // visual yaw turning angle
  private playerVelocityY: number = 0;
  private isGrounded: boolean = true;
  private playerRoll: number = 0;
  private playerPitch: number = 0;
  private currentSpeed: number = 0;
  private forwardDistance: number = 0;
  private airTime: number = 0;
  private lastHornTriggerMs: number = 0;
  private lastBoostSoundMs: number = 0;

  // Rival Competitor Racers
  private rivalRacers: RivalRacer[] = [];

  // Track & procedural world
  private trackSegments: THREE.Mesh[] = [];
  private trackTexture: THREE.CanvasTexture;
  private boostPadTexture: THREE.CanvasTexture;
  private activeEntities: SpawnedEntity[] = [];
  private nextSpawnZ: number = 60;
  private trackWidth: number = 18; // Wide 4-lane international highway

  // Particles
  private speedParticles: THREE.Points | null = null;
  private sparkParticles: THREE.Points | null = null;
  private sparkGeo: THREE.BufferGeometry | null = null;
  private sparkCount = 80;
  private sparkPositions: Float32Array = new Float32Array(this.sparkCount * 3);
  private sparkVelocities: Float32Array = new Float32Array(this.sparkCount * 3);
  private sparkLifetimes: Float32Array = new Float32Array(this.sparkCount);

  // Tire smoke pool
  private smokeParticles: THREE.Points | null = null;
  private smokeGeo: THREE.BufferGeometry | null = null;
  private smokeCount = 60;
  private smokePositions: Float32Array = new Float32Array(this.smokeCount * 3);
  private smokeLifetimes: Float32Array = new Float32Array(this.smokeCount);
  private nextSmokeIdx = 0;

  // Lighting & Scenery
  private dirLight: THREE.DirectionalLight | null = null;
  private hemiLight: THREE.HemisphereLight | null = null;
  private sceneryGroup: THREE.Group = new THREE.Group();
  private worldFloorMesh: THREE.Mesh | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();

    // 1. WebGL Renderer with Software WebGL Guard (Three.js Skill Standard)
    this.renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.shadowMap.enabled = !isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    // 2. Scene & Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x030712);
    this.scene.fog = new THREE.FogExp2(0x0f172a, 0.007);

    // 3. Camera
    this.camera = new THREE.PerspectiveCamera(
      65,
      container.clientWidth / container.clientHeight,
      0.1,
      800
    );
    this.camera.position.set(0, 3.2, -5.8);

    // 4. Procedural Studio Reflection Environment
    try {
      const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmremGenerator.fromScene(
        new RoomEnvironment(),
        0.04
      ).texture;
      pmremGenerator.dispose();
    } catch {}

    // 5. Procedural Textures
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.trackTexture = createTrackTexture(maxAniso);
    this.boostPadTexture = createBoostPadTexture();

    // 6. Setup Scene Components
    this.setupLighting();
    this.setupScenery();
    this.setupTrack();
    this.setupPlayer();
    this.setupPedestrian();
    this.setupParticles();
    this.scene.add(this.openWorldGroup);
    this.openWorldGroup.visible = false;

    window.addEventListener('resize', this.onWindowResize);

    if (!isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private setupLighting() {
    this.dirLight = new THREE.DirectionalLight(0xfff5ea, 1.9);
    this.dirLight.position.set(25, 55, 35);
    this.dirLight.castShadow = !isSoftwareGl;
    if (this.dirLight.castShadow) {
      this.dirLight.shadow.mapSize.width = 1024;
      this.dirLight.shadow.mapSize.height = 1024;
      this.dirLight.shadow.camera.near = 1;
      this.dirLight.shadow.camera.far = 140;
      const d = 35;
      this.dirLight.shadow.camera.left = -d;
      this.dirLight.shadow.camera.right = d;
      this.dirLight.shadow.camera.top = d;
      this.dirLight.shadow.camera.bottom = -d;
      this.dirLight.shadow.bias = -0.0005;
      this.dirLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.dirLight);

    this.hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.9);
    this.scene.add(this.hemiLight);

    const ambient = new THREE.AmbientLight(0x1e1b4b, 0.45);
    this.scene.add(ambient);
  }

  private setupScenery() {
    this.scene.add(this.sceneryGroup);

    // Massive 1,000m x 1,000m continuous open world terrain
    const floorGeo = new THREE.PlaneGeometry(1200, 1200, 40, 40);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x050814,
      metalness: 0.8,
      roughness: 0.6,
      wireframe: true,
    });
    this.worldFloorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.worldFloorMesh.position.y = -0.05;
    this.scene.add(this.worldFloorMesh);

    // Initial scenery spawn
    this.spawnInitialScenery();
  }

  private spawnInitialScenery() {
    // 1. Tashkent TV Tower visible in the distance
    const tvTower = createTashkentTVTower();
    tvTower.position.set(-58, 0, 150);
    this.sceneryGroup.add(tvTower);

    // 2. Modern Tashkent City Skyscrapers
    for (let i = 0; i < 20; i++) {
      const height = 45 + Math.random() * 85;
      const width = 8 + Math.random() * 12;
      const spire = createCitySpire(height, width);
      const side = Math.random() > 0.5 ? 1 : -1;
      const x = side * (34 + Math.random() * 75);
      const z = Math.random() * 500 - 50;
      spire.position.set(x, 0, z);
      this.sceneryGroup.add(spire);
    }

    // 3. Street Light Poles along the avenue shoulders
    for (let z = -20; z < 320; z += 45) {
      const leftLight = createStreetLightPole();
      leftLight.position.set(-11, 0, z);
      this.sceneryGroup.add(leftLight);

      const rightLight = createStreetLightPole();
      rightLight.position.set(11, 0, z);
      rightLight.rotation.y = Math.PI;
      this.sceneryGroup.add(rightLight);
    }

    // 4. Initial Overhead Street Sign for Tashkent
    const initialSign = createHighwayGantrySign('TOSHKENT SHAHRI', 'AMIR TEMUR SHOH KO‘CHASI');
    initialSign.position.set(0, 0, 85);
    this.sceneryGroup.add(initialSign);
  }

  private setupTrack() {
    // 6 wide international highway segments that cycle seamlessly
    const segmentLength = 120;
    const trackGeo = new THREE.PlaneGeometry(this.trackWidth, segmentLength);
    trackGeo.rotateX(-Math.PI / 2);

    const trackMat = new THREE.MeshStandardMaterial({
      map: this.trackTexture,
      metalness: 0.65,
      roughness: 0.25,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });

    for (let i = 0; i < 6; i++) {
      const mesh = new THREE.Mesh(trackGeo, trackMat);
      mesh.position.set(0, 0, i * segmentLength);
      mesh.receiveShadow = !isSoftwareGl;
      this.scene.add(mesh);
      this.trackSegments.push(mesh);
    }
  }

  public setupPlayer() {
    if (this.playerGroup.parent) {
      this.scene.remove(this.playerGroup);
    }

    const parts = createHovercraft(this.shipModel, this.shipColor);
    this.playerParts = parts;
    this.playerGroup = parts.group;

    const shadowGeo = new THREE.PlaneGeometry(2.8, 4.4);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.y = 0.02;
    this.playerGroup.add(shadowMesh);

    this.playerPos.set(0, parts.isCar ? 0.02 : 0.45, 0);
    this.playerGroup.position.copy(this.playerPos);
    this.scene.add(this.playerGroup);

    const cfg = VEHICLES[this.shipModel];
    this.stats.maxShields = cfg.shieldMax;
    this.stats.shields = cfg.shieldMax;
    if (this.playerParts?.migalkaGroup) {
      this.playerParts.migalkaGroup.visible = this.migalkaActive;
    }
    if (this.playerParts?.driverGroup) {
      this.playerParts.driverGroup.visible = !this.isOnFoot;
    }
    this.applyHeadlightsVisual();
  }

  private applyHeadlightsVisual() {
    if (!this.playerParts) return;
    if (this.playerParts.headlightBeams) {
      this.playerParts.headlightBeams.visible = this.headlightsOn;
    }
    if (this.playerParts.headlightSpot) {
      this.playerParts.headlightSpot.intensity = this.headlightsOn ? 8.5 : 0;
    }
    if (this.playerParts.headlightMat) {
      const onColor =
        this.shipModel === 'damas' || this.shipModel === 'matiz' || this.shipModel === 'cobalt'
          ? 0xfef3c7
          : 0xf8fafc;
      this.playerParts.headlightMat.color.setHex(this.headlightsOn ? onColor : 0x475569);
    }
  }

  private setupPedestrian() {
    if (this.pedestrian) {
      this.scene.remove(this.pedestrian.group);
    }
    this.pedestrian = createPedestrianCharacter();
    this.pedestrian.group.visible = false;
    this.scene.add(this.pedestrian.group);
  }

  private ensureOpenWorldBuilt() {
    if (this.openWorldBuilt) return;
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const res = buildGrandOpenWorld(this.openWorldGroup, maxAniso);
    this.openWorldPois = res.pois;
    this.gaiBeaconPairs = res.beaconPairs;
    this.openWorldBuilt = true;
  }

  private setupGaiPatrols() {
    this.gaiPatrols.forEach((g) => this.scene.remove(g.parts.group));
    this.gaiPatrols = [];

    const specs: { model: 'cobalt' | 'malibu2'; x: number; z: number; axis: 'z' | 'x'; lane: number; dir: number; speed: number }[] = [
      { model: 'cobalt', x: -5, z: 75, axis: 'z', lane: -5, dir: 1, speed: 16 },
      { model: 'malibu2', x: 5, z: -120, axis: 'z', lane: 5, dir: -1, speed: 20 },
      { model: 'cobalt', x: -160, z: 4, axis: 'x', lane: 4, dir: 1, speed: 17 },
    ];

    specs.forEach((sp) => {
      const parts = createGaiPatrolCar(sp.model);
      const pos = new THREE.Vector3(sp.x, 0.02, sp.z);
      parts.group.position.copy(pos);
      const heading = sp.axis === 'z' ? (sp.dir > 0 ? 0 : Math.PI) : sp.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      parts.group.rotation.y = heading;
      this.scene.add(parts.group);
      this.gaiPatrols.push({
        parts,
        pos,
        heading,
        speed: sp.speed,
        chasing: false,
        patrolAxis: sp.axis,
        patrolLane: sp.lane,
        patrolDir: sp.dir,
      });
    });
  }

  private setupParticles() {
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = Math.random() * 14;
      positions[i * 3 + 2] = Math.random() * 160 - 20;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.15,
      transparent: true,
      opacity: 0.4,
    });
    this.speedParticles = new THREE.Points(particleGeo, particleMat);
    this.scene.add(this.speedParticles);

    // Sparks
    this.sparkGeo = new THREE.BufferGeometry();
    this.sparkGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.sparkPositions, 3)
    );
    const sparkMat = new THREE.PointsMaterial({
      color: 0xf43f5e,
      size: 0.25,
      transparent: true,
      opacity: 0.9,
    });
    this.sparkParticles = new THREE.Points(this.sparkGeo, sparkMat);
    this.scene.add(this.sparkParticles);

    // Tire smoke
    this.smokeGeo = new THREE.BufferGeometry();
    for (let i = 0; i < this.smokeCount * 3; i++) {
      this.smokePositions[i] = -100;
    }
    this.smokeGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.smokePositions, 3)
    );
    const smokeMat = new THREE.PointsMaterial({
      color: 0xcbd5e1,
      size: 0.45,
      transparent: true,
      opacity: 0.6,
    });
    this.smokeParticles = new THREE.Points(this.smokeGeo, smokeMat);
    this.scene.add(this.smokeParticles);
  }

  public emitSparks(origin: THREE.Vector3, colorHex: number = 0xf43f5e) {
    if (!this.sparkParticles || !this.sparkGeo) return;
    (this.sparkParticles.material as THREE.PointsMaterial).color.setHex(colorHex);

    for (let i = 0; i < this.sparkCount; i++) {
      this.sparkPositions[i * 3] = origin.x;
      this.sparkPositions[i * 3 + 1] = origin.y + 0.3;
      this.sparkPositions[i * 3 + 2] = origin.z;

      this.sparkVelocities[i * 3] = (Math.random() - 0.5) * 14;
      this.sparkVelocities[i * 3 + 1] = Math.random() * 12 + 2;
      this.sparkVelocities[i * 3 + 2] = (Math.random() - 0.5) * 14;
      this.sparkLifetimes[i] = 0.4 + Math.random() * 0.4;
    }
    const posAttr = this.sparkGeo.attributes.position;
    if (posAttr) {
      posAttr.needsUpdate = true;
    }
  }

  private emitTireSmoke(x: number, z: number) {
    if (!this.smokeGeo) return;
    const idx = this.nextSmokeIdx;
    this.nextSmokeIdx = (this.nextSmokeIdx + 1) % this.smokeCount;

    this.smokePositions[idx * 3] = x + (Math.random() - 0.5) * 0.4;
    this.smokePositions[idx * 3 + 1] = 0.2 + Math.random() * 0.3;
    this.smokePositions[idx * 3 + 2] = z + (Math.random() - 0.5) * 0.4;
    this.smokeLifetimes[idx] = 0.55;

    const posAttr = this.smokeGeo.attributes.position;
    if (posAttr) {
      posAttr.needsUpdate = true;
    }
  }

  public startGame(mode: GameMode = 'open_world', initialRegion?: WorldRegionId) {
    this.mode = mode;
    this.isRunning = true;
    this.isGameOver = false;

    const cfg = VEHICLES[this.shipModel];
    const startRegion: WorldRegionId = initialRegion || this.currentRegion || 'tashkent';
    this.stats.score = 0;
    this.stats.distance = 0;
    this.stats.speed = 0;
    this.stats.maxSpeedReached = 0;
    this.stats.gear = 1;
    this.stats.rpm = 900;
    this.stats.crystals = 0;
    this.stats.multiplier = 1;
    this.stats.comboCount = 0;
    this.stats.shields = cfg.shieldMax;
    this.stats.maxShields = cfg.shieldMax;
    this.stats.nitro = 100;
    this.stats.isNitroActive = false;
    this.stats.lapTime = 0;
    this.stats.stuntScore = 0;
    this.stats.lastStuntName = '';
    this.stats.energy = 100;
    this.stats.hunger = 100;
    this.stats.isOnFoot = false;
    this.stats.nearCar = true;
    this.stats.nearbyPoi = 'none';
    this.stats.nearbyPoiLabel = '';
    this.stats.gaiAlert = 0;
    this.stats.gaiFines = 0;
    this.stats.headlightsOn = this.headlightsOn;

    this.isOnFoot = false;
    this.poiTriggerCooldown = 0;
    this.gaiGraceCooldown = 0;
    this.lastAutoPoiId = '';
    if (this.pedestrian) {
      this.pedestrian.group.visible = false;
    }
    if (this.playerParts?.driverGroup) {
      this.playerParts.driverGroup.visible = true;
    }
    this.applyHeadlightsVisual();

    this.currentRegion = startRegion;
    this.stats.currentRegion = startRegion;
    this.applyRegionAtmosphere(startRegion);

    const isCar = this.playerParts?.isCar ?? true;
    const spawnCoords = CITY_SPAWN_COORDS[startRegion] || CITY_SPAWN_COORDS.tashkent;
    this.playerPos.set(
      mode === 'open_world' ? spawnCoords.x : 0,
      isCar ? 0.02 : 0.45,
      mode === 'open_world' ? spawnCoords.z : 0
    );
    this.playerHeading = mode === 'open_world' ? spawnCoords.heading : 0;
    this.playerVelocityY = 0;
    this.isGrounded = true;
    this.playerRoll = 0;
    this.playerPitch = 0;
    // Start parked at 0 — moves ONLY when GAZ pedal is pressed!
    this.currentSpeed = 0;
    const regionsOrder: WorldRegionId[] = ['tashkent', 'm39_highway', 'khorezm', 'samarkand'];
    this.forwardDistance =
      mode === 'world_tour' ? Math.max(0, regionsOrder.indexOf(startRegion)) * 900 : 0;
    this.airTime = 0;
    this.playerYaw = 0;
    this.playerGroup.position.copy(this.playerPos);
    this.playerGroup.rotation.set(0, this.playerHeading, 0);

    // Snap camera immediately behind vehicle
    this.camera.position.set(
      this.playerPos.x - Math.sin(this.playerHeading) * 6.4,
      this.playerPos.y + 2.6,
      this.playerPos.z - Math.cos(this.playerHeading) * 6.4
    );

    this.clearEntities();

    if (mode === 'open_world') {
      this.ensureOpenWorldBuilt();
      this.openWorldGroup.visible = true;
      this.sceneryGroup.visible = false;
      this.trackSegments.forEach((s) => (s.visible = false));
      if (this.worldFloorMesh) this.worldFloorMesh.visible = false;
      if (this.scene.fog) {
        (this.scene.fog as THREE.FogExp2).density = 0.0022;
      }
      this.stats.regionName = WORLD_REGIONS[startRegion].name.uz;
      this.stats.racePosition = 1;
      this.stats.totalRacers = 1;
      this.rivalRacers.forEach((r) => this.scene.remove(r.parts.group));
      this.rivalRacers = [];
      this.setupGaiPatrols();
    } else {
      this.openWorldGroup.visible = false;
      this.sceneryGroup.visible = true;
      this.trackSegments.forEach((s, i) => {
        s.visible = true;
        s.position.set(0, 0, i * 120);
      });
      if (this.worldFloorMesh) {
        this.worldFloorMesh.visible = true;
        this.worldFloorMesh.position.z = 0;
      }
      if (this.scene.fog) {
        (this.scene.fog as THREE.FogExp2).density = 0.007;
      }
      this.stats.regionName = WORLD_REGIONS[startRegion].name.uz;
      this.stats.racePosition = 6;
      this.stats.totalRacers = 6;
      this.setupRivalRacers();
      this.setupGaiPatrols();
      this.nextSpawnZ = 50;
      for (let i = 0; i < 14; i++) {
        this.spawnWorldRoadContent();
      }
    }

    soundEngine.userGesture();
    soundEngine.setSiren(this.sirenActive);
    soundEngine.startMusic();
  }

  public restartGame() {
    this.startGame(this.mode, this.currentRegion);
  }

  // Fast Travel / Teleport to any Uzbekistan city or highway in BOTH Open World & World Tour!
  public teleportToRegion(regionId: WorldRegionId) {
    this.currentRegion = regionId;
    this.stats.currentRegion = regionId;
    this.stats.regionName = WORLD_REGIONS[regionId].name.uz;
    this.applyRegionAtmosphere(regionId);

    if (this.mode === 'open_world') {
      this.ensureOpenWorldBuilt();
      this.openWorldGroup.visible = true;
      const target = CITY_SPAWN_COORDS[regionId] || CITY_SPAWN_COORDS.tashkent;
      this.playerPos.set(target.x, this.playerParts?.isCar ? 0.02 : 0.45, target.z);
      this.playerHeading = target.heading;
      this.currentSpeed = 0;
      this.playerGroup.position.copy(this.playerPos);
      this.playerGroup.rotation.set(0, this.playerHeading, 0);

      if (this.isOnFoot && this.pedestrian) {
        this.pedestrianPos.set(target.x + 1.65, 0, target.z);
        this.pedestrianHeading = target.heading;
        this.pedestrian.group.position.copy(this.pedestrianPos);
        this.pedestrian.group.rotation.y = this.pedestrianHeading;
      }

      // Snap camera to new city immediately
      const focus = this.isOnFoot ? this.pedestrianPos : this.playerPos;
      this.camera.position.set(
        focus.x - Math.sin(this.playerHeading) * 6.4,
        focus.y + 2.6,
        focus.z - Math.cos(this.playerHeading) * 6.4
      );
    } else {
      // Update forwardDistance to match selected region milestone so update() stays on chosen city
      const regionsOrder: WorldRegionId[] = ['tashkent', 'm39_highway', 'khorezm', 'samarkand'];
      const idx = Math.max(0, regionsOrder.indexOf(regionId));
      const baseMilestone = Math.floor(this.forwardDistance / 3600) * 3600;
      this.forwardDistance = baseMilestone + idx * 900 + 20;

      this.clearEntities();
      this.repositionRivalRacersAhead();
      this.nextSpawnZ = this.playerPos.z + 20;
      for (let i = 0; i < 12; i++) {
        this.spawnWorldRoadContent();
      }
    }

    this.stats.lastStuntName = `✈️ ${WORLD_REGIONS[regionId].city.uz.toUpperCase()}GA SAYOHAT QILINDI!`;
    if (this.onStatsUpdate) {
      this.onStatsUpdate({ ...this.stats });
    }
    if (this.onRegionChange) {
      this.onRegionChange(regionId);
    }
  }

  private applyRegionAtmosphere(regionId: WorldRegionId) {
    const reg = WORLD_REGIONS[regionId];
    if (!reg) return;

    this.targetSkyColor.setHex(reg.skyColor);
    this.targetFogColor.setHex(reg.fogColor);

    if (this.hemiLight) {
      this.hemiLight.color.setHex(reg.skyColor);
      this.hemiLight.groundColor.setHex(reg.groundColor);
    }
    if (this.worldFloorMesh) {
      (this.worldFloorMesh.material as THREE.MeshStandardMaterial).color.setHex(reg.groundColor);
    }
  }

  private clearEntities() {
    this.activeEntities.forEach((ent) => {
      this.scene.remove(ent.group);
    });
    this.activeEntities = [];
  }

  // Setup 5 Iconic Uzbek Rival Competitors for intense highway racing
  private setupRivalRacers() {
    this.rivalRacers.forEach((r) => {
      this.scene.remove(r.parts.group);
    });
    this.rivalRacers = [];

    const configs: {
      id: string;
      name: string;
      model: ShipModel;
      color: ShipColor;
      offsetZ: number;
      laneX: number;
      speed: number;
    }[] = [
      {
        id: 'rival_1',
        name: 'Oq Damas Turbo',
        model: 'damas',
        color: 'white',
        offsetZ: 25,
        laneX: -3.6,
        speed: 48,
      },
      {
        id: 'rival_2',
        name: 'Qora Gentra',
        model: 'gentra',
        color: 'black',
        offsetZ: 58,
        laneX: 3.6,
        speed: 56,
      },
      {
        id: 'rival_3',
        name: 'Kumush Cobalt',
        model: 'cobalt',
        color: 'silver',
        offsetZ: 92,
        laneX: -1.8,
        speed: 62,
      },
      {
        id: 'rival_4',
        name: 'BYD Chazor',
        model: 'byd_uz',
        color: 'cyan',
        offsetZ: 130,
        laneX: 1.8,
        speed: 68,
      },
      {
        id: 'rival_5',
        name: 'Malibu 2 Turbo',
        model: 'malibu2',
        color: 'crimson',
        offsetZ: 170,
        laneX: 5.5,
        speed: 74,
      },
    ];

    configs.forEach((cfg) => {
      const parts = createHovercraft(cfg.model, cfg.color);
      const pos = new THREE.Vector3(cfg.laneX, 0.02, this.playerPos.z + cfg.offsetZ);
      parts.group.position.copy(pos);
      this.scene.add(parts.group);

      this.rivalRacers.push({
        id: cfg.id,
        name: cfg.name,
        parts,
        model: cfg.model,
        color: cfg.color,
        pos,
        speed: cfg.speed,
        targetLaneX: cfg.laneX,
        laneChangeTimer: 2 + Math.random() * 3,
        wheelRotationAngle: 0,
        yaw: 0,
        isPassed: false,
      });
    });
  }

  private repositionRivalRacersAhead() {
    const lanes = [-5.5, -3.6, -1.8, 1.8, 3.6, 5.5];
    this.rivalRacers.forEach((rival, i) => {
      rival.pos.z = this.playerPos.z + 30 + i * 40;
      rival.pos.x = lanes[i % lanes.length];
      rival.targetLaneX = rival.pos.x;
      rival.isPassed = false;
      rival.parts.group.position.copy(rival.pos);
    });
  }

  private updateRivalRacers(delta: number) {
    const pX = this.playerPos.x;
    const pZ = this.playerPos.z;

    for (const rival of this.rivalRacers) {
      // 1. Advance along highway
      rival.pos.z += rival.speed * delta;

      // 2. AI lane switching
      rival.laneChangeTimer -= delta;
      if (rival.laneChangeTimer <= 0) {
        rival.laneChangeTimer = 2.5 + Math.random() * 4.5;
        const lanes = [-5.5, -3.8, -1.8, 1.8, 3.8, 5.5];
        rival.targetLaneX = lanes[Math.floor(Math.random() * lanes.length)];
      }

      const dx = rival.targetLaneX - rival.pos.x;
      const step = Math.sign(dx) * Math.min(Math.abs(dx), delta * 4.5);
      rival.pos.x += step;

      const targetRivalYaw = Math.sign(dx) * (Math.abs(dx) > 0.1 ? 0.16 : 0);
      rival.yaw = THREE.MathUtils.damp(rival.yaw, targetRivalYaw, 8, delta);
      rival.parts.group.rotation.y = rival.yaw;

      rival.parts.frontSteerPivots.forEach((pivot) => {
        pivot.rotation.y = Math.sign(dx) * 0.35;
      });

      // 3D wheels spinning
      const wheelCircumference = 2 * Math.PI * 0.36;
      rival.wheelRotationAngle -= (rival.speed / wheelCircumference) * Math.PI * 2 * delta;
      rival.parts.wheels.forEach((w) => {
        w.rotation.x = rival.wheelRotationAngle;
      });

      rival.parts.group.position.copy(rival.pos);

      // 3. Overtake bonus
      if (pZ > rival.pos.z && !rival.isPassed) {
        rival.isPassed = true;
        this.stats.score += 600;
        this.stats.stuntScore += 600;
        this.stats.lastStuntName = `QUVI O‘TISH! (${rival.name})`;
        this.emitSparks(rival.pos, 0x10b981);
      }

      // 4. Reposition ahead if fallen far behind
      if (rival.pos.z < pZ - 50) {
        rival.pos.z = pZ + 85 + Math.random() * 55;
        const lanes = [-5.5, -3.8, -1.8, 1.8, 3.8, 5.5];
        rival.pos.x = lanes[Math.floor(Math.random() * lanes.length)];
        rival.targetLaneX = rival.pos.x;
        rival.isPassed = false;
        rival.speed = 52 + Math.random() * 18;
      } else if (rival.pos.z > pZ + 250) {
        rival.speed = Math.max(45, this.currentSpeed * 0.92);
      }

      // 5. AVARIYA (ACCIDENT): Touching rival car causes instant major crash accident!
      const distZ = Math.abs(pZ - rival.pos.z);
      const distX = Math.abs(pX - rival.pos.x);
      if (distZ < 4.0 && distX < 2.1) {
        this.stats.shields = 0;
        this.stats.comboCount = 0;
        this.stats.multiplier = 1;
        this.currentSpeed = 0;
        this.stats.lastStuntName = '💥 KATTA AVARIYA! RAQIB MOSHINA BILAN TO‘QNASHDİ!';

        // Sound: Metal crunch & explosion
        soundEngine.playAccident();

        // Massive sparks & smoke
        this.emitSparks(this.playerPos, 0xff0033);
        this.emitSparks(rival.pos, 0xff5500);
        this.emitTireSmoke(this.playerPos.x - 0.5, this.playerPos.z);
        this.emitTireSmoke(this.playerPos.x + 0.5, this.playerPos.z);
        this.emitTireSmoke(rival.pos.x, rival.pos.z);

        // Avariya dramatic spin & flip physics
        this.playerVelocityY = 14;
        this.playerRoll += Math.PI * 1.25;
        this.playerYaw += 3.2;
        this.playerPitch += 0.8;
        this.isGrounded = false;

        // Rival car also skids in the accident
        rival.speed = 10;
        rival.yaw += 1.8;

        this.triggerGameOver();
        return;
      }
    }

    // 6. Calculate Race Position
    const rivalsAhead = this.rivalRacers.filter((r) => r.pos.z > pZ).length;
    this.stats.racePosition = rivalsAhead + 1;
    this.stats.totalRacers = this.rivalRacers.length + 1;
  }

  // Real Supercar Horn / Signal
  public triggerHorn() {
    if (!this.isRunning || this.isGameOver) return;
    const nowMs = performance.now();
    if (nowMs - this.lastHornTriggerMs < 380) return;
    this.lastHornTriggerMs = nowMs;

    soundEngine.playHorn();

    this.stats.lastStuntName = '📢 BIP-BIP! (SIGNAL CHALINDI)';

    // Visual sound wave sparks in front of headlights
    this.emitSparks(
      new THREE.Vector3(this.playerPos.x, this.playerPos.y + 0.5, this.playerPos.z + 2.5),
      0x38bdf8
    );

    // AI reaction: nearby rivals in front hear horn and yield/swerve to open lane!
    const pZ = this.playerPos.z;
    const pX = this.playerPos.x;
    this.rivalRacers.forEach((rival) => {
      if (rival.pos.z > pZ && rival.pos.z < pZ + 65 && Math.abs(rival.pos.x - pX) < 3.8) {
        rival.targetLaneX = rival.pos.x > pX ? 5.8 : -5.8;
        rival.laneChangeTimer = 3.5;
        this.emitSparks(rival.pos, 0xfacc15);
      }
    });
  }

  // Procedural World Tour Content (Spawns regional landmarks)
  private spawnWorldRoadContent() {
    const z = this.nextSpawnZ;
    this.nextSpawnZ += 28 + Math.random() * 20;

    const laneOptions = [-6.0, -3.8, -1.8, 0, 1.8, 3.8, 6.0];
    const rand = Math.random();

    // 1. REGIONAL LANDMARKS ON THE ROAD & HORIZON
    if (this.currentRegion === 'khorezm') {
      // Ancient Khiva Kalta Minor & Ichan Qala Fortress Gate
      if (Math.random() < 0.26) {
        const minaret = createKhivaKaltaMinor();
        const side = Math.random() > 0.5 ? 1 : -1;
        minaret.position.set(side * (22 + Math.random() * 25), 0, z + 15);
        this.scene.add(minaret);
        this.activeEntities.push({
          type: 'landmark',
          group: minaret,
          hitboxRadius: 0,
          hitboxHeight: 0,
          z: z + 15,
          x: minaret.position.x,
          active: false,
        });
      }

      if (Math.random() < 0.22) {
        const fortressGate = createIchanQalaGate();
        fortressGate.position.set(0, 0, z + 20);
        this.scene.add(fortressGate);
        this.activeEntities.push({
          type: 'arch',
          group: fortressGate,
          hitboxRadius: 0,
          hitboxHeight: 0,
          z: z + 20,
          x: 0,
          active: false,
        });
      }

      if (Math.random() < 0.16) {
        const sign = createHighwayGantrySign('XORAZM VILOYATI', 'XIVA ICHAN QAL‘A ➔');
        sign.position.set(0, 0, z + 10);
        this.scene.add(sign);
        this.activeEntities.push({
          type: 'arch',
          group: sign,
          hitboxRadius: 0,
          hitboxHeight: 0,
          z: z + 10,
          x: 0,
          active: false,
        });
      }
    } else if (this.currentRegion === 'm39_highway') {
      // A-380 International Highway linking Tashkent and Khorezm
      if (Math.random() < 0.25) {
        const signText =
          Math.random() > 0.5
            ? 'A-380 XALQARO MAGISTRAL'
            : 'TOSHKENT ➔ BUXORO ➔ XIVA';
        const kmText =
          Math.random() > 0.5
            ? 'URGANCH 450 km • XIVA 480 km'
            : 'TEZLIKNI OSHIRMANG • 100 km/h';
        const sign = createHighwayGantrySign(signText, kmText);
        sign.position.set(0, 0, z + 12);
        this.scene.add(sign);
        this.activeEntities.push({
          type: 'arch',
          group: sign,
          hitboxRadius: 0,
          hitboxHeight: 0,
          z: z + 12,
          x: 0,
          active: false,
        });
      }

      // Highway street light poles on shoulder
      const leftLight = createStreetLightPole();
      leftLight.position.set(-11, 0, z);
      this.scene.add(leftLight);
      this.activeEntities.push({
        type: 'landmark',
        group: leftLight,
        hitboxRadius: 0,
        hitboxHeight: 0,
        z,
        x: -11,
        active: false,
      });

      const rightLight = createStreetLightPole();
      rightLight.position.set(11, 0, z);
      rightLight.rotation.y = Math.PI;
      this.scene.add(rightLight);
      this.activeEntities.push({
        type: 'landmark',
        group: rightLight,
        hitboxRadius: 0,
        hitboxHeight: 0,
        z,
        x: 11,
        active: false,
      });
    } else if (this.currentRegion === 'samarkand') {
      // Samarkand Registan Silk Road
      if (Math.random() < 0.22) {
        const arch = createIchanQalaGate();
        arch.position.set(0, 0, z + 18);
        this.scene.add(arch);
        this.activeEntities.push({
          type: 'arch',
          group: arch,
          hitboxRadius: 0,
          hitboxHeight: 0,
          z: z + 18,
          x: 0,
          active: false,
        });
      }

      if (Math.random() < 0.16) {
        const sign = createHighwayGantrySign('SAMARQAND VILOYATI', 'REGISTON MAYDONI ➔');
        sign.position.set(0, 0, z + 10);
        this.scene.add(sign);
        this.activeEntities.push({
          type: 'arch',
          group: sign,
          hitboxRadius: 0,
          hitboxHeight: 0,
          z: z + 10,
          x: 0,
          active: false,
        });
      }
    } else {
      // Tashkent: TV Tower, Modern Tashkent City Skyscrapers, Avenue Signs & Street Lights
      if (Math.random() < 0.18) {
        const tvTower = createTashkentTVTower();
        const side = Math.random() > 0.5 ? 1 : -1;
        tvTower.position.set(side * (52 + Math.random() * 40), 0, z + 35);
        this.scene.add(tvTower);
        this.activeEntities.push({
          type: 'landmark',
          group: tvTower,
          hitboxRadius: 0,
          hitboxHeight: 0,
          z: z + 35,
          x: tvTower.position.x,
          active: false,
        });
      }

      // Modern Tashkent City skyscrapers
      if (Math.random() < 0.45) {
        const height = 45 + Math.random() * 85;
        const width = 8 + Math.random() * 12;
        const spire = createCitySpire(height, width);
        const side = Math.random() > 0.5 ? 1 : -1;
        spire.position.set(side * (28 + Math.random() * 50), 0, z);
        this.scene.add(spire);
        this.activeEntities.push({
          type: 'landmark',
          group: spire,
          hitboxRadius: 0,
          hitboxHeight: 0,
          z,
          x: spire.position.x,
          active: false,
        });
      }

      // Overhead street signs
      if (Math.random() < 0.18) {
        const signText =
          Math.random() > 0.5
            ? 'TOSHKENT SHAHRI'
            : 'TASHKENT CITY XALQARO MARKAZI';
        const subText =
          Math.random() > 0.5
            ? 'AMIR TEMUR SHOH KO‘CHASI'
            : 'ISLOM KARIMOV KO‘CHASI';
        const sign = createHighwayGantrySign(signText, subText);
        sign.position.set(0, 0, z + 12);
        this.scene.add(sign);
        this.activeEntities.push({
          type: 'arch',
          group: sign,
          hitboxRadius: 0,
          hitboxHeight: 0,
          z: z + 12,
          x: 0,
          active: false,
        });
      }

      // Street light poles
      const light = createStreetLightPole();
      const side = Math.random() > 0.5 ? 1 : -1;
      light.position.set(side * 11, 0, z);
      if (side > 0) light.rotation.y = Math.PI;
      this.scene.add(light);
      this.activeEntities.push({
        type: 'landmark',
        group: light,
        hitboxRadius: 0,
        hitboxHeight: 0,
        z,
        x: side * 11,
        active: false,
      });
    }

    // 2. ROAD RACING COLLECTIBLES & HAZARDS
    if (rand < 0.42) {
      // Crystals stream
      const lane = laneOptions[Math.floor(Math.random() * laneOptions.length)];
      for (let k = 0; k < 3; k++) {
        const crystalGroup = createCrystal();
        crystalGroup.position.set(lane, 0, z + k * 4.5);
        this.scene.add(crystalGroup);
        this.activeEntities.push({
          type: 'crystal',
          group: crystalGroup,
          hitboxRadius: 1.2,
          hitboxHeight: 1.4,
          z: z + k * 4.5,
          x: lane,
          active: true,
        });
      }
    } else if (rand < 0.58) {
      // Laser Barrier
      const { group } = createLaserBarrier();
      const lane = laneOptions[Math.floor(Math.random() * laneOptions.length)];
      group.position.set(lane, 0, z);
      this.scene.add(group);
      this.activeEntities.push({
        type: 'laser',
        group,
        hitboxRadius: 2.8,
        hitboxHeight: 2.0,
        z,
        x: lane,
        active: true,
      });
    } else if (rand < 0.76) {
      // Drone Traffic Hazard
      const lane = laneOptions[Math.floor(Math.random() * laneOptions.length)];
      const drone = createDroneHazard();
      drone.position.set(lane, 0, z);
      this.scene.add(drone);
      this.activeEntities.push({
        type: 'drone',
        group: drone,
        hitboxRadius: 1.2,
        hitboxHeight: 1.8,
        z,
        x: lane,
        active: true,
      });
    } else if (rand < 0.88) {
      // Speed Boost Pad
      const pad = createBoostPadMesh(this.boostPadTexture);
      const lane = laneOptions[Math.floor(Math.random() * laneOptions.length)];
      pad.position.set(lane, 0.03, z);
      this.scene.add(pad);
      this.activeEntities.push({
        type: 'boost_pad',
        group: pad,
        hitboxRadius: 1.8,
        hitboxHeight: 0.5,
        z,
        x: lane,
        active: true,
      });
    } else if (rand < 0.95) {
      // Mega Jump Ramp
      const ramp = createJumpRamp();
      const lane = laneOptions[Math.floor(Math.random() * laneOptions.length)];
      ramp.position.set(lane, 0, z);
      this.scene.add(ramp);
      this.activeEntities.push({
        type: 'ramp',
        group: ramp,
        hitboxRadius: 1.6,
        hitboxHeight: 1.2,
        z,
        x: lane,
        active: true,
      });

      const airCrystal = createCrystal();
      airCrystal.position.set(lane, 3.2, z + 8);
      this.scene.add(airCrystal);
      this.activeEntities.push({
        type: 'crystal',
        group: airCrystal,
        hitboxRadius: 1.2,
        hitboxHeight: 1.5,
        z: z + 8,
        x: lane,
        active: true,
      });
    } else {
      // Shield Health Pickup
      const shield = createShieldPickup();
      const lane = laneOptions[Math.floor(Math.random() * laneOptions.length)];
      shield.position.set(lane, 0, z);
      this.scene.add(shield);
      this.activeEntities.push({
        type: 'shield',
        group: shield,
        hitboxRadius: 1.2,
        hitboxHeight: 1.5,
        z,
        x: lane,
        active: true,
      });
    }
  }

  // Toggle Headlights (Faralarni yoqish / o'chirish)
  public toggleHeadlights() {
    soundEngine.userGesture();
    this.headlightsOn = !this.headlightsOn;
    this.stats.headlightsOn = this.headlightsOn;
    this.applyHeadlightsVisual();
    soundEngine.playDoorToggle();
    this.stats.lastStuntName = this.headlightsOn
      ? '💡 FARALAR YOQILDI!'
      : '🌑 FARALAR O‘CHIRILDI';
  }

  // Toggle flashing roof Migalka + dual-tone Police Sirena
  public toggleMigalkaAndSiren() {
    soundEngine.userGesture();
    this.migalkaActive = !this.migalkaActive;
    this.sirenActive = this.migalkaActive;
    this.stats.migalkaActive = this.migalkaActive;
    this.stats.sirenActive = this.sirenActive;

    if (this.playerParts?.migalkaGroup) {
      this.playerParts.migalkaGroup.visible = this.migalkaActive;
    }
    soundEngine.setSiren(this.sirenActive);
    this.stats.lastStuntName = this.migalkaActive
      ? '🚨 MIGALKA VA SIRENA YOQILDI!'
      : '🔕 MIGALKA VA SIRENA O‘CHIRILDI';
  }

  // Exit or Enter the car anytime (moshinadan tushish / minish)
  public toggleExitEnterCar() {
    if (!this.isRunning || this.isGameOver || !this.pedestrian) return;
    soundEngine.userGesture();

    if (!this.isOnFoot) {
      // Step out on the left-hand driver side (+X in car local frame)
      this.currentSpeed = 0;
      const sinH = Math.sin(this.playerHeading);
      const cosH = Math.cos(this.playerHeading);
      // Left side of car when facing (+sinH, 0, +cosH): (+cosH, 0, -sinH)
      const sideOffset = 1.65;
      this.pedestrianPos.set(
        this.playerPos.x + cosH * sideOffset,
        0,
        this.playerPos.z - sinH * sideOffset
      );
      this.pedestrianHeading = this.playerHeading;
      this.pedestrianVelocityY = 0;
      this.pedestrianGrounded = true;
      this.pedestrian.group.position.copy(this.pedestrianPos);
      this.pedestrian.group.rotation.y = this.pedestrianHeading;
      this.pedestrian.group.visible = true;

      if (this.playerParts?.driverGroup) {
        this.playerParts.driverGroup.visible = false;
      }

      this.isOnFoot = true;
      this.stats.isOnFoot = true;
      this.stats.speed = 0;
      this.stats.gear = 1;
      this.stats.rpm = 0;
      this.stats.nearCar = true;
      soundEngine.stopEngine();
      soundEngine.playDoorToggle();
      this.stats.lastStuntName = '🚶 MOSHINADAN TUSHDINGIZ • CHOYXONA / BOG‘GA KIRING';
    } else {
      // Check proximity to parked car
      const distToCar = Math.hypot(
        this.pedestrianPos.x - this.playerPos.x,
        this.pedestrianPos.z - this.playerPos.z
      );
      if (distToCar > 6.5) {
        this.stats.lastStuntName = '⚠️ MOSHINANGIZ UZOQDA! YAQINROQ KELING';
        return;
      }

      this.pedestrian.group.visible = false;
      if (this.playerParts?.driverGroup) {
        this.playerParts.driverGroup.visible = true;
      }
      this.isOnFoot = false;
      this.stats.isOnFoot = false;
      this.stats.nearCar = true;
      soundEngine.playDoorToggle();
      this.stats.lastStuntName = '🚘 MOSHINAGA O‘TIRDINGIZ • GAZNI BOSING!';
    }
  }

  // Interact with nearby Choyxona / Dam olish Park / Zapravka
  public interactNearbyPoi() {
    if (!this.isRunning || this.isGameOver) return;
    soundEngine.userGesture();

    if (this.stats.nearbyPoi === 'none') {
      return;
    }

    if (this.stats.nearbyPoi === 'choyxona') {
      this.stats.hunger = 100;
      this.stats.energy = Math.min(100, this.stats.energy + 45);
      this.stats.score += 500;
      this.stats.lastStuntName = '🥣 MILLIY CHOYXONA: OSH YEDINGIZ! QUVVAT 100%';
      soundEngine.playEatOrRest();
      this.emitSparks(this.isOnFoot ? this.pedestrianPos : this.playerPos, 0xf59e0b);
    } else if (this.stats.nearbyPoi === 'rest_park') {
      this.stats.energy = 100;
      this.stats.shields = this.stats.maxShields;
      this.stats.score += 400;
      this.stats.lastStuntName = '🌳 DAM OLISH BOG‘I: KUCH VA QALQON TIKLANDI!';
      soundEngine.playEatOrRest();
      this.emitSparks(this.isOnFoot ? this.pedestrianPos : this.playerPos, 0x10b981);
    } else if (this.stats.nearbyPoi === 'fuel') {
      this.stats.nitro = 100;
      this.stats.score += 250;
      this.stats.lastStuntName = '⛽ ZAPRAVKA: NITRO VA BAK 100% TO‘LDI!';
      soundEngine.playEatOrRest();
      this.emitSparks(this.isOnFoot ? this.pedestrianPos : this.playerPos, 0x06b6d4);
    }
  }

  private animateFlashingBeacons(timeSec: number) {
    const redOn = Math.floor(timeSec * 9) % 2 === 0;

    if (this.playerParts?.migalkaRed && this.playerParts?.migalkaBlue) {
      this.playerParts.migalkaRed.visible = this.migalkaActive && redOn;
      this.playerParts.migalkaBlue.visible = this.migalkaActive && !redOn;
    }

    for (const gai of this.gaiPatrols) {
      if (gai.parts.migalkaRed && gai.parts.migalkaBlue) {
        gai.parts.migalkaRed.visible = redOn;
        gai.parts.migalkaBlue.visible = !redOn;
      }
    }

    for (const pair of this.gaiBeaconPairs) {
      pair.red.visible = redOn;
      pair.blue.visible = !redOn;
    }
  }

  private updateNearbyPoiStatus(actorPos: THREE.Vector3) {
    if (this.mode !== 'open_world') {
      this.stats.nearbyPoi = 'none';
      this.stats.nearbyPoiLabel = '';
      return;
    }

    let found: WorldPoi | null = null;
    let minDist = Infinity;
    for (const poi of this.openWorldPois) {
      if (poi.type === 'gai_post') continue;
      const d = Math.hypot(poi.x - actorPos.x, poi.z - actorPos.z);
      if (d <= poi.radius && d < minDist) {
        minDist = d;
        found = poi;
      }
    }

    if (found) {
      this.stats.nearbyPoi = found.type;
      this.stats.nearbyPoiLabel = found.name;

      // Auto-trigger eat/rest cleanly if walking directly inside inner circle on foot
      if (
        this.isOnFoot &&
        minDist < 4.8 &&
        this.poiTriggerCooldown <= 0 &&
        this.lastAutoPoiId !== found.id
      ) {
        this.lastAutoPoiId = found.id;
        this.poiTriggerCooldown = 6;
        this.interactNearbyPoi();
      }
    } else {
      this.stats.nearbyPoi = 'none';
      this.stats.nearbyPoiLabel = '';
      this.lastAutoPoiId = '';
    }
  }

  private updateGaiPatrols(delta: number, speedKmh: number) {
    if (this.gaiGraceCooldown > 0) this.gaiGraceCooldown -= delta;

    const pX = this.playerPos.x;
    const pZ = this.playerPos.z;
    let anyChasing = false;

    // Check speed radar near GAI patrol cars & GAI posts
    const nearGaiPost =
      this.mode === 'open_world' &&
      this.openWorldPois.some(
        (p) => p.type === 'gai_post' && Math.hypot(p.x - pX, p.z - pZ) < 42
      );

    for (const gai of this.gaiPatrols) {
      const distToPlayer = Math.hypot(gai.pos.x - pX, gai.pos.z - pZ);

      // Speeding (>140 km/h) near YPX patrol or post triggers pursuit!
      if (
        !this.isOnFoot &&
        !this.migalkaActive &&
        this.gaiGraceCooldown <= 0 &&
        speedKmh > 140 &&
        (distToPlayer < 68 || nearGaiPost)
      ) {
        if (!gai.chasing) {
          gai.chasing = true;
          this.stats.gaiAlert = 2;
          this.stats.lastStuntName = '🚓 YPX / GAI QUVMOQDA! TORMOZ BOSIB TO‘XTANG!';
          soundEngine.playGaiWhistle();
        }
      }

      if (gai.chasing) {
        anyChasing = true;
        // Chase player car cleanly
        const dx = pX - gai.pos.x;
        const dz = pZ - gai.pos.z;
        const targetHeading = Math.atan2(dx, dz);
        let diff = targetHeading - gai.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        gai.heading += THREE.MathUtils.clamp(diff, -delta * 2.5, delta * 2.5);

        const targetSpeed = Math.max(24, Math.abs(this.currentSpeed) + 8);
        gai.speed = THREE.MathUtils.damp(gai.speed, targetSpeed, 3, delta);
        gai.pos.x += Math.sin(gai.heading) * gai.speed * delta;
        gai.pos.z += Math.cos(gai.heading) * gai.speed * delta;

        // If player brakes & pulls over (< 8 km/h) while GAI is close -> issue fine & clear chase
        if (speedKmh < 8 && distToPlayer < 26) {
          gai.chasing = false;
          this.stats.gaiAlert = 0;
          this.stats.gaiFines += 1;
          this.stats.score = Math.max(0, this.stats.score - 250);
          this.gaiGraceCooldown = 10;
          this.stats.lastStuntName = '👮‍♂️ GAI JARIMA YOZDI (-250 BALL) • TEZLIKNI OSHIRMANG!';
        } else if (distToPlayer > 220) {
          // Escaped GAI!
          gai.chasing = false;
          this.stats.gaiAlert = 0;
          this.stats.score += 350;
          this.stats.lastStuntName = '🏁 YPX DAN QOCHIB QUTULDINGIZ! (+350)';
        }
      } else {
        // Peaceful YPX highway patrol loop
        if (this.mode === 'open_world') {
          if (gai.patrolAxis === 'z') {
            gai.pos.z += gai.patrolDir * gai.speed * delta;
            if (gai.pos.z > 460 || gai.pos.z < -460) {
              gai.patrolDir *= -1;
            }
            gai.heading = gai.patrolDir > 0 ? 0 : Math.PI;
          } else {
            gai.pos.x += gai.patrolDir * gai.speed * delta;
            if (gai.pos.x > 460 || gai.pos.x < -460) {
              gai.patrolDir *= -1;
            }
            gai.heading = gai.patrolDir > 0 ? Math.PI / 2 : -Math.PI / 2;
          }
        } else {
          // World Tour highway patrol cruise
          gai.pos.z += 38 * delta;
          if (gai.pos.z < pZ - 45) {
            gai.pos.z = pZ + 120 + Math.random() * 60;
          } else if (gai.pos.z > pZ + 220) {
            gai.pos.z = pZ + 90;
          }
          gai.heading = 0;
        }
      }

      gai.parts.group.position.copy(gai.pos);
      gai.parts.group.rotation.y = gai.heading;

      const wheelCirc = 2 * Math.PI * 0.35;
      gai.parts.wheels.forEach((w) => {
        w.rotation.x -= (gai.speed / wheelCirc) * Math.PI * 2 * delta;
      });
    }

    if (!anyChasing && this.stats.gaiAlert > 0) {
      this.stats.gaiAlert = 0;
    }

    soundEngine.setSiren(this.sirenActive || anyChasing);
  }

  public update(delta: number) {
    const time = this.clock.getElapsedTime();
    this.animateFlashingBeacons(time);

    if (!this.isRunning || this.isGameOver) {
      const isCar = this.playerParts?.isCar ?? true;
      if (!isCar) {
        this.playerGroup.position.y = 0.45 + Math.sin(time * 3) * 0.05;
      }
      this.playerGroup.rotation.y = Math.sin(time * 1.5) * 0.05;
      this.render();
      return;
    }

    if (this.poiTriggerCooldown > 0) this.poiTriggerCooldown -= delta;

    const cfg = VEHICLES[this.shipModel];
    const isCar = this.playerParts?.isCar ?? true;

    // 1. World Region Progression (World Tour vs Open World District Names)
    if (this.mode === 'world_tour') {
      const regionsList: WorldRegionId[] = ['tashkent', 'm39_highway', 'khorezm', 'samarkand'];
      const regionIndex = Math.floor(this.forwardDistance / 900) % regionsList.length;
      const expectedRegion = regionsList[regionIndex];
      const progressInRegion = Math.round(((this.forwardDistance % 900) / 900) * 100);

      if (expectedRegion !== this.currentRegion) {
        this.currentRegion = expectedRegion;
        this.applyRegionAtmosphere(expectedRegion);
        if (this.onRegionChange) {
          this.onRegionChange(expectedRegion);
        }
      }

      this.stats.currentRegion = this.currentRegion;
      this.stats.regionName = WORLD_REGIONS[this.currentRegion].name.uz;
      this.stats.regionProgress = progressInRegion;
    } else {
      // Open World dynamic city detection based on closest Uzbekistan city hub
      let nearestRegion: WorldRegionId = 'tashkent';
      let nearestDist = Infinity;
      (Object.keys(CITY_SPAWN_COORDS) as WorldRegionId[]).forEach((rid) => {
        const c = CITY_SPAWN_COORDS[rid];
        const d = Math.hypot(this.playerPos.x - c.x, this.playerPos.z - c.z);
        if (d < nearestDist) {
          nearestDist = d;
          nearestRegion = rid;
        }
      });

      if (nearestRegion !== this.currentRegion) {
        this.currentRegion = nearestRegion;
        this.applyRegionAtmosphere(nearestRegion);
        if (this.onRegionChange) {
          this.onRegionChange(nearestRegion);
        }
      }
      this.stats.currentRegion = nearestRegion;
      this.stats.regionName = WORLD_REGIONS[nearestRegion].name.uz;
      this.stats.regionProgress = Math.min(100, Math.round((Math.hypot(this.playerPos.x, this.playerPos.z) / 520) * 100));
    }

    // Smooth lerp fog and background towards regional atmosphere
    if (this.scene.fog) {
      (this.scene.fog as THREE.FogExp2).color.lerp(this.targetFogColor, delta * 1.5);
    }
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.lerp(this.targetSkyColor, delta * 1.5);
    }

    // Gradual Hunger & Energy consumption
    this.stats.hunger = Math.max(0, this.stats.hunger - delta * (this.isOnFoot ? 0.55 : 0.35));
    this.stats.energy = Math.max(0, this.stats.energy - delta * (this.isOnFoot ? 0.45 : 0.25));

    // ==================================================
    // ON-FOOT PEDESTRIAN WALKING MODE
    // ==================================================
    if (this.isOnFoot && this.pedestrian) {
      this.pedestrianHeading -= this.input.steer * delta * 2.8;
      const moveInput = this.input.throttle; // +1 forward, -1 backward, 0 stop
      const walkSpeed = (this.input.boost ? 11.5 : 6.5) * (this.stats.energy < 15 ? 0.7 : 1);

      if (Math.abs(moveInput) > 0.1) {
        const v = moveInput * walkSpeed;
        this.pedestrianPos.x += Math.sin(this.pedestrianHeading) * v * delta;
        this.pedestrianPos.z += Math.cos(this.pedestrianHeading) * v * delta;
        this.pedestrianWalkCycle += delta * (this.input.boost ? 14 : 9);

        const swing = Math.sin(this.pedestrianWalkCycle) * 0.65;
        this.pedestrian.leftLeg.rotation.x = swing;
        this.pedestrian.rightLeg.rotation.x = -swing;
        this.pedestrian.leftArm.rotation.x = -swing * 0.7;
        this.pedestrian.rightArm.rotation.x = swing * 0.7;
      } else {
        this.pedestrian.leftLeg.rotation.x = THREE.MathUtils.damp(this.pedestrian.leftLeg.rotation.x, 0, 10, delta);
        this.pedestrian.rightLeg.rotation.x = THREE.MathUtils.damp(this.pedestrian.rightLeg.rotation.x, 0, 10, delta);
        this.pedestrian.leftArm.rotation.x = THREE.MathUtils.damp(this.pedestrian.leftArm.rotation.x, 0, 10, delta);
        this.pedestrian.rightArm.rotation.x = THREE.MathUtils.damp(this.pedestrian.rightArm.rotation.x, 0, 10, delta);
      }

      if (this.input.jump && this.pedestrianGrounded) {
        this.pedestrianVelocityY = 7.5;
        this.pedestrianGrounded = false;
      }
      if (!this.pedestrianGrounded) {
        this.pedestrianVelocityY -= 22 * delta;
        this.pedestrianPos.y += this.pedestrianVelocityY * delta;
        if (this.pedestrianPos.y <= 0) {
          this.pedestrianPos.y = 0;
          this.pedestrianVelocityY = 0;
          this.pedestrianGrounded = true;
        }
      }

      if (this.mode === 'open_world') {
        this.pedestrianPos.x = Math.max(-720, Math.min(720, this.pedestrianPos.x));
        this.pedestrianPos.z = Math.max(-720, Math.min(720, this.pedestrianPos.z));
      } else {
        this.pedestrianPos.x = Math.max(-9, Math.min(9, this.pedestrianPos.x));
      }

      this.pedestrian.group.position.copy(this.pedestrianPos);
      this.pedestrian.group.rotation.y = this.pedestrianHeading;

      const distToCar = Math.hypot(
        this.pedestrianPos.x - this.playerPos.x,
        this.pedestrianPos.z - this.playerPos.z
      );
      this.stats.nearCar = distToCar <= 6.5;
      this.stats.speed = Math.round(Math.abs(moveInput) * walkSpeed * 3.2);
      this.stats.worldX = Math.round(this.pedestrianPos.x);
      this.stats.worldZ = Math.round(this.pedestrianPos.z);

      this.updateNearbyPoiStatus(this.pedestrianPos);
      this.updateGaiPatrols(delta, 0);
      this.updateParticles(delta);
      this.updateCamera(delta, false);

      if (this.onStatsUpdate) {
        this.onStatsUpdate({ ...this.stats });
      }
      this.render();
      return;
    }

    // ==================================================
    // 2. MANUAL GAZ & TORMOZ VEHICLE PHYSICS
    // ==================================================
    const isBoosting =
      this.input.boost &&
      this.stats.nitro > 5 &&
      this.input.throttle >= 0;

    const tireFatigueFactor = this.stats.hunger < 10 || this.stats.energy < 10 ? 0.78 : 1.0;
    const maxForwardUnits = (cfg.topSpeed / 2.8) * tireFatigueFactor;
    const maxNitroUnits = (cfg.topSpeed * 0.42) * tireFatigueFactor;

    if (isBoosting) {
      this.stats.nitro = Math.max(0, this.stats.nitro - delta * 26);
      this.stats.isNitroActive = true;
      const nowMs = performance.now();
      if (nowMs - this.lastBoostSoundMs > 450) {
        this.lastBoostSoundMs = nowMs;
        soundEngine.playBoost();
      }
    } else {
      this.stats.isNitroActive = false;
      this.stats.nitro = Math.min(100, this.stats.nitro + delta * 8);
    }

    const accelPower = (18 + cfg.acceleration * 4.2) * tireFatigueFactor;

    if (isBoosting) {
      // Nitro surges forward rapidly
      this.currentSpeed = THREE.MathUtils.damp(this.currentSpeed, maxNitroUnits, 3.2, delta);
    } else if (this.input.throttle > 0.1) {
      // GAZ pressed: smoothly accelerate toward vehicle top speed
      const targetFwd = maxForwardUnits * Math.min(1, this.input.throttle);
      if (this.currentSpeed < targetFwd) {
        this.currentSpeed = Math.min(targetFwd, this.currentSpeed + accelPower * delta);
      } else {
        this.currentSpeed = THREE.MathUtils.damp(this.currentSpeed, targetFwd, 2.5, delta);
      }
    } else if (this.input.throttle < -0.1) {
      // TORMOZ pressed: firm braking down to 0, then reverse if still held
      if (this.currentSpeed > 0.8) {
        this.currentSpeed = Math.max(0, this.currentSpeed - 64 * delta);
      } else {
        const targetRev = -18; // ~50 km/h reverse
        this.currentSpeed = Math.max(targetRev, this.currentSpeed - 22 * delta);
      }
    } else {
      // Neutral coasting: engine braking gently brings vehicle to a complete stop
      if (Math.abs(this.currentSpeed) < 0.25) {
        this.currentSpeed = 0;
      } else {
        const drag = this.currentSpeed > 0 ? 11.5 : 14;
        const sign = Math.sign(this.currentSpeed);
        this.currentSpeed -= sign * drag * delta;
        if (Math.sign(this.currentSpeed) !== sign) this.currentSpeed = 0;
      }
    }

    const speedKmh = Math.round(Math.abs(this.currentSpeed) * 2.8);
    this.stats.speed = speedKmh;
    if (speedKmh > this.stats.maxSpeedReached) {
      this.stats.maxSpeedReached = speedKmh;
    }

    const isDrifting =
      this.input.drift || (Math.abs(this.input.steer) > 0.7 && speedKmh > 100);

    soundEngine.updateEngine(speedKmh, isBoosting, isDrifting, this.input.throttle);
    this.stats.gear = this.currentSpeed < -0.5 ? -1 : soundEngine.getGear();
    this.stats.rpm = soundEngine.getRpm();

    // 3. Lateral Car Steering & Open World Roaming
    // Steer turns car realistically only proportional to speed (or small turn factor when moving slowly)
    const moveScale = Math.min(1, Math.max(0.25, Math.abs(this.currentSpeed) / 14));
    const steerSign = this.currentSpeed < -0.5 ? -1 : 1; // Reverse steering direction when backing up
    const steerSpeed = cfg.handling * (isDrifting ? 13 : 9.0) * moveScale;

    if (this.mode === 'open_world') {
      if (Math.abs(this.currentSpeed) > 0.1) {
        this.playerHeading -= this.input.steer * steerSign * delta * 2.35 * moveScale;
      }
      this.playerPos.x += Math.sin(this.playerHeading) * this.currentSpeed * delta;
      this.playerPos.z += Math.cos(this.playerHeading) * this.currentSpeed * delta;
      this.playerGroup.rotation.y = this.playerHeading;

      // Bound within massive 1500m x 1500m open city
      this.playerPos.x = Math.max(-720, Math.min(720, this.playerPos.x));
      this.playerPos.z = Math.max(-720, Math.min(720, this.playerPos.z));
    } else {
      if (Math.abs(this.currentSpeed) > 0.1) {
        this.playerPos.x -= this.input.steer * steerSpeed * delta;
      }
      const maxBound = (this.trackWidth - 2.5) / 2;
      if (this.playerPos.x > maxBound) this.playerPos.x = maxBound;
      if (this.playerPos.x < -maxBound) this.playerPos.x = -maxBound;

      const targetYaw =
        Math.abs(this.currentSpeed) > 0.3
          ? -this.input.steer * (isDrifting ? 0.36 : 0.24)
          : 0;
      this.playerYaw = THREE.MathUtils.damp(this.playerYaw, targetYaw, 12, delta);
      this.playerGroup.rotation.y = this.playerYaw;

      const targetRoll =
        Math.abs(this.currentSpeed) > 2
          ? this.input.steer * (isDrifting ? 0.28 : 0.12)
          : 0;
      this.playerRoll = THREE.MathUtils.damp(this.playerRoll, targetRoll, 10, delta);
      this.playerGroup.rotation.z = this.playerRoll;
    }

    if (this.input.horn) {
      this.triggerHorn();
    }

    // 4. Suspension & Jump Physics
    const baseHeight = isCar ? 0.02 : 0.45;
    if (this.input.jump && this.isGrounded) {
      this.playerVelocityY = 12.5;
      this.isGrounded = false;
      soundEngine.playJump();
    }

    if (!this.isGrounded) {
      this.airTime += delta;
      this.playerVelocityY -= 32 * delta;
      this.playerPos.y += this.playerVelocityY * delta;

      if (this.playerPos.y <= baseHeight) {
        this.playerPos.y = baseHeight;
        this.playerVelocityY = 0;
        this.isGrounded = true;

        if (this.airTime > 0.6) {
          const airPoints = Math.round(this.airTime * 250);
          this.stats.stuntScore += airPoints;
          this.stats.score += airPoints;
          this.stats.lastStuntName = 'DUNYOVIY SAKRASH (WORLD AIR)';
        }
        this.airTime = 0;
      }
    } else {
      if (isCar) {
        this.playerPos.y =
          baseHeight + (speedKmh > 5 ? (Math.random() - 0.5) * 0.004 : 0);
      } else {
        const hoverOsc = Math.sin(this.forwardDistance * 0.15) * 0.06;
        this.playerPos.y = baseHeight + hoverOsc;
      }
    }

    const targetPitch = !this.isGrounded
      ? this.playerVelocityY * 0.03
      : isBoosting
      ? -0.05
      : this.input.throttle < -0.1 && this.currentSpeed > 2
      ? 0.045
      : 0;
    this.playerPitch = THREE.MathUtils.damp(this.playerPitch, targetPitch, 8, delta);
    this.playerGroup.rotation.x = this.playerPitch;

    this.playerGroup.position.copy(this.playerPos);

    // 5. 3D Wheels Spinning, Front Steering & Interior Steering Wheel
    if (this.playerParts && this.playerParts.isCar) {
      const wheelCircumference = 2 * Math.PI * 0.36;
      const wheelRotSpeed = (this.currentSpeed / wheelCircumference) * Math.PI * 2;
      this.wheelRotationAngle -= wheelRotSpeed * delta;

      this.playerParts.wheels.forEach((w) => {
        w.rotation.x = this.wheelRotationAngle;
      });

      const frontSteerAngle = -this.input.steer * 0.44;
      this.playerParts.frontSteerPivots.forEach((pivot) => {
        pivot.rotation.y = frontSteerAngle;
      });

      if (this.playerParts.steeringWheel) {
        this.playerParts.steeringWheel.rotation.z = -this.input.steer * 0.78;
      }

      if (this.playerParts.taillightMat) {
        const isBraking = this.input.throttle < -0.1;
        this.playerParts.taillightMat.color.setHex(
          isBraking ? 0xff2244 : this.headlightsOn ? 0xb91c1c : 0x450a0a
        );
      }

      if (isDrifting && this.isGrounded && speedKmh > 40) {
        this.emitTireSmoke(this.playerPos.x - 0.9, this.playerPos.z - 1.4);
        this.emitTireSmoke(this.playerPos.x + 0.9, this.playerPos.z - 1.4);
      }
    }

    // Exhaust flames (only visible when Nitro/Boost is active on cars)
    const flameScale = 1 + (isBoosting ? 1.6 : (speedKmh / 360) * 0.8) + Math.random() * 0.2;
    this.playerParts?.thrusters.forEach((t) => {
      t.visible = isBoosting || !this.playerParts?.isCar;
      t.scale.set(1, flameScale, 1);
    });

    // 6. Advance World Distance
    const forwardStep = Math.abs(this.currentSpeed) * delta;
    this.forwardDistance += forwardStep;
    if (this.mode !== 'open_world') {
      this.playerPos.z += this.currentSpeed * delta;
    }
    this.stats.distance = Math.round(this.forwardDistance);
    this.stats.score += Math.round(forwardStep * this.stats.multiplier * 0.4);
    this.stats.worldX = Math.round(this.playerPos.x);
    this.stats.worldZ = Math.round(this.playerPos.z);
    this.stats.nearCar = true;

    // Track cycling in World Tour
    if (this.mode !== 'open_world') {
      const segmentLength = 120;
      this.trackSegments.forEach((mesh) => {
        if (mesh.position.z < this.playerPos.z - segmentLength) {
          mesh.position.z += segmentLength * this.trackSegments.length;
        }
      });

      if (this.nextSpawnZ < this.playerPos.z + 260) {
        this.spawnWorldRoadContent();
      }
    }

    // Light follows player
    if (this.dirLight) {
      this.dirLight.position.x = this.playerPos.x + 25;
      this.dirLight.position.z = this.playerPos.z + 35;
      this.dirLight.target.position.copy(this.playerPos);
      this.dirLight.target.updateMatrixWorld();
    }

    if (this.worldFloorMesh) {
      this.worldFloorMesh.position.z = this.playerPos.z;
    }

    if (this.speedParticles) {
      this.speedParticles.position.x = this.playerPos.x;
      this.speedParticles.position.z = this.playerPos.z;
    }

    // 7. Check POIs, Collisions & Pickups
    this.updateNearbyPoiStatus(this.playerPos);
    if (this.mode !== 'open_world') {
      this.updateEntitiesAndCollisions(delta);
      this.updateRivalRacers(delta);
    }
    this.updateGaiPatrols(delta, speedKmh);

    // 9. Update Particles
    this.updateParticles(delta);

    // 10. Update Camera
    this.updateCamera(delta, isBoosting);

    if (this.onStatsUpdate) {
      this.onStatsUpdate({ ...this.stats });
    }

    this.render();
  }

  private updateEntitiesAndCollisions(delta: number) {
    const pZ = this.playerPos.z;
    const pX = this.playerPos.x;
    const pY = this.playerPos.y;

    for (let i = this.activeEntities.length - 1; i >= 0; i--) {
      const ent = this.activeEntities[i];

      if (ent.z < pZ - 35) {
        this.scene.remove(ent.group);
        this.activeEntities.splice(i, 1);
        continue;
      }

      if (ent.type === 'crystal' || ent.type === 'shield') {
        ent.group.rotation.y += delta * 2.5;
      } else if (ent.type === 'drone') {
        ent.group.rotation.y += delta * 1.5;
        ent.group.position.y = 1.0 + Math.sin(pZ * 0.1 + ent.x) * 0.4;
      }

      if (!ent.active) continue;

      const dz = Math.abs(ent.z - pZ);
      const dx = Math.abs(ent.x - pX);

      if (dz < ent.hitboxRadius && dx < ent.hitboxRadius) {
        const dy = Math.abs(pY - ent.group.position.y);

        if (ent.type === 'crystal') {
          ent.active = false;
          this.scene.remove(ent.group);
          this.stats.crystals++;
          this.stats.comboCount++;
          if (this.stats.comboCount % 5 === 0 && this.stats.multiplier < 5) {
            this.stats.multiplier++;
          }
          this.stats.score += 100 * this.stats.multiplier;
          soundEngine.playCollectCrystal();
          this.emitSparks(ent.group.position, 0x06b6d4);
        } else if (ent.type === 'shield') {
          ent.active = false;
          this.scene.remove(ent.group);
          if (this.stats.shields < this.stats.maxShields) {
            this.stats.shields++;
          }
          this.stats.score += 250;
          soundEngine.playShieldPickup();
          this.emitSparks(ent.group.position, 0x10b981);
        } else if (ent.type === 'boost_pad') {
          this.stats.nitro = 100;
          this.currentSpeed = VEHICLES[this.shipModel].topSpeed * 0.42;
          soundEngine.playBoost();
          this.emitSparks(ent.group.position, 0x10b981);
        } else if (ent.type === 'ramp') {
          if (dy < 1.6) {
            this.playerVelocityY = 17;
            this.isGrounded = false;
            soundEngine.playJump();
          }
        } else if (ent.type === 'laser' || ent.type === 'drone') {
          if (pY > ent.hitboxHeight + 0.3) {
            this.stats.score += 250;
            this.stats.lastStuntName = 'TO‘SIQ USTIDAN SAKRASH (DODGE)';
          } else {
            // INSTANT DEATH: Bir narsaga tegishi bilanoq moshina portlaydi va o'ladi!
            ent.active = false;
            this.stats.shields = 0;
            this.stats.comboCount = 0;
            this.stats.multiplier = 1;
            this.currentSpeed = 0;

            soundEngine.playCrash();
            this.emitSparks(this.playerPos, 0xff0033);
            this.emitTireSmoke(this.playerPos.x - 0.5, this.playerPos.z);
            this.emitTireSmoke(this.playerPos.x + 0.5, this.playerPos.z);

            // Dramatic crash flip
            this.playerVelocityY = 10;
            this.playerRoll += Math.PI * 0.75;
            this.playerPitch += 0.4;
            this.isGrounded = false;

            this.triggerGameOver();
            return;
          }
        }
      }
    }
  }

  private updateParticles(delta: number) {
    if (this.sparkGeo) {
      for (let i = 0; i < this.sparkCount; i++) {
        if (this.sparkLifetimes[i] > 0) {
          this.sparkLifetimes[i] -= delta;
          this.sparkPositions[i * 3] += this.sparkVelocities[i * 3] * delta;
          this.sparkPositions[i * 3 + 1] += this.sparkVelocities[i * 3 + 1] * delta;
          this.sparkPositions[i * 3 + 2] += this.sparkVelocities[i * 3 + 2] * delta;
          this.sparkVelocities[i * 3 + 1] -= 25 * delta;
        } else {
          this.sparkPositions[i * 3 + 1] = -100;
        }
      }
      const sparkAttr = this.sparkGeo.attributes.position;
      if (sparkAttr) {
        sparkAttr.needsUpdate = true;
      }
    }

    if (this.smokeGeo) {
      for (let i = 0; i < this.smokeCount; i++) {
        if (this.smokeLifetimes[i] > 0) {
          this.smokeLifetimes[i] -= delta;
          this.smokePositions[i * 3 + 1] += 0.8 * delta;
        } else {
          this.smokePositions[i * 3 + 1] = -100;
        }
      }
      const smokeAttr = this.smokeGeo.attributes.position;
      if (smokeAttr) {
        smokeAttr.needsUpdate = true;
      }
    }
  }

  private updateCamera(delta: number, isBoosting: boolean) {
    const focusPos = this.isOnFoot ? this.pedestrianPos : this.playerPos;
    const focusHeading = this.isOnFoot ? this.pedestrianHeading : this.playerHeading;
    const pX = focusPos.x;
    const pY = focusPos.y;
    const pZ = focusPos.z;

    const targetFov = isBoosting ? 78 : 65;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 6, delta);
    this.camera.updateProjectionMatrix();

    if (this.cameraMode === 'chase' || this.isOnFoot) {
      const isOpen = this.mode === 'open_world' || this.isOnFoot;
      const followDist = this.isOnFoot ? 4.4 : 6.4;
      const followHeight = this.isOnFoot ? 2.2 : 2.6;
      const targetCamX = isOpen
        ? pX - Math.sin(focusHeading) * followDist
        : pX * 0.75;
      const targetCamY = pY + followHeight;
      const targetCamZ = isOpen
        ? pZ - Math.cos(focusHeading) * followDist
        : pZ - 5.8;

      this.camera.position.x = THREE.MathUtils.damp(
        this.camera.position.x,
        targetCamX,
        12,
        delta
      );
      this.camera.position.y = THREE.MathUtils.damp(
        this.camera.position.y,
        targetCamY,
        10,
        delta
      );
      this.camera.position.z = THREE.MathUtils.damp(
        this.camera.position.z,
        targetCamZ,
        20,
        delta
      );

      if (isOpen) {
        _v1.set(
          pX + Math.sin(focusHeading) * 8,
          pY + 1.15,
          pZ + Math.cos(focusHeading) * 8
        );
      } else {
        _v1.set(pX * 0.4, pY + 1.1, pZ + 8);
      }
      this.camera.lookAt(_v1);
    } else if (this.cameraMode === 'cockpit') {
      const sinH = this.mode === 'open_world' ? Math.sin(focusHeading) : 0;
      const cosH = this.mode === 'open_world' ? Math.cos(focusHeading) : 1;
      // Left-hand drive seat offset inside cabin
      this.camera.position.set(pX + cosH * 0.34, pY + 1.05, pZ - sinH * 0.34);
      _v1.set(pX + sinH * 25, pY + 1.0, pZ + cosH * 25);
      this.camera.lookAt(_v1);
    } else if (this.cameraMode === 'top_down') {
      this.camera.position.set(pX, pY + 18, pZ - 10);
      _v1.set(pX, pY, pZ + 10);
      this.camera.lookAt(_v1);
    } else {
      this.camera.position.set(pX + 5.5, pY + 2.6, pZ - 3);
      _v1.set(pX, pY + 0.5, pZ + 6);
      this.camera.lookAt(_v1);
    }
  }

  private triggerGameOver() {
    this.isRunning = false;
    this.isGameOver = true;
    if (this.stats.score > this.stats.highScore) {
      this.stats.highScore = this.stats.score;
    }
    soundEngine.stopEngine();
    soundEngine.stopMusic();
    if (this.onGameOver) {
      this.onGameOver({ ...this.stats });
    }
  }

  public setShipModel(model: ShipModel) {
    this.shipModel = model;
    this.setupPlayer();
  }

  public setShipColor(color: ShipColor) {
    this.shipColor = color;
    this.setupPlayer();
  }

  public setCameraMode(mode: CameraMode) {
    this.cameraMode = mode;
  }

  public render() {
    this.renderer.render(this.scene, this.camera);
  }

  public startAnimationLoop() {
    const tick = () => {
      const delta = Math.min(this.clock.getDelta(), 0.1);
      this.update(delta);

      if (isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.animationFrameId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.animationFrameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.animationFrameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.animationFrameId = window.setTimeout(cb, 80);
      }
    };
    this.animationFrameId = window.setTimeout(poll, 5);
  }

  public onWindowResize = () => {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public destroy() {
    cancelAnimationFrame(this.animationFrameId);
    clearTimeout(this.animationFrameId);
    window.removeEventListener('resize', this.onWindowResize);

    soundEngine.dispose();
    this.clearEntities();
    this.rivalRacers.forEach((r) => this.scene.remove(r.parts.group));
    this.rivalRacers = [];
    this.gaiPatrols.forEach((g) => this.scene.remove(g.parts.group));
    this.gaiPatrols = [];
    this.renderer.dispose();

    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
