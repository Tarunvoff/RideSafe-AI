import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';

const CANVAS = 2048;
const SCALE = 2.4;
const CENTER = CANVAS / 2;
const NORTH_HEADING_RAD = 0;

const MATTE_BLACK = '#13161a';
const MATTE_BLACK_2 = '#1a1e24';
const MATTE_BLACK_3 = '#222833';
const YELLOW = '#f4c015';
const YELLOW_DARK = '#d9a700';
const GRAY = '#3d4552';

const root = new THREE.Object3D();
root.rotation.y = NORTH_HEADING_RAD;

const layers = {
  shadow: [],
  wheels: [],
  frame: [],
  details: [],
  rider: [],
  cargo: [],
};

function worldToSvg(point) {
  return {
    x: CENTER + point.x * SCALE,
    y: CENTER + point.z * SCALE,
  };
}

function makeNode(x = 0, z = 0, rotation = 0) {
  const node = new THREE.Object3D();
  node.position.set(x, 0, z);
  node.rotation.y = rotation;
  root.add(node);
  return node;
}

function rectPolygon(node, width, length) {
  const halfW = width / 2;
  const halfL = length / 2;
  const local = [
    new THREE.Vector3(-halfW, 0, -halfL),
    new THREE.Vector3(halfW, 0, -halfL),
    new THREE.Vector3(halfW, 0, halfL),
    new THREE.Vector3(-halfW, 0, halfL),
  ];

  return local.map((p) => {
    const world = node.localToWorld(p.clone());
    return worldToSvg(world);
  });
}

function polygonToPath(points) {
  return `M ${points.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' L ')} Z`;
}

function pushRect(layer, node, width, length, style) {
  const points = rectPolygon(node, width, length);
  layers[layer].push(`<path d="${polygonToPath(points)}" ${style} />`);
}

function pushEllipse(layer, node, rx, ry, style) {
  const center = worldToSvg(node.getWorldPosition(new THREE.Vector3()));
  layers[layer].push(`<ellipse cx="${center.x.toFixed(2)}" cy="${center.y.toFixed(2)}" rx="${(rx * SCALE).toFixed(2)}" ry="${(ry * SCALE).toFixed(2)}" ${style} />`);
}

function pushRoundedRect(layer, node, width, length, radius, style) {
  const points = rectPolygon(node, width, length);
  const path = polygonToPath(points);
  layers[layer].push(`<path d="${path}" ${style} stroke-linejoin="round" stroke-linecap="round" />`);

  if (radius > 0) {
    const center = worldToSvg(node.getWorldPosition(new THREE.Vector3()));
    layers[layer].push(`<ellipse cx="${center.x.toFixed(2)}" cy="${center.y.toFixed(2)}" rx="${(radius * SCALE).toFixed(2)}" ry="${(radius * SCALE).toFixed(2)}" fill="none" opacity="0" />`);
  }
}

function buildScooter() {
  const body = makeNode(0, 20, 0);
  pushRoundedRect('frame', body, 150, 560, 16, `fill="url(#bodyShade)" stroke="#0e1116" stroke-width="4"`);

  const deck = makeNode(0, 70, 0);
  pushRoundedRect('frame', deck, 125, 350, 12, `fill="${MATTE_BLACK_2}" stroke="#2b3340" stroke-width="2.5"`);

  const frontNose = makeNode(0, -178, 0);
  pushRoundedRect('frame', frontNose, 112, 165, 12, `fill="${MATTE_BLACK_3}" stroke="#2a3240" stroke-width="2"`);

  const frontWheel = makeNode(0, -360, 0);
  pushRoundedRect('wheels', frontWheel, 84, 122, 8, `fill="#0b0d11" stroke="#2f3744" stroke-width="2.5"`);

  const rearWheel = makeNode(0, 390, 0);
  pushRoundedRect('wheels', rearWheel, 88, 130, 8, `fill="#0b0d11" stroke="#2f3744" stroke-width="2.5"`);

  const frontFender = makeNode(0, -292, 0);
  pushRoundedRect('details', frontFender, 90, 70, 10, `fill="#2a313d" stroke="#4a5566" stroke-width="2"`);

  const rearRack = makeNode(0, 250, 0);
  pushRoundedRect('details', rearRack, 144, 56, 8, `fill="#242b37" stroke="#3f4a5c" stroke-width="2"`);

  const handlebarCore = makeNode(0, -246, 0);
  pushRoundedRect('details', handlebarCore, 180, 24, 6, `fill="#242a35" stroke="#3f4958" stroke-width="2"`);

  const leftGrip = makeNode(-132, -244, 0);
  pushRoundedRect('details', leftGrip, 42, 20, 4, `fill="#11151b" stroke="#343d4c" stroke-width="1.8"`);

  const rightGrip = makeNode(132, -244, 0);
  pushRoundedRect('details', rightGrip, 42, 20, 4, `fill="#11151b" stroke="#343d4c" stroke-width="1.8"`);

  const leftMirrorStem = makeNode(-148, -278, -0.4);
  pushRect('details', leftMirrorStem, 12, 44, `fill="#2f3845" stroke="#4b576a" stroke-width="1.5"`);
  const rightMirrorStem = makeNode(148, -278, 0.4);
  pushRect('details', rightMirrorStem, 12, 44, `fill="#2f3845" stroke="#4b576a" stroke-width="1.5"`);

  const leftMirror = makeNode(-170, -312, 0);
  pushEllipse('details', leftMirror, 26, 20, `fill="#1a202a" stroke="#627086" stroke-width="2"`);
  const rightMirror = makeNode(170, -312, 0);
  pushEllipse('details', rightMirror, 26, 20, `fill="#1a202a" stroke="#627086" stroke-width="2"`);

  const seat = makeNode(0, 130, 0);
  pushRoundedRect('details', seat, 86, 196, 14, `fill="url(#seatTexture)" stroke="#2f3948" stroke-width="2"`);

  for (let i = -2; i <= 2; i += 1) {
    const stitch = makeNode(0, 130 + i * 28, 0);
    pushRect('details', stitch, 58, 2, `fill="#6d7788" opacity="0.48"`);
  }

  const helmet = makeNode(0, -118, 0);
  pushEllipse('rider', helmet, 52, 50, `fill="#131920" stroke="#4a5667" stroke-width="2.5"`);
  const helmetVent = makeNode(0, -124, 0);
  pushRoundedRect('rider', helmetVent, 42, 10, 2, `fill="#2f3a4b" opacity="0.8"`);

  const torso = makeNode(0, -26, 0);
  pushRoundedRect('rider', torso, 112, 166, 14, `fill="#121820" stroke="#3d4656" stroke-width="2"`);

  const stripeCenter = makeNode(0, -26, 0);
  pushRoundedRect('rider', stripeCenter, 28, 150, 6, `fill="${YELLOW}"`);

  const stripeLeft = makeNode(-26, -28, -0.12);
  pushRect('rider', stripeLeft, 20, 130, `fill="${YELLOW}"`);

  const stripeRight = makeNode(26, -28, 0.12);
  pushRect('rider', stripeRight, 20, 130, `fill="${YELLOW}"`);

  const leftArm = makeNode(-68, -58, -0.3);
  pushRoundedRect('rider', leftArm, 26, 86, 8, `fill="#161d27" stroke="#3b4657" stroke-width="1.6"`);

  const rightArm = makeNode(68, -58, 0.3);
  pushRoundedRect('rider', rightArm, 26, 86, 8, `fill="#161d27" stroke="#3b4657" stroke-width="1.6"`);

  const cargoBase = makeNode(0, 296, 0);
  pushRoundedRect('cargo', cargoBase, 180, 172, 10, `fill="${YELLOW_DARK}" stroke="#8f6e09" stroke-width="3"`);

  const cargoLid = makeNode(0, 286, 0);
  pushRoundedRect('cargo', cargoLid, 186, 84, 8, `fill="url(#cargoLidPattern)" stroke="#9d790b" stroke-width="2.4"`);

  const cargoLatch = makeNode(0, 328, 0);
  pushRoundedRect('cargo', cargoLatch, 34, 16, 2, `fill="#2d343f" stroke="#596679" stroke-width="1.8"`);

  const frameShadow = makeNode(0, 40, 0);
  pushEllipse('shadow', frameShadow, 90, 320, `fill="#000" opacity="0.19" filter="url(#softBlur)"`);

  const wheelShadowFront = makeNode(0, -360, 0);
  pushEllipse('shadow', wheelShadowFront, 46, 70, `fill="#000" opacity="0.12" filter="url(#softBlur)"`);

  const wheelShadowRear = makeNode(0, 390, 0);
  pushEllipse('shadow', wheelShadowRear, 50, 74, `fill="#000" opacity="0.12" filter="url(#softBlur)"`);

  const cargoShadow = makeNode(0, 304, 0);
  pushEllipse('shadow', cargoShadow, 92, 90, `fill="#000" opacity="0.13" filter="url(#softBlur)"`);
}

buildScooter();

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}" fill="none">
  <defs>
    <linearGradient id="bodyShade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#212732"/>
      <stop offset="46%" stop-color="#11151b"/>
      <stop offset="100%" stop-color="#232a36"/>
    </linearGradient>
    <pattern id="cargoLidPattern" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="12" height="12" fill="#f6c926"/>
      <path d="M 0 0 L 0 12" stroke="#c79a0f" stroke-width="2" opacity="0.45"/>
    </pattern>
    <pattern id="seatTexture" width="8" height="8" patternUnits="userSpaceOnUse">
      <rect width="8" height="8" fill="#12161d"/>
      <path d="M0 0 L8 8 M8 0 L0 8" stroke="#2a313d" stroke-width="0.8" opacity="0.55"/>
    </pattern>
    <filter id="softBlur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4.5" />
    </filter>
  </defs>
  ${layers.shadow.join('\n  ')}
  ${layers.wheels.join('\n  ')}
  ${layers.frame.join('\n  ')}
  ${layers.details.join('\n  ')}
  ${layers.rider.join('\n  ')}
  ${layers.cargo.join('\n  ')}
</svg>
`;

const outPath = path.resolve('public/assets/scooter-topdown.svg');
fs.writeFileSync(outPath, svg, 'utf8');
console.log(`Generated ${outPath}`);
