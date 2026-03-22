/* ═══════════════════════════════════════════════════════════════════════
   NexaBank — 3D Animation Engine  |  Two-Stage Auto Sequence
   Stage 2 (shield) → cross-fades → Stage 1 (bank) stays permanently
═══════════════════════════════════════════════════════════════════════ */
'use strict';

// ─── SCENE SETUP ──────────────────────────────────────────────────────
const canvas   = document.getElementById('bankCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.outputEncoding    = THREE.sRGBEncoding;
renderer.toneMapping       = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.setClearColor(0xf0f2fc, 1);

const scene  = new THREE.Scene();
scene.fog    = new THREE.FogExp2(0xdde3f7, 0.018);

const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 2.5, 14);
camera.lookAt(0, 0, 0);

// ─── RESIZE ───────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── LIGHTS ───────────────────────────────────────────────────────────
const ambient = new THREE.AmbientLight(0xffffff, 0.45);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 1.1);
sun.position.set(8, 16, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.far = 60;
sun.shadow.bias = -0.001;
scene.add(sun);

const fillL = new THREE.DirectionalLight(0xc8d5ff, 0.5);
fillL.position.set(-6, 4, -8);
scene.add(fillL);

const rimL = new THREE.DirectionalLight(0xa0b8ff, 0.4);
rimL.position.set(0, -4, -10);
scene.add(rimL);

const ptL1 = new THREE.PointLight(0x4F6EF7, 3.5, 18);
ptL1.position.set(0, 1, 0);
scene.add(ptL1);

const ptL2 = new THREE.PointLight(0x7c3aed, 2.2, 14);
ptL2.position.set(0, -2, 0);
scene.add(ptL2);

// ─── SHARED MATERIALS ─────────────────────────────────────────────────
const matGlass = new THREE.MeshPhysicalMaterial({
  color: 0xd0dcff, metalness: 0.05, roughness: 0.06,
  transmission: 0.82, thickness: 1.2, ior: 1.45,
  transparent: true, opacity: 0.88,
  envMapIntensity: 1.2,
  side: THREE.DoubleSide
});

const matBrushMetal = new THREE.MeshStandardMaterial({
  color: 0xc8d0e8, metalness: 0.95, roughness: 0.22,
  envMapIntensity: 1.0
});

const matEmissBlue = new THREE.MeshStandardMaterial({
  color: 0x1a2aff, emissive: 0x3050ff, emissiveIntensity: 1.4,
  metalness: 0.3, roughness: 0.5, transparent: true, opacity: 0.9
});

const matRingGlass = new THREE.MeshPhysicalMaterial({
  color: 0x8899ff, metalness: 0.0, roughness: 0.0,
  transmission: 0.75, thickness: 0.8, ior: 1.4,
  transparent: true, opacity: 0.6, side: THREE.DoubleSide,
  emissive: 0x2233cc, emissiveIntensity: 0.35
});

const matPlatform = new THREE.MeshStandardMaterial({
  color: 0xe4e9f7, metalness: 0.4, roughness: 0.55
});

// ─── CORE BANK STRUCTURE — GREEK TEMPLE (light/pearl/blue theme) ─────
const bankGroup = new THREE.Group();
scene.add(bankGroup);

// ── Materials ──
const matTempleBody = new THREE.MeshPhysicalMaterial({
  color: 0xeef1fb, metalness: 0.08, roughness: 0.25,
  transmission: 0.55, thickness: 0.8, ior: 1.38,
  transparent: true, opacity: 0.92, side: THREE.DoubleSide,
  envMapIntensity: 1.1
});
const matTempleMetal = new THREE.MeshStandardMaterial({
  color: 0xd8dff5, metalness: 0.88, roughness: 0.18, envMapIntensity: 1.2
});
const matGlowBlue = new THREE.MeshStandardMaterial({
  color: 0x4f6ef7, emissive: 0x3355ff, emissiveIntensity: 2.8,
  metalness: 0.0, roughness: 0.3, transparent: true, opacity: 0.95
});
const matGlowViolet = new THREE.MeshStandardMaterial({
  color: 0x7c3aed, emissive: 0x8855ff, emissiveIntensity: 2.2,
  metalness: 0.0, roughness: 0.4, transparent: true, opacity: 0.9
});
const matEdgeGlow = new THREE.MeshStandardMaterial({
  color: 0x88aaff, emissive: 0x5577ff, emissiveIntensity: 3.5,
  transparent: true, opacity: 0.85
});

// ── BUILDING BASE STEPS (wide → narrow, bottom to top) ──
const stepData = [
  { rx: 2.6, rz: 1.85, h: 0.22, y: -1.52 },
  { rx: 2.35, rz: 1.65, h: 0.22, y: -1.30 },
  { rx: 2.1,  rz: 1.47, h: 0.22, y: -1.08 }
];
stepData.forEach(s => {
  const sGeo  = new THREE.BoxGeometry(s.rx * 2, s.h, s.rz * 2);
  const sMesh = new THREE.Mesh(sGeo, matTempleMetal.clone());
  sMesh.position.y = s.y;
  sMesh.castShadow = true; sMesh.receiveShadow = true;
  bankGroup.add(sMesh);
  // Emissive edge strip on each step
  const edgeGeo  = new THREE.BoxGeometry(s.rx * 2 + 0.02, 0.03, s.rz * 2 + 0.02);
  const edgeMesh = new THREE.Mesh(edgeGeo, matEdgeGlow.clone());
  edgeMesh.position.y = s.y + s.h / 2 + 0.015;
  bankGroup.add(edgeMesh);
});

// ── MAIN BUILDING BODY ──
const mainBodyGeo  = new THREE.BoxGeometry(3.9, 1.55, 2.8);
const mainBodyMesh = new THREE.Mesh(mainBodyGeo, matTempleBody);
mainBodyMesh.position.y = -0.25;
mainBodyMesh.castShadow = true;
bankGroup.add(mainBodyMesh);

// Inner emissive wall (gives glow behind glass)
const innerGeo  = new THREE.BoxGeometry(3.7, 1.4, 2.6);
const innerMat  = new THREE.MeshStandardMaterial({
  color: 0xaabbff, emissive: 0x4455ff, emissiveIntensity: 0.55,
  transparent: true, opacity: 0.35
});
const innerWall = new THREE.Mesh(innerGeo, innerMat);
innerWall.position.y = -0.25;
bankGroup.add(innerWall);

// ── FRONT ENTRYWAY arch ──
const archGeo  = new THREE.BoxGeometry(0.9, 1.0, 0.18);
const archMesh = new THREE.Mesh(archGeo, matGlowBlue.clone());
archMesh.position.set(0, -0.55, 1.42);
bankGroup.add(archMesh);

// Top arch crown
const crownGeo  = new THREE.TorusGeometry(0.45, 0.055, 14, 60, Math.PI);
const crownMesh = new THREE.Mesh(crownGeo, matGlowBlue.clone());
crownMesh.position.set(0, -0.05, 1.42);
bankGroup.add(crownMesh);

// ── COLUMNS — 6 front, 6 back, 2 sides each ──
const colMat = new THREE.MeshPhysicalMaterial({
  color: 0xe8ecfc, metalness: 0.12, roughness: 0.2,
  transmission: 0.45, thickness: 0.5, ior: 1.35,
  transparent: true, opacity: 0.96
});
const colCapMat = new THREE.MeshStandardMaterial({
  color: 0xcbd4f0, metalness: 0.7, roughness: 0.2
});

function makeColumn(x, z) {
  const cGroup = new THREE.Group();
  // Shaft
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.135, 0.155, 1.65, 20),
    colMat.clone()
  );
  shaft.position.y = 0.0;
  shaft.castShadow = true;
  cGroup.add(shaft);
  // Capital (top)
  const cap = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.12, 0.38),
    colCapMat.clone()
  );
  cap.position.y = 0.88;
  cGroup.add(cap);
  // Base
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.1, 0.36),
    colCapMat.clone()
  );
  base.position.y = -0.88;
  cGroup.add(base);
  // Inner emissive stripe
  const stripe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 1.4, 8),
    matGlowBlue.clone()
  );
  stripe.position.y = 0.0;
  cGroup.add(stripe);
  cGroup.position.set(x, -0.27, z);
  bankGroup.add(cGroup);
  return cGroup;
}

// Front columns (6)
const frontColZ = 1.42;
for (let i = 0; i < 6; i++) {
  const x = -1.65 + i * 0.66;
  makeColumn(x, frontColZ);
}
// Back columns (6)
const backColZ = -1.42;
for (let i = 0; i < 6; i++) {
  const x = -1.65 + i * 0.66;
  makeColumn(x, backColZ);
}
// Side columns (3 each side)
for (let i = 0; i < 3; i++) {
  makeColumn(-1.97, -0.72 + i * 0.72);
  makeColumn( 1.97, -0.72 + i * 0.72);
}

// ── ENTABLATURE (horizontal beam above columns) ──
const entGeo  = new THREE.BoxGeometry(4.3, 0.2, 3.1);
const entMesh = new THREE.Mesh(entGeo, matTempleMetal.clone());
entMesh.position.y = 0.62;
entMesh.castShadow = true;
bankGroup.add(entMesh);

// Emissive top strip on entablature
const entGlowGeo  = new THREE.BoxGeometry(4.32, 0.04, 3.12);
const entGlowMesh = new THREE.Mesh(entGlowGeo, matEdgeGlow.clone());
entGlowMesh.position.y = 0.73;
bankGroup.add(entGlowMesh);

// ── PEDIMENT (triangular gable roof) ──
// Built from two angled slabs + ridge
const pedGeo  = new THREE.CylinderGeometry(0, 2.4, 0.95, 4, 1);
const pedMatl = new THREE.MeshPhysicalMaterial({
  color: 0xe2e8fa, metalness: 0.15, roughness: 0.22,
  transmission: 0.4, thickness: 0.6, ior: 1.3,
  transparent: true, opacity: 0.94
});
const pedMesh = new THREE.Mesh(pedGeo, pedMatl);
pedMesh.rotation.y  = Math.PI / 4;
pedMesh.position.y  = 1.1;
pedMesh.scale.z     = 1.4;
pedMesh.castShadow  = true;
bankGroup.add(pedMesh);

// Roof ridge emissive
const ridgeMat = new THREE.MeshStandardMaterial({
  color: 0x6688ff, emissive: 0x5577ff, emissiveIntensity: 3.2
});
const ridgeGeo  = new THREE.BoxGeometry(4.0, 0.045, 0.045);
const ridgeMesh = new THREE.Mesh(ridgeGeo, ridgeMat);
ridgeMesh.position.y = 1.54;
bankGroup.add(ridgeMesh);

// Pediment glow edge lines
const pedEdgeMat = new THREE.MeshStandardMaterial({
  color: 0x7799ff, emissive: 0x6688ff, emissiveIntensity: 2.5,
  transparent: true, opacity: 0.85
});
// Front slope
const slopeFL = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.04, 0.04), pedEdgeMat.clone());
slopeFL.position.set(-0.95, 1.22,  1.55);
slopeFL.rotation.z = -0.345;
bankGroup.add(slopeFL);
const slopeFR = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.04, 0.04), pedEdgeMat.clone());
slopeFR.position.set( 0.95, 1.22,  1.55);
slopeFR.rotation.z =  0.345;
bankGroup.add(slopeFR);
// Back slope
const slopeBL = slopeFL.clone(); slopeBL.position.z = -1.55; bankGroup.add(slopeBL);
const slopeBR = slopeFR.clone(); slopeBR.position.z = -1.55; bankGroup.add(slopeBR);

// ── ₹ MEDALLION in pediment center ──
const medGroup = new THREE.Group();
medGroup.position.set(0, 1.08, 1.57);
bankGroup.add(medGroup);

// Outer circle ring
const medRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.32, 0.06, 16, 80),
  new THREE.MeshStandardMaterial({
    color: 0x5577ff, emissive: 0x4466ff, emissiveIntensity: 3.5,
    metalness: 0.1, roughness: 0.25
  })
);
medGroup.add(medRing);

// Inner disc
const medDisc = new THREE.Mesh(
  new THREE.CircleGeometry(0.25, 50),
  new THREE.MeshStandardMaterial({
    color: 0xd0d8ff, emissive: 0x3344cc, emissiveIntensity: 0.8,
    transparent: true, opacity: 0.75
  })
);
medGroup.add(medDisc);

// ₹ symbol inside
const rupMat = new THREE.MeshStandardMaterial({
  color: 0x4f6ef7, emissive: 0x4060ff, emissiveIntensity: 3.8
});
const rupArch = new THREE.Mesh(
  new THREE.TorusGeometry(0.1, 0.024, 14, 60, Math.PI),
  rupMat.clone()
);
rupArch.rotation.z = Math.PI / 2;
rupArch.position.set(0, 0.02, 0.01);
medGroup.add(rupArch);

for (let i = 0; i < 2; i++) {
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.022, 0.022),
    rupMat.clone()
  );
  bar.position.set(0, 0.06 - i * 0.08, 0.01);
  medGroup.add(bar);
}
const rupStem = new THREE.Mesh(
  new THREE.BoxGeometry(0.022, 0.26, 0.022),
  rupMat.clone()
);
rupStem.position.set(-0.05, -0.04, 0.01);
medGroup.add(rupStem);

// ── BEACON ANTENNA on roof peak ──
const beaconMat = new THREE.MeshStandardMaterial({
  color: 0x3344ff, emissive: 0x4466ff, emissiveIntensity: 3.0
});
const beacon = new THREE.Mesh(
  new THREE.CylinderGeometry(0.03, 0.03, 0.45, 10),
  beaconMat
);
beacon.position.y = 1.79;
bankGroup.add(beacon);

// Beacon orb
const beaconOrb = new THREE.Mesh(
  new THREE.SphereGeometry(0.07, 16, 16),
  new THREE.MeshStandardMaterial({
    color: 0x6688ff, emissive: 0x5577ff, emissiveIntensity: 4.5
  })
);
beaconOrb.position.y = 2.04;
bankGroup.add(beaconOrb);

// Beacon halo rings
for (let i = 0; i < 2; i++) {
  const bHaloGeo = new THREE.TorusGeometry(0.14 + i * 0.1, 0.018, 8, 60);
  const bHaloMat = new THREE.MeshStandardMaterial({
    color: 0x88aaff, emissive: 0x6688ff, emissiveIntensity: 3.0 - i,
    transparent: true, opacity: 0.8 - i * 0.25
  });
  const bHalo = new THREE.Mesh(bHaloGeo, bHaloMat);
  bHalo.rotation.x = Math.PI / 2;
  bHalo.position.y = 2.04;
  bankGroup.add(bHalo);
}

// ── FLOATING DATA PANELS (sides — like holographic banners) ──
const panelMat = new THREE.MeshStandardMaterial({
  color: 0x8899ff, emissive: 0x5566ee, emissiveIntensity: 1.2,
  transparent: true, opacity: 0.0  // controlled per page
});
const panelGeo = new THREE.PlaneGeometry(0.8, 0.5);
const panels   = [];
for (let i = 0; i < 3; i++) {
  const p = new THREE.Mesh(panelGeo, panelMat.clone());
  const a = (i / 3) * Math.PI * 2 + Math.PI / 6;
  p.position.set(Math.cos(a) * 2.9, 0.1 + i * 0.2, Math.sin(a) * 2.9);
  p.lookAt(0, 0.2, 0);
  scene.add(p);
  panels.push(p);
}

bankGroup.position.set(0, 0.6, 0);

// ─── MULTI-LAYER STEPPED PLATFORM (matching reference) ────────────────
const platformGroup = new THREE.Group();
scene.add(platformGroup);

// ── Three stepped circular tiers (wide base → narrow top) ──
const tierData = [
  { r: 4.4, h: 0.42, y: -2.6, mat: { color: 0xe0e5f5, metalness: 0.35, roughness: 0.45 } },
  { r: 3.5, h: 0.38, y: -2.2, mat: { color: 0xd8dff2, metalness: 0.40, roughness: 0.40 } },
  { r: 2.6, h: 0.32, y: -1.88, mat: { color: 0xcdd4ef, metalness: 0.45, roughness: 0.35 } }
];

const tierMeshes = tierData.map(td => {
  const tGeo  = new THREE.CylinderGeometry(td.r, td.r + 0.06, td.h, 80);
  const tMat  = new THREE.MeshStandardMaterial(td.mat);
  const tMesh = new THREE.Mesh(tGeo, tMat);
  tMesh.position.y = td.y;
  tMesh.castShadow = true; tMesh.receiveShadow = true;
  platformGroup.add(tMesh);
  return tMesh;
});

// ── Glowing ring on each tier ──
const ringGlowData = [
  { r: 4.3,  th: 0.07, y: -2.38, emissive: 0x5577ff, ei: 2.8, speed:  0.35 },
  { r: 3.42, th: 0.07, y: -2.01, emissive: 0x7755ee, ei: 2.5, speed: -0.28 },
  { r: 2.52, th: 0.06, y: -1.72, emissive: 0x4466ee, ei: 3.2, speed:  0.55 }
];
const holoMat = new THREE.MeshStandardMaterial({
  color: 0x7799ff, emissive: 0x5566ff, emissiveIntensity: 2.2,
  transparent: true, opacity: 0.75
});
const glowRings = ringGlowData.map(rd => {
  const rGeo = new THREE.TorusGeometry(rd.r, rd.th, 16, 120);
  const rMat = new THREE.MeshStandardMaterial({
    color: 0x88aaff, emissive: rd.emissive,
    emissiveIntensity: rd.ei,
    transparent: true, opacity: 0.88
  });
  const rMesh = new THREE.Mesh(rGeo, rMat);
  rMesh.rotation.x = Math.PI / 2;
  rMesh.position.y = rd.y;
  rMesh._speed     = rd.speed;
  platformGroup.add(rMesh);
  return rMesh;
});

// ── Connector nodes (bronze-like cylinders around rings — like the image) ──
const connectorMat = new THREE.MeshStandardMaterial({
  color: 0xb8c0e0, metalness: 0.85, roughness: 0.22
});
const connGlowMat  = new THREE.MeshStandardMaterial({
  color: 0x6688ff, emissive: 0x4466ff, emissiveIntensity: 2.5,
  transparent: true, opacity: 0.9
});

ringGlowData.forEach((rd, ri) => {
  const count = [8, 8, 6][ri];
  for (let i = 0; i < count; i++) {
    const a    = (i / count) * Math.PI * 2;
    const cGrp = new THREE.Group();
    cGrp.position.set(
      Math.cos(a) * rd.r, rd.y, Math.sin(a) * rd.r
    );
    // Main cylinder connector
    const cyl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.28, 12),
      connectorMat.clone()
    );
    cyl.castShadow = true;
    cGrp.add(cyl);
    // Glow inner dot
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 12, 12),
      connGlowMat.clone()
    );
    dot.position.y = 0.16;
    cGrp.add(dot);
    // Small hook arm (like the curved connectors in the image)
    const hookGeo = new THREE.TorusGeometry(0.18, 0.025, 8, 40, Math.PI / 2);
    const hook    = new THREE.Mesh(hookGeo, connectorMat.clone());
    hook.rotation.y = a + Math.PI;
    hook.position.y = -0.07;
    cGrp.add(hook);
    platformGroup.add(cGrp);
  }
});

// ── Top holographic floating ring (just above platform, below bank) ──
const topHoloGeo  = new THREE.TorusGeometry(1.9, 0.045, 10, 120);
const topHoloMesh = new THREE.Mesh(topHoloGeo, holoMat);
topHoloMesh.rotation.x = Math.PI / 2;
topHoloMesh.position.y = -1.42;
platformGroup.add(topHoloMesh);

// ── Outer accent ring ──
const accentMat = new THREE.MeshStandardMaterial({
  color: 0x8899ff, emissive: 0x5566cc, emissiveIntensity: 1.8,
  transparent: true, opacity: 0.6
});
const accentRing = new THREE.Mesh(
  new THREE.TorusGeometry(4.2, 0.045, 8, 120),
  accentMat
);
accentRing.rotation.x = Math.PI / 2;
accentRing.position.y = -2.59;
platformGroup.add(accentRing);

// Convenience aliases (used in render loop from old code)
const glassRing = glowRings[0];
const metRing   = glowRings[1];
const holoRing  = glowRings[2];



// ─── PARTICLES ────────────────────────────────────────────────────────
const PARTICLE_COUNT = 2000;
const pPositions    = new Float32Array(PARTICLE_COUNT * 3);
const pTargets      = new Float32Array(PARTICLE_COUNT * 3);
const pPhases       = new Float32Array(PARTICLE_COUNT);
const pSpeeds       = new Float32Array(PARTICLE_COUNT);

const pGeo = new THREE.BufferGeometry();
for (let i = 0; i < PARTICLE_COUNT; i++) {
  pPositions[i * 3]     = (Math.random() - 0.5) * 40;
  pPositions[i * 3 + 1] = (Math.random() - 0.5) * 30;
  pPositions[i * 3 + 2] = (Math.random() - 0.5) * 40;
  pTargets[i * 3]       = (Math.random() - 0.5) * 3.5;
  pTargets[i * 3 + 1]   = (Math.random() - 0.5) * 3.5;
  pTargets[i * 3 + 2]   = (Math.random() - 0.5) * 1.8;
  pPhases[i]            = Math.random() * Math.PI * 2;
  pSpeeds[i]            = 0.4 + Math.random() * 0.8;
}
pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));

const pMat = new THREE.PointsMaterial({
  color: 0x5577ff, size: 0.07, transparent: true, opacity: 0.0,
  sizeAttenuation: true, depthWrite: false
});
const particles = new THREE.Points(pGeo, pMat);
scene.add(particles);

// ─── SHIELD (Page 2) ──────────────────────────────────────────────────
const shieldGeo = new THREE.SphereGeometry(3.8, 64, 64);
const shieldMat = new THREE.MeshPhysicalMaterial({
  color: 0x88aaff, emissive: 0x2244cc, emissiveIntensity: 0.25,
  metalness: 0.0, roughness: 0.0,
  transmission: 0.6, thickness: 1.0, ior: 1.3,
  transparent: true, opacity: 0.0, side: THREE.DoubleSide,
  wireframe: false
});
const shield     = new THREE.Mesh(shieldGeo, shieldMat);
shield.renderOrder = 2;
scene.add(shield);

// Hex grid on shield
const hexGeo = new THREE.SphereGeometry(3.82, 24, 24);
const hexMat = new THREE.MeshBasicMaterial({
  color: 0x8899ff, wireframe: true,
  transparent: true, opacity: 0.0
});
const hexWire = new THREE.Mesh(hexGeo, hexMat);
scene.add(hexWire);

// Lock symbol (Page 2)
const lockGroup = new THREE.Group();
const lockBody  = new THREE.Mesh(
  new THREE.BoxGeometry(0.7, 0.55, 0.2),
  new THREE.MeshStandardMaterial({ color: 0x4466ff, emissive: 0x3355ff, emissiveIntensity: 2.0 })
);
const lockArch = new THREE.Mesh(
  new THREE.TorusGeometry(0.2, 0.07, 12, 32, Math.PI),
  new THREE.MeshStandardMaterial({ color: 0x4466ff, emissive: 0x3355ff, emissiveIntensity: 2.0 })
);
lockArch.position.set(0, 0.32, 0);
lockGroup.add(lockBody, lockArch);
lockGroup.position.set(0, 2.0, 3.0);
lockGroup.scale.set(0, 0, 0);
scene.add(lockGroup);

// ─── SCAN RING (Page 3) ───────────────────────────────────────────────
const scanRingGeo = new THREE.TorusGeometry(2.8, 0.06, 12, 120);
const scanMat     = new THREE.MeshStandardMaterial({
  color: 0x66aaff, emissive: 0x4488ff, emissiveIntensity: 3.2,
  transparent: true, opacity: 0.0
});
const scanRing = new THREE.Mesh(scanRingGeo, scanMat);
scene.add(scanRing);

// Scan glow plane (moving scan line)
const scanPlaneGeo = new THREE.PlaneGeometry(8, 0.15);
const scanPlaneMat = new THREE.MeshBasicMaterial({
  color: 0x88ccff, transparent: true, opacity: 0.0, side: THREE.DoubleSide
});
const scanPlane = new THREE.Mesh(scanPlaneGeo, scanPlaneMat);
scene.add(scanPlane);

// ─── AI ORB (Page 5) ──────────────────────────────────────────────────
const orbGeo  = new THREE.SphereGeometry(0.38, 64, 64);
const orbMat  = new THREE.MeshPhysicalMaterial({
  color: 0x9977ff, emissive: 0x7755ee, emissiveIntensity: 2.5,
  metalness: 0.0, roughness: 0.05,
  transmission: 0.3, thickness: 0.5,
  transparent: true, opacity: 0.0
});
const aiOrb = new THREE.Mesh(orbGeo, orbMat);
aiOrb.position.set(3, 1.5, 2);
scene.add(aiOrb);

// Orb halo ring
const orbHaloGeo = new THREE.TorusGeometry(0.55, 0.025, 8, 80);
const orbHaloMat = new THREE.MeshStandardMaterial({
  color: 0x8866ff, emissive: 0x9977ff, emissiveIntensity: 2.8,
  transparent: true, opacity: 0.0
});
const orbHalo = new THREE.Mesh(orbHaloGeo, orbHaloMat);
aiOrb.add(orbHalo);

// Neural network nodes
const neuralNodes = [];
const neuralLines = [];
for (let i = 0; i < 14; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi   = Math.random() * Math.PI;
  const r     = 2.0 + Math.random() * 2.5;
  const nGeo  = new THREE.SphereGeometry(0.065, 10, 10);
  const nMat  = new THREE.MeshStandardMaterial({
    color: 0x8899ff, emissive: 0x5566ff, emissiveIntensity: 0.0,
    transparent: true, opacity: 0.0
  });
  const node = new THREE.Mesh(nGeo, nMat);
  node.position.set(
    Math.sin(phi) * Math.cos(theta) * r,
    Math.cos(phi) * r * 0.6,
    Math.sin(phi) * Math.sin(theta) * r
  );
  scene.add(node);
  neuralNodes.push(node);
}

// ─── NETWORK NODES (Page 6) ───────────────────────────────────────────
const netNodes   = [];
const netLineArr = [];
for (let i = 0; i < 22; i++) {
  const nGeo = new THREE.SphereGeometry(0.1, 12, 12);
  const nMat = new THREE.MeshStandardMaterial({
    color: 0x6688ff, emissive: 0x4466dd, emissiveIntensity: 0.0,
    transparent: true, opacity: 0.0
  });
  const n = new THREE.Mesh(nGeo, nMat);
  n.position.set(
    (Math.random() - 0.5) * 22,
    (Math.random() - 0.5) * 12,
    (Math.random() - 0.5) * 22
  );
  scene.add(n);
  netNodes.push(n);
}

// ─── DATA STREAM PARTICLES (Pages 4, 6) ───────────────────────────────
const streamCount   = 500;
const streamPos     = new Float32Array(streamCount * 3);
const streamGeo     = new THREE.BufferGeometry();
for (let i = 0; i < streamCount; i++) {
  const a = (i / streamCount) * Math.PI * 2 * 6;
  streamPos[i * 3]     = Math.cos(a) * (1.8 + (i % 3) * 0.5);
  streamPos[i * 3 + 1] = -1.4 + (i / streamCount) * 2.8;
  streamPos[i * 3 + 2] = Math.sin(a) * (1.8 + (i % 3) * 0.5);
}
streamGeo.setAttribute('position', new THREE.BufferAttribute(streamPos, 3));
const streamMat = new THREE.PointsMaterial({
  color: 0x88aaff, size: 0.05, transparent: true, opacity: 0.0,
  sizeAttenuation: true, depthWrite: false
});
const dataStream = new THREE.Points(streamGeo, streamMat);
scene.add(dataStream);

// ─── GROUND GRID (subtle) ─────────────────────────────────────────────
const gridHelper = new THREE.GridHelper(30, 30, 0x99aacc, 0xbbccee);
gridHelper.material.transparent = true;
gridHelper.material.opacity     = 0.0;
gridHelper.position.y           = -1.7;
scene.add(gridHelper);


// ─── STATE ────────────────────────────────────────────────────────────
let clock = new THREE.Clock();
let t = 0;
let stage = 2; // starts at stage 2

// ─── INIT: everything hidden ──────────────────────────────────────────
bankGroup.scale.set(0, 0, 0);
bankGroup.position.y = 0.6;
platformGroup.position.y = -8;
shieldMat.opacity  = 0;
hexMat.opacity     = 0;
lockGroup.scale.set(0, 0, 0);
pMat.opacity       = 0;
gridHelper.material.opacity = 0;

// ─── CAMERA at Stage 1 position (same for both stages) ───────────────
// Stage 1 camera: slightly pulled back, centred
camera.position.set(0, 2.2, 12);
camera.lookAt(0, 0, 0);

// ─── STAGE 2 — Security shield appears first ──────────────────────────
function runStage2() {
  stage = 2;

  // Platform rises into view
  gsap.to(platformGroup.position, { y: 0, duration: 1.8, ease: 'expo.out', delay: 0.1 });

  // Grid
  gsap.to(gridHelper.material, { opacity: 0.18, duration: 2.0, delay: 0.5 });

  // Shield & hex wireframe expand in
  gsap.to(shieldMat, { opacity: 0.30, duration: 1.6, ease: 'power2.out', delay: 0.4 });
  gsap.to(hexMat,    { opacity: 0.20, duration: 1.8, ease: 'power2.out', delay: 0.6 });

  // Particles burst
  pMat.opacity = 0;
  gsap.to(pMat, {
    opacity: 0.4, duration: 0.9, delay: 0.5,
    onComplete: () => gsap.to(pMat, { opacity: 0.12, duration: 1.4, delay: 0.4 })
  });

  // Lock pops in then fades
  gsap.to(lockGroup.scale, { x: 1, y: 1, z: 1, duration: 0.7, ease: 'back.out(2)', delay: 1.0 });
  gsap.to(lockGroup.scale, { x: 0, y: 0, z: 0, duration: 0.5, ease: 'power2.in', delay: 2.2 });

  // After 2.5s, cross-fade to stage 1
  setTimeout(crossFadeToStage1, 2500);
}

// ─── CROSS-FADE: Stage 2 → Stage 1 ───────────────────────────────────
function crossFadeToStage1() {
  // Fade out shield layer
  gsap.to(shieldMat, { opacity: 0, duration: 1.4, ease: 'power2.in' });
  gsap.to(hexMat,    { opacity: 0, duration: 1.2, ease: 'power2.in' });
  gsap.to(pMat,      { opacity: 0, duration: 1.0 });
  gsap.to(lockGroup.scale, { x: 0, y: 0, z: 0, duration: 0.4 });

  // Simultaneously fade in bank (Stage 1 elements)
  // Platform already in place; just activate bank building
  gsap.to(bankGroup.scale, {
    x: 1, y: 1, z: 1, duration: 1.5, ease: 'back.out(1.3)', delay: 0.3
  });

  // Energy activate
  gsap.to(ptL1, { intensity: 4.5, duration: 2.0, ease: 'power1.inOut', delay: 0.5 });
  gsap.to(holoMat, { emissiveIntensity: 2.8, duration: 2.0, delay: 0.4 });

  // Boost grid opacity
  gsap.to(gridHelper.material, { opacity: 0.22, duration: 1.5, delay: 0.6 });

  stage = 1;
}

// ─── RENDER LOOP ──────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  t += dt;

  // Bank float + slow rotation once visible
  if (bankGroup.scale.x > 0.05) {
    bankGroup.position.y = 0.6 + Math.sin(t * 0.8) * 0.06;
    bankGroup.rotation.y += dt * 0.12;
  }

  // Platform ring rotations (always spin)
  glassRing.rotation.z  += dt * 0.28;
  metRing.rotation.z    -= dt * 0.18;
  holoRing.rotation.z   += dt * 0.55;
  accentRing.rotation.z -= dt * 0.08;
  glassRing.rotation.z  += dt * 0.3;
  metRing.rotation.z    -= dt * 0.2;

  // Stage 2: shield slow spin
  if (stage === 2) {
    hexWire.rotation.y += dt * 0.14;
    shield.rotation.y  += dt * 0.07;
  }

  // Particle drift
  if (pMat.opacity > 0.01) {
    const pos = pGeo.attributes.position.array;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3 + 1] += Math.sin(t * pSpeeds[i] + pPhases[i]) * 0.003;
      pos[i * 3]     += Math.cos(t * pSpeeds[i] * 0.5 + pPhases[i]) * 0.002;
    }
    pGeo.attributes.position.needsUpdate = true;
  }

  // Beacon breathing glow
  beacon.position.y = 2.08 + Math.sin(t * 2.2) * 0.018;

  renderer.render(scene, camera);
}

// ─── START ────────────────────────────────────────────────────────────
animate();
runStage2();
