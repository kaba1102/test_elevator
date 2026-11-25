/**
 * SceneEngine.js
 * -----------------------------------------------------------------------
 * Инкапсулирует всю работу с Three.js: сцену, камеру, рендерер, свет,
 * окружение (IBL) и построение геометрии кабины по конфигурации,
 * выбранной пользователем в React-компоненте.
 *
 * Отвечает за раздел 6 ТЗ «ТРЕБОВАНИЯ К 3D-МОДЕЛЯМ»:
 *   6.1 Отражающие поверхности   — физически корректные материалы
 *                                   (MeshPhysicalMaterial) + IBL-окружение
 *                                   (PMREM/RoomEnvironment), поэтому зеркала,
 *                                   хромированные и полированные элементы
 *                                   получают реалистичные отражения света
 *                                   и окружения, а не плоскую заливку.
 *   6.2 Освещение                — мягкий трёхточечный свет (key/fill/rim)
 *                                   + равномерная IBL-подсветка со всех
 *                                   сторон, мягкие тени (PCFSoftShadowMap),
 *                                   ACES Filmic tone mapping — без резких
 *                                   пересветов и чрезмерных затемнений.
 *   6.3 Качество при зуме         — приближение реализовано только сменой
 *                                   позиции камеры (dolly), а не масштабом
 *                                   геометрии или CSS-трансформацией canvas;
 *                                   devicePixelRatio учитывается при resize,
 *                                   поэтому пикселизация/размытие при
 *                                   приближении отсутствуют.
 *   6.4 Детализация                — анизотропная фильтрация текстур
 *                                   (используется, как только в каталог
 *                                   подставляются реальные карты материалов),
 *                                   повышенная сегментация геометрии там,
 *                                   где есть скругления (зеркало, поручень,
 *                                   купольная камера).
 *
 * Управление памятью выполняется согласно общим требованиям п. 2.8 ТЗ:
 * при перестроении кабины и при destroy() все geometries/materials/textures
 * получают .dispose(), объекты удаляются со сцены.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { getHandrailLayout } from './handrailLayout';

const MM_TO_M = 0.001;
const WALL_THICKNESS = 0.06;
const SLAB_THICKNESS = 0.06;

export default class SceneEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.loadedTextures = new Set();
    this._animationHandle = null;
    this._resizeObserver = null;
    this.cabinGroup = null;

    this._initRenderer();
    this._initSceneAndCamera();
    this._initEnvironment();
    this._initLights();
    this._initControls();
    this._bindResize();
    this._animate = this._animate.bind(this);
    this._animationHandle = requestAnimationFrame(this._animate);
  }

  // ------------------------------------------------------------------
  // Инициализация
  // ------------------------------------------------------------------

  _initRenderer() {
    const renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    // 6.3: при зуме (изменении масштаба) canvas не растягивается через CSS —
    // разрешение рендера всегда пересчитывается под devicePixelRatio, что
    // исключает пикселизацию/размытие изображения.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 6.2: мягкие тени
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // без пересветов
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer = renderer;
    this.maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
  }

  _initSceneAndCamera() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xeef1f4);

    const parent = this.canvas.parentElement;
    const width = parent?.clientWidth || 1;
    const height = parent?.clientHeight || 1;

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.05, 50);
    this.camera.position.set(2.4, 1.7, 2.6);
    this.renderer.setSize(width, height, false);
  }

  _initEnvironment() {
    // 6.1 / 6.2: PMREM-окружение даёт физически корректные отражения на
    // зеркальных/полированных/металлических поверхностях и мягкую
    // равномерную фоновую подсветку сцены со всех сторон.
    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.pmremGenerator.compileEquirectangularShader();
    const envTexture = this.pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = envTexture;
    this.environmentTexture = envTexture;
  }

  _initLights() {
    // Трёхточечная схема освещения: key (основной, с тенью) + fill
    // (заполняющий, без резких теней) + hemisphere (равномерная подсветка
    // сверху/снизу) — исключает чрезмерные затемнения и пересветы (6.2).
    const key = new THREE.DirectionalLight(0xffffff, 1.35);
    key.position.set(2.2, 3.2, 1.6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.radius = 6; // мягкий край тени
    key.shadow.bias = -0.0003;
    key.shadow.camera.near = 0.1;
    key.shadow.camera.far = 12;
    key.shadow.camera.left = -3;
    key.shadow.camera.right = 3;
    key.shadow.camera.top = 3;
    key.shadow.camera.bottom = -3;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xffffff, 0.45);
    fill.position.set(-2.4, 1.6, -1.8);
    this.scene.add(fill);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x8a8f9a, 0.55);
    this.scene.add(hemi);

    this.lights = { key, fill, hemi };
  }

  _initControls() {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    // Зум ограничен разумными пределами, чтобы камера не проходила сквозь
    // геометрию и не улетала за пределы кабины — качество изображения при
    // этом не зависит от дистанции (см. 6.3 в комментарии наверху файла).
    controls.minDistance = 0.35;
    controls.maxDistance = 8;
    controls.target.set(0, 1, 0);
    controls.update();
    this.controls = controls;
  }

  _bindResize() {
    this._resizeObserver = new ResizeObserver(() => this.resize());
    if (this.canvas.parentElement) {
      this._resizeObserver.observe(this.canvas.parentElement);
    }
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const width = Math.max(1, parent.clientWidth);
    const height = Math.max(1, parent.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  _animate() {
    // Цикл рендеринга не создаёт новых объектов и не выполняет тяжёлых
    // вычислений (п. 2.8 ТЗ) — только обновление контролов и рендер кадра.
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this._animationHandle = requestAnimationFrame(this._animate);
  }

  // ------------------------------------------------------------------
  // Материалы / текстуры
  // ------------------------------------------------------------------

  /**
   * Создаёт физически корректный материал по описанию из каталога
   * (см. cabinCatalog.js). Если у материала указаны пути к текстурам
   * (map/normalMap/roughnessMap/metalnessMap), они подгружаются с
   * анизотропной фильтрацией и корректным цветовым пространством —
   * это то место, где реальные карты материалов заменят плейсхолдеры
   * без изменения остального кода (6.4).
   */
  createMaterial(spec, overrides = {}) {
    if (!spec) return new THREE.MeshStandardMaterial({ color: 0x999999 });
    const params = {
      color: new THREE.Color(spec.color || '#999999'),
      roughness: spec.roughness ?? 0.5,
      metalness: spec.metalness ?? 0.1,
      envMapIntensity: overrides.envMapIntensity ?? 1,
      clearcoat: overrides.clearcoat ?? 0,
      clearcoatRoughness: overrides.clearcoatRoughness ?? 0.1,
      transmission: overrides.transmission ?? 0,
    };
    // Ключ `emissive` передаём конструктору только когда он реально задан —
    // THREE.Material логирует предупреждение при явном значении undefined.
    if (overrides.emissive) {
      params.emissive = new THREE.Color(overrides.emissive);
      params.emissiveIntensity = overrides.emissiveIntensity ?? 1;
    }
    if (overrides.thickness !== undefined) params.thickness = overrides.thickness;
    const material = new THREE.MeshPhysicalMaterial(params);

    if (spec.map) material.map = this._loadTexture(spec.map, THREE.SRGBColorSpace);
    if (spec.normalMap) material.normalMap = this._loadTexture(spec.normalMap, THREE.NoColorSpace);
    if (spec.roughnessMap) material.roughnessMap = this._loadTexture(spec.roughnessMap, THREE.NoColorSpace);
    if (spec.metalnessMap) material.metalnessMap = this._loadTexture(spec.metalnessMap, THREE.NoColorSpace);

    return material;
  }

  _loadTexture(path, colorSpace) {
    const texture = new THREE.TextureLoader().load(path);
    texture.colorSpace = colorSpace;
    texture.anisotropy = this.maxAnisotropy; // 6.4: чёткость текстур при любом угле обзора
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter; // 6.3: без потери качества при отдалении
    texture.magFilter = THREE.LinearFilter;
    this.loadedTextures.add(texture);
    return texture;
  }

  // ------------------------------------------------------------------
  // Построение кабины по выбранной конфигурации (раздел 4 ТЗ)
  // ------------------------------------------------------------------

  buildCabin(config) {
    this._disposeCabinGroup();

    const group = new THREE.Group();
    this.cabinGroup = group;

    const dims = {
      width: config.dimension.width * MM_TO_M,
      depth: config.dimension.depth * MM_TO_M,
      height: config.dimension.height * MM_TO_M,
    };

    group.add(this._buildFloor(dims, config));
    group.add(this._buildCeiling(dims, config));
    group.add(...this._buildWalls(dims, config));
    group.add(...this._buildDoors(dims, config));

    if (config.model.hasCorners) group.add(...this._buildCorners(dims, config));
    if (config.model.hasPlinth) group.add(...this._buildPlinth(dims, config));
    if (config.model.hasInserts) group.add(this._buildInsertBand(dims, config));

    group.add(...this._buildControlPanel(dims, config));
    group.add(...this._buildAccessories(dims, config));

    if (config.liftHall?.visible) {
      group.add(...this._buildLiftHall(dims, config));
    }

    group.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });

    this.scene.add(group);
    return group;
  }

  _buildFloor(dims, config) {
    const geometry = new THREE.BoxGeometry(dims.width, SLAB_THICKNESS, dims.depth);
    const material = this.createMaterial(config.materials.floor, { envMapIntensity: 1.1 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, -SLAB_THICKNESS / 2, 0);
    return mesh;
  }

  _buildCeiling(dims, config) {
    const ceilingSpec = config.ceiling;
    const geometry = new THREE.BoxGeometry(dims.width, SLAB_THICKNESS, dims.depth);
    const isMirrorFrame = ceilingSpec.typeId === 'ceiling-mirror-frame';
    const isBacklitGlass = ceilingSpec.typeId === 'ceiling-backlit-glass';
    const material = this.createMaterial(config.materials.ceiling, {
      clearcoat: isMirrorFrame ? 0.9 : 0,
      clearcoatRoughness: 0.05,
      emissive: isBacklitGlass ? '#fff3d6' : undefined,
      emissiveIntensity: isBacklitGlass ? 0.6 : 1,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, dims.height + SLAB_THICKNESS / 2, 0);
    return mesh;
  }

  _buildWalls(dims, config) {
    const meshes = [];
    const halfW = dims.width / 2;
    const halfD = dims.depth / 2;
    const through = config.entryType.throughType;

    const wallDefs = {
      back: { w: dims.width, pos: [0, dims.height / 2, -halfD - WALL_THICKNESS / 2], rot: 0 },
      left: { w: dims.depth, pos: [-halfW - WALL_THICKNESS / 2, dims.height / 2, 0], rot: Math.PI / 2 },
      right: { w: dims.depth, pos: [halfW + WALL_THICKNESS / 2, dims.height / 2, 0], rot: Math.PI / 2 },
    };

    const parts = through ? ['left', 'right'] : ['back', 'left', 'right'];
    parts.forEach((part) => {
      const def = wallDefs[part];
      const geometry = new THREE.BoxGeometry(def.w, dims.height, WALL_THICKNESS);
      const spec = config.materials.walls[part] || config.materials.walls.left;
      const material = this.createMaterial(spec);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...def.pos);
      mesh.rotation.y = def.rot;
      meshes.push(mesh);
    });

    return meshes;
  }

  _buildDoors(dims, config) {
    // Плейсхолдер дверных полотен: реальная геометрия (раздвижные створки,
    // порог, коробка) поставляется Заказчиком в виде 3D-моделей (п. 2.1) —
    // здесь достаточно физически корректного полотна нужного материала,
    // чтобы продемонстрировать применение отделки и освещения (раздел 6).
    const meshes = [];
    const halfD = dims.depth / 2;
    const doorHeight = dims.height * 0.92;
    const doorThickness = 0.04;

    const cabinDoorMaterial = this.createMaterial(config.materials.cabinDoor, {
      envMapIntensity: 1.2,
      clearcoat: 0.15,
    });
    const frontDoor = new THREE.Mesh(
      new THREE.BoxGeometry(dims.width * 0.94, doorHeight, doorThickness),
      cabinDoorMaterial,
    );
    frontDoor.position.set(0, doorHeight / 2, halfD - doorThickness / 2);
    meshes.push(frontDoor);

    if (config.entryType.throughType) {
      const backDoor = new THREE.Mesh(
        new THREE.BoxGeometry(dims.width * 0.94, doorHeight, doorThickness),
        cabinDoorMaterial,
      );
      backDoor.position.set(0, doorHeight / 2, -halfD + doorThickness / 2);
      meshes.push(backDoor);
    }

    return meshes;
  }

  _buildCorners(dims, config) {
    const material = this.createMaterial(config.materials.corner, { metalness: 0.6, clearcoat: 0.2 });
    const size = 0.05;
    const halfW = dims.width / 2 - size / 2;
    const halfD = dims.depth / 2 - size / 2;
    const positions = [
      [-halfW, -halfD],
      [halfW, -halfD],
      [-halfW, halfD],
      [halfW, halfD],
    ];
    return positions.map(([x, z]) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, dims.height, size), material);
      mesh.position.set(x, dims.height / 2, z);
      return mesh;
    });
  }

  _buildPlinth(dims, config) {
    const material = this.createMaterial(config.materials.plinth, { metalness: 0.45 });
    const height = 0.1;
    const thickness = 0.03;
    const halfW = dims.width / 2;
    const halfD = dims.depth / 2;
    const defs = [
      { w: dims.width, pos: [0, height / 2, -halfD], rot: 0 },
      { w: dims.depth, pos: [-halfW, height / 2, 0], rot: Math.PI / 2 },
      { w: dims.depth, pos: [halfW, height / 2, 0], rot: Math.PI / 2 },
    ];
    return defs.map((def) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(def.w, height, thickness), material);
      mesh.position.set(...def.pos);
      mesh.rotation.y = def.rot;
      return mesh;
    });
  }

  _buildInsertBand(dims, config) {
    // Декоративная вставка между щитами (п. 4.6) — горизонтальная полоса
    // на стыке отделочных щитов, окрашенная по палитре RAL.
    const material = this.createMaterial(config.materials.insert, { metalness: 0.5, roughness: 0.3 });
    const geometry = new THREE.BoxGeometry(dims.width * 0.98, 0.04, dims.depth * 0.98);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, dims.height * 0.55, 0);
    return mesh;
  }

  _buildControlPanel(dims, config) {
    const meshes = [];
    const panel = config.controlPanel;
    const halfW = dims.width / 2;
    const x = panel.position === 'panel-left' ? -halfW + 0.02 : halfW - 0.02;

    const bodyMaterial = this.createMaterial(panel.materials.body, { metalness: 0.7, clearcoat: 0.3 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.5, 0.16), bodyMaterial);
    body.position.set(x, dims.height * 0.55, 0.35);
    meshes.push(body);

    if (panel.materials.display) {
      const displayMaterial = this.createMaterial(panel.materials.display, {
        emissive: panel.materials.display.color,
        emissiveIntensity: 0.5,
        roughness: 0.15,
      });
      const display = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.08, 0.1), displayMaterial);
      display.position.set(x + (panel.position === 'panel-left' ? 0.012 : -0.012), dims.height * 0.72, 0.35);
      meshes.push(display);
    }

    if (panel.materials.buttons) {
      const buttonMaterial = this.createMaterial(panel.materials.buttons, { metalness: 0.4, roughness: 0.3 });
      for (let i = 0; i < 4; i += 1) {
        const button = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.008, 16), buttonMaterial);
        button.rotation.z = Math.PI / 2;
        button.position.set(x + (panel.position === 'panel-left' ? 0.012 : -0.012), dims.height * 0.5 - i * 0.08, 0.35);
        meshes.push(button);
      }
    }

    return meshes;
  }

  _buildAccessories(dims, config) {
    const meshes = [];
    const { mirror, handrail, wallScreen, domeCamera } = config.accessories;
    const halfW = dims.width / 2;
    const halfD = dims.depth / 2;
    const throughType = config.entryType.throughType;

    if (mirror) {
      // 6.1: зеркало — материал с metalness = 1 / roughness ≈ 0, поэтому
      // корректно отражает IBL-окружение и прямой свет сцены.
      const mirrorMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 1,
        roughness: 0.02,
        envMapIntensity: 1.4,
      });
      const mirrorMesh = new THREE.Mesh(new THREE.PlaneGeometry(dims.width * 0.7, dims.height * 0.55, 4, 4), mirrorMaterial);
      // Зеркало — по задней стене в непроходном исполнении, по стене
      // напротив приказной панели — в проходном (п. 4.12).
      const mirrorZ = throughType ? -halfD + 0.001 : -halfD + WALL_THICKNESS + 0.001;
      mirrorMesh.position.set(0, dims.height * 0.5, mirrorZ);
      meshes.push(mirrorMesh);

      if (mirror.screenEnabled) {
        const screenMaterial = new THREE.MeshStandardMaterial({
          color: 0x0a0c10,
          emissive: 0x2a72ff,
          emissiveIntensity: 0.4,
          roughness: 0.2,
        });
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(dims.width * 0.25, dims.height * 0.2), screenMaterial);
        screen.position.set(0, dims.height * 0.55, mirrorZ + 0.002);
        meshes.push(screen);
      }
    }

    const railLayout = getHandrailLayout(dims, { throughType, wallThickness: WALL_THICKNESS });
    if (handrail && railLayout.visible) {
      const handrailMaterial = this.createMaterial(handrail.materialSpec, { metalness: 0.75, roughness: 0.25 });
      const {
        radius, length, rotation, position,
      } = railLayout;
      const railGeometry = new THREE.CylinderGeometry(radius, radius, length, 24);
      const rail = new THREE.Mesh(railGeometry, handrailMaterial);
      rail.rotation.set(rotation.x, rotation.y, rotation.z);
      rail.position.set(position.x, position.y, position.z);
      meshes.push(rail);
    }

    if (wallScreen) {
      const screenMaterial = new THREE.MeshStandardMaterial({
        color: 0x05070a,
        emissive: 0x3fa9ff,
        emissiveIntensity: 0.5,
        roughness: 0.15,
      });
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(dims.width * 0.3, dims.height * 0.25), screenMaterial);
      screen.rotation.y = Math.PI;
      screen.position.set(0, dims.height * 0.6, -halfD + WALL_THICKNESS + 0.002);
      meshes.push(screen);
    }

    if (domeCamera) {
      const domeMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x111318,
        roughness: 0.05,
        metalness: 0.1,
        transmission: 0.6,
        thickness: 0.02,
        envMapIntensity: 1.3,
      });
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.045, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), domeMaterial);
      dome.rotation.x = Math.PI;
      dome.position.set(halfW - 0.15, dims.height - 0.02, halfD - 0.15);
      meshes.push(dome);
    }

    return meshes;
  }

  _buildLiftHall(dims, config) {
    // Упрощённое представление лифтового холла (п. 4.15) снаружи дверей
    // шахты — служит для демонстрации выбора отделки холла и вызывного
    // поста; финальная геометрия холла определяется дизайн-макетами
    // (Этап 1 Календарного плана).
    const meshes = [];
    const halfD = dims.depth / 2;
    const hall = config.liftHall;

    const shaftDoorMaterial = this.createMaterial(config.materials.shaftDoor, { metalness: 0.4, clearcoat: 0.1 });
    const shaftDoor = new THREE.Mesh(
      new THREE.BoxGeometry(dims.width * 0.94, dims.height * 0.92, 0.04),
      shaftDoorMaterial,
    );
    shaftDoor.position.set(0, (dims.height * 0.92) / 2, halfD + 0.12);
    meshes.push(shaftDoor);

    const hallFloor = new THREE.Mesh(
      new THREE.BoxGeometry(dims.width * 1.8, SLAB_THICKNESS, 1.6),
      this.createMaterial(hall.materials.floor),
    );
    hallFloor.position.set(0, -SLAB_THICKNESS / 2, halfD + 0.12 + 0.8);
    meshes.push(hallFloor);

    const hallWall = new THREE.Mesh(
      new THREE.BoxGeometry(dims.width * 1.8, dims.height, WALL_THICKNESS),
      this.createMaterial(hall.materials.wall),
    );
    hallWall.position.set(0, dims.height / 2, halfD + 0.12 + 1.6);
    meshes.push(hallWall);

    if (hall.callPost) {
      const callPostMaterial = this.createMaterial(hall.callPost, { metalness: 0.6, clearcoat: 0.25 });
      const callPost = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.02), callPostMaterial);
      callPost.position.set(dims.width * 0.6, dims.height * 0.55, halfD + 0.12 + 1.6 - WALL_THICKNESS / 2 - 0.01);
      meshes.push(callPost);
    }

    if (hall.floorIndicator) {
      const indicatorMaterial = this.createMaterial(hall.floorIndicator, {
        emissive: hall.floorIndicator.color,
        emissiveIntensity: 0.4,
      });
      const indicator = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.02), indicatorMaterial);
      indicator.position.set(-dims.width * 0.6, dims.height * 0.75, halfD + 0.12 + 1.6 - WALL_THICKNESS / 2 - 0.01);
      meshes.push(indicator);
    }

    return meshes;
  }

  // ------------------------------------------------------------------
  // Очистка памяти (п. 2.8 ТЗ — обязательный .dispose() геометрий,
  // материалов и текстур при удалении объектов сцены)
  // ------------------------------------------------------------------

  _disposeMaterial(material) {
    if (!material) return;
    ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap'].forEach((key) => {
      if (material[key]) {
        material[key].dispose();
        this.loadedTextures.delete(material[key]);
      }
    });
    material.dispose();
  }

  _disposeCabinGroup() {
    if (!this.cabinGroup) return;
    this.cabinGroup.traverse((obj) => {
      if (obj.isMesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => this._disposeMaterial(m));
        } else {
          this._disposeMaterial(obj.material);
        }
      }
    });
    this.scene.remove(this.cabinGroup);
    this.cabinGroup = null;
  }

  destroy() {
    if (this._animationHandle) cancelAnimationFrame(this._animationHandle);
    this._resizeObserver?.disconnect();
    this._disposeCabinGroup();
    this.loadedTextures.forEach((t) => t.dispose());
    this.loadedTextures.clear();
    this.environmentTexture?.dispose();
    this.pmremGenerator?.dispose();
    this.controls?.dispose();
    this.renderer?.dispose();
  }
}
