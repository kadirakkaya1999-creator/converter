import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* =====================================================================
   KALİBRASYON — otomatik hizalama tam oturmazsa, Kalibrasyon Modu'nda
   sürükleyip "Değerleri Kopyala" ile buraya (main.js) sabit değer olarak
   yapıştırabilirsiniz. null bırakılırsa otomatik hizalama kullanılır.
   Örnek: frontBumper: { position:[0.02,-0.01,0.15], rotation:[0,0.03,0], scale:[1.04,1.04,1.04] }
===================================================================== */
const CALIBRATION = {
  frontBumper: { position:[0.0111,-0.5077,0.2274], rotation:[-3.1416,-0.008,-3.1416], scale:[98.7108,117.2147,117.2147] },
  rearBumper: { position:[-0.0058,-0.3971,-0.4225], rotation:[-3.1416,0.001,-3.1416], scale:[100.4775,101.4389,112.5301] },
  hood: { position:[0.0247,-0.3754,-0.1151], rotation:[-3.1416,-0.0195,-3.1416], scale:[100.2913,97.4054,103.4228] },
  headlights: { position:[-0.1242,-0.3667,-0.3161], rotation:[-3.1416,0.0446,-3.1416], scale:[93.8694,93.8694,93.8694] },
  spoiler: { position:[-0.0128,-0.025,1.198], rotation:[-3.1416,-0.0202,-3.1416], scale:[93.0676,68.237,39.382] },
};
function applySavedCalibration(key, group) {
  const c = CALIBRATION[key];
  if (!c || !group) return;
  if (c.position) group.position.set(...c.position);
  if (c.rotation) group.rotation.set(...c.rotation);
  if (c.scale) group.scale.set(...c.scale);
}

/* =====================================================================
   SABİTLER
===================================================================== */
const TARGET_SIZE = 4.3;
const MODEL_PATHS = {
  g20: 'models/g20_330i.glb', // her zaman sahnede: temel şasi
  g80: 'models/g80_m3.glb',   // parça kaynağı (kendisi asla doğrudan gösterilmez)
};

const PAINT_COLORS = [
  { name: 'Alpine Beyaz',   hex: '#f2f3f0' },
  { name: 'Mat Siyah',      hex: '#15161a' },
  { name: 'Frozen Mavi',    hex: '#1c3a52' },
  { name: 'Satin Yeşil',    hex: '#2f4a34' },
  { name: 'Brooklyn Gri',   hex: '#4d5257' },
  { name: 'İnternational Kırmızı', hex: '#7a1620' },
];
const RIM_COLORS = [
  { name: 'Siyah',  hex: '#1a1a1c', metalness: 0.7, roughness: 0.35 },
  { name: 'Bronz',  hex: '#7a5a34', metalness: 0.85, roughness: 0.3 },
  { name: 'Gümüş',  hex: '#c7c9cc', metalness: 0.9,  roughness: 0.25 },
  { name: 'Krom',   hex: '#eef0f2', metalness: 1.0,  roughness: 0.08 },
];

/* =====================================================================
   G20 (bmw_g20_330i.glb) NODE HARİTASI
   -> Bu dosyadaki node'lar "Object_N" gibi jenerik isimlere sahip; anlamlı
      isimler yalnızca mesh tanımlarında var. Node<->mesh eşleşmesi offline
      olarak analiz edilip aşağıdaki sabit listeler çıkarıldı.
===================================================================== */
const G20_FRONT_BUMPER = [52,53,54,55,56,57,58,59,60,61,62,63, 76,77,78,79,80,81,82,83].map(n => `Object_${n}`);
const G20_REAR_BUMPER  = [104,105,106,107,108,109,110].map(n => `Object_${n}`);
const G20_HOOD         = [158,159,160,161,162].map(n => `Object_${n}`);
const G20_HEADLIGHTS   = [170,171,173,174].map(n => `Object_${n}`);
const G20_PAINT_NODES  = [34,44,72,79,87,94,106,113,116,126,144,147,152,158].map(n => `Object_${n}`);
const G20_RIM_NODES_PREFIXES = ['hub_lf', 'hub_rf', 'hub_lr', 'hub_rr']; // mesh adı bazlı (node adı yerine)
const G20_RIM_NODES = [225,226,227, 229,230,231, 221,222,223, 233,234,235].map(n => `Object_${n}`);

const nameSet = (arr) => new Set(arr);
const SET_FRONT = nameSet(G20_FRONT_BUMPER);
const SET_REAR = nameSet(G20_REAR_BUMPER);
const SET_HOOD = nameSet(G20_HOOD);
const SET_HEADLIGHTS = nameSet(G20_HEADLIGHTS);
const SET_PAINT = nameSet(G20_PAINT_NODES);
const SET_RIM = nameSet(G20_RIM_NODES);

/* G80 (bmw_m3_g80_2025.glb) tarafındaki gerçek parça isimleri */
const isG80FrontBumper = (n) => {
  const s = n.toLowerCase();
  return s.startsWith('m3g80law_bumper_f') || s.startsWith('compot_bumper') ||
         s.includes('grille_f_csl') || s.includes('csr2_grille') || s === 'paint_fb_864' || s.startsWith('paint_fb_');
};
const isG80RearBumper = (n) => {
  const s = n.toLowerCase();
  return s.startsWith('paint_rb') || s.startsWith('paint_trunk');
};
const isG80Hood = (n) => {
  const s = n.toLowerCase();
  return s.startsWith('hood_') || s.startsWith('paint_hood') || s.startsWith('chromehangershood') ||
         s.startsWith('metalbodyenginebayhood') || s.startsWith('pianoblackhoodenginebay');
};
const isG80Headlight = (n) => n.toLowerCase().startsWith('m4_2024_headlight');
const isG80Spoiler = (n) => n.toLowerCase().startsWith('wing_a_00') || n.toLowerCase().startsWith('compot_wings');
const isG80ExteriorPaint = (n) => {
  const s = n.toLowerCase();
  if (!(s.startsWith('paint') || s.includes('_paint') || s.includes('carpaint'))) return false;
  if (s.startsWith('int_') || s.includes('leaher') || s.includes('_seat') || s.startsWith('seat')) return false;
  return true;
};
const isHeadlightBeam = (n) => n.toLowerCase().includes('lowhighbeam');

const PART_DEFS = {
  frontBumper: { g20: (n) => SET_FRONT.has(n), g80: isG80FrontBumper, label: 'Ön Tampon & Izgara' },
  rearBumper:  { g20: (n) => SET_REAR.has(n),  g80: isG80RearBumper,  label: 'Arka Tampon & Bagaj' },
  hood:        { g20: (n) => SET_HOOD.has(n),  g80: isG80Hood,        label: 'Kaput' },
  headlights:  { g20: (n) => SET_HEADLIGHTS.has(n), g80: isG80Headlight, label: 'Farlar' },
};

/* =====================================================================
   SAHNE KURULUMU
===================================================================== */
const viewportEl = document.getElementById('viewport');

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewportEl.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100);
const DEFAULT_CAM_POS = new THREE.Vector3(4.6, 1.7, 5.4);
camera.position.copy(DEFAULT_CAM_POS);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 2.6;
controls.maxDistance = 12;
controls.maxPolarAngle = Math.PI * 0.51;
controls.target.set(0, 0.55, 0);
controls.update();

const transformControls = new TransformControls(camera, renderer.domElement);
transformControls.setSize(0.85);
transformControls.addEventListener('dragging-changed', (e) => { controls.enabled = !e.value; });
scene.add(transformControls);

const pmrem = new THREE.PMREMGenerator(renderer);
const studioEnvTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = studioEnvTexture;

const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x0c0d10, 0.65);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xffffff, 2.4);
key.position.set(5, 8, 4);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.near = 1;
key.shadow.camera.far = 30;
key.shadow.camera.left = -6;
key.shadow.camera.right = 6;
key.shadow.camera.top = 6;
key.shadow.camera.bottom = -6;
key.shadow.bias = -0.0003;
scene.add(key);

const rimLight = new THREE.DirectionalLight(0x9ad4ff, 0.5);
rimLight.position.set(-6, 3, -5);
scene.add(rimLight);

// Yansıtıcı stüdyo zemini: hem gölge alır hem de ortamı (ışık halkası, duvarlar) yansıtır
const groundGeo = new THREE.CircleGeometry(9, 64);
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x0c0d10, metalness: 0.75, roughness: 0.22, envMapIntensity: 1.1,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Klasik fotoğraf stüdyosu ışık halkası: arabanın arkasında, dikey duran parlak bir halka
const lightRingGeo = new THREE.TorusGeometry(3.4, 0.09, 24, 96);
const lightRingMat = new THREE.MeshBasicMaterial({ color: 0xfafcff });
const lightRing = new THREE.Mesh(lightRingGeo, lightRingMat);
lightRing.position.set(0, 2.4, -5.5);
lightRing.rotation.x = Math.PI / 2.3;
scene.add(lightRing);
const ringGlow = new THREE.PointLight(0xeaf2ff, 6, 14, 2);
ringGlow.position.copy(lightRing.position);
scene.add(ringGlow);

const grid = new THREE.GridHelper(20, 40, 0x2a331a, 0x14170f);
grid.position.y = 0.001;
grid.visible = false;
scene.add(grid);

const envDarkColor = new THREE.Color(0x07080a);
const envShowroomColor = new THREE.Color(0x2a2d33);
scene.background = studioEnvTexture;

/* =====================================================================
   YÜKLEME EKRANI
===================================================================== */
const loaderEl = document.getElementById('loader');
const loaderTitle = document.getElementById('loaderTitle');
const loaderFill = document.getElementById('loaderFill');
const loaderPct = document.getElementById('loaderPct');

function showLoader(title) {
  loaderTitle.textContent = title;
  loaderFill.style.width = '0%';
  loaderPct.textContent = '0%';
  loaderEl.classList.remove('is-hidden');
}
function updateLoader(ratio) {
  const pct = Math.min(100, Math.round(ratio * 100));
  loaderFill.style.width = pct + '%';
  loaderPct.textContent = pct + '%';
}
function hideLoader() {
  setTimeout(() => loaderEl.classList.add('is-hidden'), 200);
}

/* =====================================================================
   MODEL YÜKLEME
===================================================================== */
const gltfLoader = new GLTFLoader();
let g20Root = null;
let g80Source = null; // sahneye asla eklenmez, yalnızca parça kaynağı

function normalizeModel(root) {
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = TARGET_SIZE / maxDim;
  root.scale.setScalar(scale);

  const box2 = new THREE.Box3().setFromObject(root);
  const center = new THREE.Vector3();
  box2.getCenter(center);
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box2.min.y;

  root.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  root.updateMatrixWorld(true);
  return root;
}

function loadGLTF(path, onProgress) {
  return new Promise((resolve, reject) => {
    gltfLoader.load(path, (gltf) => resolve(gltf.scene), onProgress, reject);
  });
}

/* =====================================================================
   DÜNYA BOUNDING BOX
   (Daha önce SkinnedMesh.boneTransform/applyBoneTransform ile "tam doğru"
   skin-duyarlı bir hesap denendi, ama bu metodun tam davranışı three.js
   sürümleri arasında farklılık gösteriyor ve hedef değeri doğrudan
   değiştirmek yerine yeni bir değer döndürüyor olabiliyor — bu da sessizce
   (0,0,0) ile kalıp yarıçapı sıfırlıyordu. Bunun yerine, tüm araba için
   zaten doğru sonuç veren basit yöntemi (geometri bounding box'ını
   mesh.matrixWorld ile dünyaya taşımak) tüm mesh'ler için tek tip
   kullanıyoruz. Bu G20'nin rijit/tek-kemik skin yapısı için pratikte
   yeterince doğru sonuç verir.) */
function computeWorldBox(mesh) {
  const geometry = mesh.geometry;
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  return geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
}

/* Bir grubu (henüz sahneye bağlıysa `scene`'in doğrudan çocuğu olmalı, yani
   world-space == local-space) verilen hedef dünya kutusuna bounding-sphere
   ile otomatik hizalar: ölçek + konum. Döndürme dokunulmaz (0 kalır). */
function autoFitGroupToBox(group, targetBox) {
  group.position.set(0, 0, 0);
  group.rotation.set(0, 0, 0);
  group.scale.set(1, 1, 1);
  group.updateMatrixWorld(true);

  const targetSphere = new THREE.Sphere();
  targetBox.getBoundingSphere(targetSphere);

  const srcBox = new THREE.Box3().setFromObject(group);
  const srcSphere = new THREE.Sphere();
  srcBox.getBoundingSphere(srcSphere);

  const scale = srcSphere.radius > 0 ? targetSphere.radius / srcSphere.radius : 1;
  group.scale.setScalar(scale);
  group.updateMatrixWorld(true);

  const box2 = new THREE.Box3().setFromObject(group);
  const center2 = new THREE.Vector3();
  box2.getCenter(center2);
  const delta = new THREE.Vector3().subVectors(targetSphere.center, center2);
  group.position.add(delta);
}

/* GLTFLoader bazı dosyalarda anlamlı ismi bir ÜST (ebeveyn) node'a koyup,
   gerçek mesh'i altındaki jenerik "Object_N" adlı bir çocuk node'a koyabiliyor
   (bu iki modelde de böyle). Bu yüzden yalnızca mesh'in kendi ismine değil,
   tüm ebeveyn zincirine bakarak eşleştirme yapıyoruz — hangi seviyede olursa
   olsun anlamlı isim bulunduğunda eşleşme sağlanır. */
function nameMatchesChain(obj, predicate) {
  let node = obj;
  while (node) {
    if (node.name && predicate(node.name)) return true;
    node = node.parent;
  }
  return false;
}

function collectByPredicate(root, predicate) {
  const result = [];
  root.traverse((obj) => { if (obj.isMesh && nameMatchesChain(obj, predicate)) result.push(obj); });
  return result;
}

function unionWorldBox(meshes) {
  const box = new THREE.Box3();
  meshes.forEach((m) => box.union(computeWorldBox(m)));
  return box;
}

function uniqueMaterials(meshes) {
  const set = new Set();
  meshes.forEach((m) => {
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    mats.forEach((mm) => { if (mm) set.add(mm); });
  });
  return [...set];
}

/* G80 kaynağından, seçilen mesh'leri KENDİ ARALARINDAKİ göreli konumu koruyarak
   ayrı (detached) bir gruba klonlar. Grup identity transform ile başlar; bu
   yüzden grubun bounding box'ı doğrudan o parçanın "doğal" dünya boyutunu verir.

   ÖNEMLİ: Kaynak dosyada anlamlı isimler mesh'in KENDİSİNDE değil, üstündeki
   (jenerik "Object_N" olmayan) ebeveyn node'larda duruyor. Sadece yaprak mesh'i
   klonlarsak bu isimler kaybolur ve grup içeride yapılan sonraki eşleştirmeler
   (boya, emisif far vb.) hiçbir şey bulamaz. Bu yüzden ebeveyn isim zincirini
   identity-transform sarmalayıcı Group'lar olarak koruyoruz — konum/boyut
   bozulmaz (identity çarpımı etkisizdir), yalnızca isimler saklanır. */
function buildDetachedGroup(sourceRoot, predicate) {
  const group = new THREE.Group();
  sourceRoot.updateMatrixWorld(true);
  sourceRoot.traverse((obj) => {
    if (obj.isMesh && nameMatchesChain(obj, predicate)) {
      const clone = obj.clone();
      clone.matrix.copy(obj.matrixWorld);
      clone.matrix.decompose(clone.position, clone.quaternion, clone.scale);
      clone.matrixAutoUpdate = true;
      clone.castShadow = true;
      clone.receiveShadow = true;

      let wrapper = clone;
      let anc = obj.parent;
      while (anc && anc !== sourceRoot) {
        if (anc.name) {
          const named = new THREE.Group();
          named.name = anc.name;
          named.add(wrapper);
          wrapper = named;
        }
        anc = anc.parent;
      }
      group.add(wrapper);
    }
  });
  return group;
}

/* =====================================================================
   PARÇA DEĞİŞTİRME (G20'den sök, G80'den tak)
===================================================================== */
const partState = {}; // key -> { installed: bool, g20Meshes: [], g80Group: Object3D|null }

async function ensureG80Loaded() {
  if (g80Source) return g80Source;
  showLoader('G80 M3 parça kütüphanesi yükleniyor');
  const root = await loadGLTF(MODEL_PATHS.g80, (xhr) => { if (xhr.total) updateLoader(xhr.loaded / xhr.total); });
  root.updateMatrixWorld(true);
  g80Source = root;
  hideLoader();
  return root;
}

async function togglePart(key, install) {
  const def = PART_DEFS[key];
  if (!partState[key]) {
    partState[key] = { installed: false, g20Meshes: collectByPredicate(g20Root, def.g20), g80Group: null };
  }
  const st = partState[key];

  if (install) {
    await ensureG80Loaded();
    if (!st.g80Group) {
      const g80Group = buildDetachedGroup(g80Source, def.g80);
      if (g80Group.children.length === 0) {
        console.warn(`'${key}' için G80 tarafında eşleşen mesh bulunamadı.`);
        return;
      }
      // G20 parçasının dünya bounding-sphere'i (hedef)
      g20Root.updateMatrixWorld(true);
      if (st.g20Meshes.length === 0) {
        console.warn(`'${key}' için G20 tarafında eşleşen mesh bulunamadı — kaldırılacak parça yok.`);
      }
      const g20Box = unionWorldBox(st.g20Meshes);
      const g20SphereDbg = new THREE.Sphere();
      g20Box.getBoundingSphere(g20SphereDbg);

      scene.add(g80Group); // önce scene'e ekle (world-space == local-space burada)
      const g80BoxDbg = new THREE.Box3().setFromObject(g80Group);
      const g80SphereDbg = new THREE.Sphere();
      g80BoxDbg.getBoundingSphere(g80SphereDbg);

      autoFitGroupToBox(g80Group, g20Box);
      console.log(
        `[${key}] G20 eşleşen mesh: ${st.g20Meshes.length} | G80 eşleşen mesh: ${g80Group.children.length}\n` +
        `  G20 hedef küre → yarıçap: ${g20SphereDbg.radius.toFixed(4)}, merkez: (${g20SphereDbg.center.x.toFixed(3)}, ${g20SphereDbg.center.y.toFixed(3)}, ${g20SphereDbg.center.z.toFixed(3)})\n` +
        `  G80 kaynak küre (ölçeksiz) → yarıçap: ${g80SphereDbg.radius.toFixed(4)}\n` +
        `  Uygulanan ölçek: ${g80Group.scale.x.toFixed(4)} | yeni konum: (${g80Group.position.x.toFixed(3)}, ${g80Group.position.y.toFixed(3)}, ${g80Group.position.z.toFixed(3)})`
      );
      g20Root.attach(g80Group); // dünya transformunu koruyarak G20'nin çocuğu yap (birlikte döner)
      applySavedCalibration(key, g80Group);

      applyPaintToGroup(g80Group);
      st.g80Group = g80Group;
    }
    st.g80Group.visible = true;
    st.g20Meshes.forEach((m) => (m.visible = false));
    st.installed = true;
  } else {
    if (st.g80Group) st.g80Group.visible = false;
    st.g20Meshes.forEach((m) => (m.visible = true));
    st.installed = false;
  }
  updateHeadlightState();
  updateHud();
}

/* Kalibrasyon Modu'nda "Otomatik Hizalamaya Dön" için: grubu geçici olarak
   scene'in çocuğu yapıp yeniden otomatik hizalar, sonra G20'ye geri bağlar. */
function refitPart(key) {
  const st = partState[key];
  if (!st || !st.g80Group) return;
  g20Root.updateMatrixWorld(true);
  const g20Box = unionWorldBox(st.g20Meshes);
  scene.attach(st.g80Group);
  autoFitGroupToBox(st.g80Group, g20Box);
  g20Root.attach(st.g80Group);
}

function refitSpoiler() {
  if (!spoilerGroup) return;
  g20Root.updateMatrixWorld(true);
  const bootMeshes = collectByPredicate(g20Root, (n) => SET_REAR.has(n));
  const anchorBox = bootMeshes.length ? unionWorldBox(bootMeshes) : new THREE.Box3().setFromObject(g20Root);
  scene.attach(spoilerGroup);
  autoFitGroupToBox(spoilerGroup, anchorBox);
  // spoiler'ı bagaj üstüne kaldır (autoFit merkezleri çakıştırır, biz üste iteriz)
  const anchorSphere = new THREE.Sphere();
  anchorBox.getBoundingSphere(anchorSphere);
  const box2 = new THREE.Box3().setFromObject(spoilerGroup);
  spoilerGroup.position.y += (anchorBox.max.y - box2.max.y) + 0.02;
  g20Root.attach(spoilerGroup);
}

/* Bağımsız ekleme: G20'de karşılığı olmayan parçalar (spoiler) */
let spoilerGroup = null;
async function toggleSpoiler(install) {
  if (install) {
    await ensureG80Loaded();
    if (!spoilerGroup) {
      spoilerGroup = buildDetachedGroup(g80Source, isG80Spoiler);
      if (spoilerGroup.children.length > 0) {
        // Bagaj (boot) bölgesinin üst-arka noktasını referans al
        g20Root.updateMatrixWorld(true);
        const bootMeshes = collectByPredicate(g20Root, (n) => SET_REAR.has(n));
        const anchorBox = bootMeshes.length ? unionWorldBox(bootMeshes) : new THREE.Box3().setFromObject(g20Root);

        scene.add(spoilerGroup);
        autoFitGroupToBox(spoilerGroup, anchorBox);
        // spoiler'ı bagaj üst noktasının biraz üstüne yerleştir
        const box2 = new THREE.Box3().setFromObject(spoilerGroup);
        spoilerGroup.position.y += (anchorBox.max.y - box2.max.y) + 0.02;

        g20Root.attach(spoilerGroup);
        applySavedCalibration('spoiler', spoilerGroup);
        applyPaintToGroup(spoilerGroup, true);
      }
    }
    if (spoilerGroup) spoilerGroup.visible = true;
  } else if (spoilerGroup) {
    spoilerGroup.visible = false;
  }
  updateHud();
}

/* =====================================================================
   BOYA / JANT / FARLAR
===================================================================== */
const state = { paint: null, paintName: null, rim: null, rimName: null, lights: false };
const headlightPointLights = [];

function applyPaintToGroup(group, carbonOnly) {
  if (!state.paint) return;
  const meshes = collectByPredicate(group, isG80ExteriorPaint);
  uniqueMaterials(meshes).forEach((mat) => {
    if (mat.color) mat.color.set(state.paint);
    if ('metalness' in mat) mat.metalness = 0.75;
    if ('roughness' in mat) mat.roughness = 0.32;
  });
}

function applyPaint() {
  if (!state.paint) return;
  const g20PaintMeshes = collectByPredicate(g20Root, (n) => SET_PAINT.has(n));
  uniqueMaterials(g20PaintMeshes).forEach((mat) => {
    if (mat.color) mat.color.set(state.paint);
  });
  Object.values(partState).forEach((st) => { if (st.g80Group) applyPaintToGroup(st.g80Group); });
  updateHud();
}

function applyRim() {
  if (!state.rim) return;
  const meshes = collectByPredicate(g20Root, (n) => SET_RIM.has(n));
  uniqueMaterials(meshes).forEach((mat) => {
    if (mat.color) mat.color.set(state.rim.hex);
    if ('metalness' in mat) mat.metalness = state.rim.metalness;
    if ('roughness' in mat) mat.roughness = state.rim.roughness;
  });
  updateHud();
}

function updateHeadlightState() {
  // Hangi far seti görünüyorsa (G20 orijinal ya da takılmış M3 far grubu) onu kullan
  headlightPointLights.forEach((l) => scene.remove(l));
  headlightPointLights.length = 0;

  let beamMeshes = [];
  const hlState = partState.headlights;
  if (hlState && hlState.installed && hlState.g80Group) {
    beamMeshes = collectByPredicate(hlState.g80Group, isHeadlightBeam);
    uniqueMaterials(beamMeshes).forEach((mat) => {
      if ('emissive' in mat) {
        mat.emissive.set(state.lights ? 0xfff2c8 : 0x000000);
        mat.emissiveIntensity = state.lights ? 2.4 : 0;
      }
    });
  } else {
    const g20Lights = collectByPredicate(g20Root, (n) => SET_HEADLIGHTS.has(n));
    uniqueMaterials(g20Lights).forEach((mat) => {
      if ('emissive' in mat) {
        mat.emissive.set(state.lights ? 0xfff6d8 : 0x000000);
        mat.emissiveIntensity = state.lights ? 1.6 : 0;
      }
    });
    beamMeshes = g20Lights;
  }

  const seenSides = {};
  beamMeshes.forEach((m) => {
    const side = /_l[._]|headlight_l/i.test(m.name) ? 'L' : 'R';
    if (seenSides[side]) return;
    seenSides[side] = true;
    const box = computeWorldBox(m);
    const c = new THREE.Vector3();
    box.getCenter(c);
    const light = new THREE.PointLight(0xfff2c8, 3, 4, 2);
    light.position.copy(c);
    light.visible = state.lights;
    scene.add(light);
    headlightPointLights.push(light);
  });
}

/* =====================================================================
   HUD
===================================================================== */
function updateHud() {
  const installedLabels = Object.keys(partState)
    .filter((k) => partState[k].installed)
    .map((k) => PART_DEFS[k].label);
  document.getElementById('hudParts').textContent = installedLabels.length ? installedLabels.join(', ') : 'Yok';
  document.getElementById('hudPaint').textContent = state.paintName || '—';
  document.getElementById('hudRim').textContent = state.rimName || '—';
  document.getElementById('hudLights').textContent = state.lights ? 'Açık' : 'Kapalı';
}

/* =====================================================================
   UI BAĞLAMA
===================================================================== */
function buildSwatches(containerId, colors, kind) {
  const container = document.getElementById(containerId);
  colors.forEach((c) => {
    const el = document.createElement('div');
    el.className = 'swatch';
    el.style.background = c.hex;
    el.title = c.name;
    el.addEventListener('click', () => {
      [...container.children].forEach((s) => s.classList.remove('is-active'));
      el.classList.add('is-active');
      if (kind === 'rim') {
        state.rim = c; state.rimName = c.name;
        applyRim();
      } else {
        state.paint = c.hex; state.paintName = c.name;
        applyPaint();
      }
    });
    container.appendChild(el);
  });
}
buildSwatches('paintSwatches', PAINT_COLORS, 'paint');
buildSwatches('rimSwatches', RIM_COLORS, 'rim');

document.getElementById('paintCustom').addEventListener('input', (e) => {
  document.querySelectorAll('#paintSwatches .swatch').forEach((s) => s.classList.remove('is-active'));
  state.paint = e.target.value;
  state.paintName = 'Özel';
  applyPaint();
});

const partLoadHint = document.getElementById('partLoadHint');
function bindPartToggle(elId, key) {
  document.getElementById(elId).addEventListener('change', async (e) => {
    partLoadHint.textContent = e.target.checked ? `${PART_DEFS[key].label} takılıyor…` : '';
    await togglePart(key, e.target.checked);
    partLoadHint.textContent = '';
    refreshCalibOptions();
  });
}
bindPartToggle('partFrontBumper', 'frontBumper');
bindPartToggle('partRearBumper', 'rearBumper');
bindPartToggle('partHood', 'hood');
bindPartToggle('partHeadlights', 'headlights');

document.getElementById('partSpoiler').addEventListener('change', async (e) => {
  partLoadHint.textContent = e.target.checked ? 'Karbon spoiler takılıyor…' : '';
  await toggleSpoiler(e.target.checked);
  partLoadHint.textContent = '';
  refreshCalibOptions();
});

/* =====================================================================
   KALİBRASYON MODU
===================================================================== */
const CALIB_LABELS = {
  frontBumper: 'Ön Tampon & Izgara',
  rearBumper: 'Arka Tampon & Bagaj',
  hood: 'Kaput',
  headlights: 'Farlar',
  spoiler: 'Karbon Arka Spoiler',
};
function getCalibGroup(key) {
  if (key === 'spoiler') return spoilerGroup;
  return partState[key] ? partState[key].g80Group : null;
}
function refreshCalibOptions() {
  const select = document.getElementById('calibPartSelect');
  const prev = select.value;
  select.innerHTML = '';
  Object.keys(CALIB_LABELS).forEach((key) => {
    const group = getCalibGroup(key);
    if (group && group.visible) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = CALIB_LABELS[key];
      select.appendChild(opt);
    }
  });
  if ([...select.options].some((o) => o.value === prev)) select.value = prev;
  onCalibPartChange();
}
function onCalibPartChange() {
  const select = document.getElementById('calibPartSelect');
  const key = select.value;
  const group = getCalibGroup(key);
  if (group && document.getElementById('calibEnable').checked) {
    transformControls.attach(group);
  } else {
    transformControls.detach();
  }
}
document.getElementById('calibEnable').addEventListener('change', (e) => {
  const on = e.target.checked;
  document.getElementById('calibControls').style.display = on ? 'block' : 'none';
  if (on) { refreshCalibOptions(); } else { transformControls.detach(); }
});

/* Parça sahnede yoksa/görünmüyorsa: tüm takılı M3 parçalarını parlak yeşil
   tel kafes olarak göster — malzeme/ışık/boyut sorunlarından bağımsız olarak
   geometrinin gerçekten orada olup olmadığını kesin şekilde gösterir. */
const debugMaterial = new THREE.MeshBasicMaterial({ color: 0x39ff6a, wireframe: true, depthTest: false });
let debugOriginalMaterials = null;
document.getElementById('debugWireframe').addEventListener('change', (e) => {
  const allGroups = [...Object.values(partState).map((s) => s.g80Group), spoilerGroup].filter(Boolean);
  if (e.target.checked) {
    debugOriginalMaterials = new Map();
    allGroups.forEach((g) => g.traverse((o) => {
      if (o.isMesh) { debugOriginalMaterials.set(o, o.material); o.material = debugMaterial; }
    }));
    console.log(`Tel kafes modu açık — sahnede ${allGroups.reduce((n, g) => n + g.children.length, 0)} takılı M3 parça grubu mesh'i yeşil tel kafes olarak gösteriliyor.`);
  } else if (debugOriginalMaterials) {
    debugOriginalMaterials.forEach((mat, obj) => { obj.material = mat; });
    debugOriginalMaterials = null;
  }
});
document.getElementById('calibPartSelect').addEventListener('change', onCalibPartChange);
document.getElementById('calibModeSeg').addEventListener('click', (e) => {
  const btn = e.target.closest('.seg-btn');
  if (!btn) return;
  [...e.currentTarget.children].forEach((b) => b.classList.toggle('is-active', b === btn));
  transformControls.setMode(btn.dataset.mode);
});
document.getElementById('calibCopy').addEventListener('click', () => {
  const key = document.getElementById('calibPartSelect').value;
  const group = getCalibGroup(key);
  if (!group) return;
  const p = group.position, r = group.rotation, s = group.scale;
  const fmt = (n) => Math.round(n * 10000) / 10000;
  const snippet = `${key}: { position:[${fmt(p.x)},${fmt(p.y)},${fmt(p.z)}], rotation:[${fmt(r.x)},${fmt(r.y)},${fmt(r.z)}], scale:[${fmt(s.x)},${fmt(s.y)},${fmt(s.z)}] },`;
  navigator.clipboard.writeText(snippet).then(() => {
    const toast = document.getElementById('calibToast');
    toast.classList.add('is-visible');
    setTimeout(() => toast.classList.remove('is-visible'), 2200);
  });
  console.log('CALIBRATION için kopyalanan satır:\n' + snippet);
});
document.getElementById('calibReset').addEventListener('click', () => {
  const key = document.getElementById('calibPartSelect').value;
  if (!key) return;
  if (key === 'spoiler') refitSpoiler(); else refitPart(key);
  transformControls.attach(getCalibGroup(key));
});

document.getElementById('toggleLights').addEventListener('change', (e) => {
  state.lights = e.target.checked;
  updateHeadlightState();
  updateHud();
});

document.getElementById('toggleRotate').addEventListener('change', (e) => { state.autoRotate = e.target.checked; });

document.getElementById('envSeg').addEventListener('click', (e) => {
  const btn = e.target.closest('.seg-btn');
  if (!btn) return;
  [...e.currentTarget.children].forEach((b) => b.classList.toggle('is-active', b === btn));
  const env = btn.dataset.env;
  if (env === 'dark') { scene.background = studioEnvTexture; grid.visible = false; lightRing.visible = true; ringGlow.visible = true; }
  else if (env === 'showroom') { scene.background = envShowroomColor; grid.visible = false; lightRing.visible = false; ringGlow.visible = false; }
  else { scene.background = envDarkColor; grid.visible = true; lightRing.visible = false; ringGlow.visible = false; }
});

document.getElementById('resetCam').addEventListener('click', () => {
  camera.position.copy(DEFAULT_CAM_POS);
  controls.target.set(0, 0.55, 0);
  controls.update();
});

document.getElementById('exportPng').addEventListener('click', () => {
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bmw-g20-m3-configurator.png';
  a.click();
});

document.getElementById('exportConfig').addEventListener('click', () => {
  const installed = Object.keys(partState).filter((k) => partState[k].installed).map((k) => PART_DEFS[k].label);
  const lines = [
    'ŞASİ: G20 330i (M3 parçalarıyla dönüştürüldü)',
    `TAKILI M3 PARÇALARI: ${installed.length ? installed.join(', ') : 'Yok'}`,
    `KARBON SPOİLER: ${spoilerGroup && spoilerGroup.visible ? 'Takılı' : 'Yok'}`,
    `BOYA: ${state.paintName || 'Varsayılan'}`,
    `JANT: ${state.rimName || 'Varsayılan'}`,
    `FARLAR: ${state.lights ? 'Açık' : 'Kapalı'}`,
  ].join('\n');
  navigator.clipboard.writeText(lines).then(() => {
    const toast = document.getElementById('copyToast');
    toast.classList.add('is-visible');
    setTimeout(() => toast.classList.remove('is-visible'), 1600);
  });
});

/* =====================================================================
   RESIZE / DÖNGÜ
===================================================================== */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  if (state.autoRotate && g20Root) g20Root.rotation.y += dt * 0.35;
  controls.update();
  renderer.render(scene, camera);
}
animate();

/* =====================================================================
   BAŞLANGIÇ: G20 330i'yi yükle ve sahneye yerleştir
===================================================================== */
let baseGroundY = 0;
(async function init() {
  showLoader('G20 330i modeli yükleniyor');
  const root = await loadGLTF(MODEL_PATHS.g20, (xhr) => { if (xhr.total) updateLoader(xhr.loaded / xhr.total); });
  g20Root = normalizeModel(root);
  baseGroundY = g20Root.position.y;
  const initialOffset = parseFloat(document.getElementById('heightAdjust').value) || 0;
  g20Root.position.y = baseGroundY + initialOffset;
  scene.add(g20Root);
  hideLoader();
  updateHud();
})();

document.getElementById('heightAdjust').addEventListener('input', (e) => {
  const offset = parseFloat(e.target.value);
  document.getElementById('heightValue').textContent = offset.toFixed(2);
  if (g20Root) g20Root.position.y = baseGroundY + offset;
});
