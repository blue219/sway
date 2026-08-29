import * as THREE from 'three'

type CharacterRuntime = {
  nodes: Record<string, THREE.Object3D>
  colliders: Record<string, { type: 'capsule' | 'box'; size: [number, number, number] }>
  inferredRegions: Record<string, number>
}

export type StandingMarchModel = {
  root: THREE.Group
  update: (elapsedSeconds: number, reduceMotion: boolean) => void
  dispose: () => void
}

const skinColor = 0xe5b38f
const cardiganColor = 0x4f8f3d
const creamColor = 0xf2e7d5
const trouserColor = 0x4e5448
const shoeColor = 0xefe3d2
const soleColor = 0xf7ebdd
const hairColor = 0xd8d1c7

function physicalMaterial(parameters: THREE.MeshPhysicalMaterialParameters) {
  return new THREE.MeshPhysicalMaterial({
    metalness: 0,
    ...parameters,
  })
}

function createTaperedSweep(points: THREE.Vector3[], radii: number[], radialSegments = 10) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal')
  const tubularSegments = Math.max(8, points.length * 5)
  const vertices: number[] = []
  const indices: number[] = []
  const centers = Array.from({ length: tubularSegments + 1 }, (_, index) => curve.getPoint(index / tubularSegments))
  const tangents = Array.from({ length: tubularSegments + 1 }, (_, index) => curve.getTangent(index / tubularSegments).normalize())
  const normals: THREE.Vector3[] = []
  const binormals: THREE.Vector3[] = []

  const seedAxis = Math.abs(tangents[0].y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
  normals[0] = new THREE.Vector3().crossVectors(tangents[0], seedAxis).normalize()
  binormals[0] = new THREE.Vector3().crossVectors(tangents[0], normals[0]).normalize()

  // Parallel-transport the frame so curved locks do not flip at an inflection.
  for (let index = 1; index <= tubularSegments; index += 1) {
    const rotation = new THREE.Quaternion().setFromUnitVectors(tangents[index - 1], tangents[index])
    const normal = normals[index - 1].clone().applyQuaternion(rotation)
    normal.addScaledVector(tangents[index], -normal.dot(tangents[index])).normalize()
    normals[index] = normal
    binormals[index] = new THREE.Vector3().crossVectors(tangents[index], normal).normalize()
  }

  for (let ring = 0; ring <= tubularSegments; ring += 1) {
    const progress = ring / tubularSegments
    const radiusIndex = progress * (radii.length - 1)
    const lower = Math.floor(radiusIndex)
    const upper = Math.min(radii.length - 1, lower + 1)
    const radius = THREE.MathUtils.lerp(radii[lower], radii[upper], radiusIndex - lower)

    for (let segment = 0; segment < radialSegments; segment += 1) {
      const angle = (segment / radialSegments) * Math.PI * 2
      const offset = normals[ring]
        .clone()
        .multiplyScalar(Math.cos(angle) * radius)
        .addScaledVector(binormals[ring], Math.sin(angle) * radius * 0.72)
      const vertex = centers[ring].clone().add(offset)
      vertices.push(vertex.x, vertex.y, vertex.z)
    }
  }

  for (let ring = 0; ring < tubularSegments; ring += 1) {
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const next = (segment + 1) % radialSegments
      const a = ring * radialSegments + segment
      const b = (ring + 1) * radialSegments + segment
      const c = (ring + 1) * radialSegments + next
      const d = ring * radialSegments + next
      indices.push(a, b, d, b, c, d)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function createCardiganPanelGeometry() {
  const shape = new THREE.Shape()
  shape.moveTo(0.08, 0.76)
  shape.bezierCurveTo(0.16, 0.74, 0.26, 0.69, 0.43, 0.64)
  shape.bezierCurveTo(0.53, 0.38, 0.5, -0.45, 0.46, -0.83)
  shape.lineTo(0.04, -0.83)
  shape.bezierCurveTo(0.07, -0.35, 0.09, 0.18, 0.12, 0.48)
  shape.bezierCurveTo(0.15, 0.61, 0.15, 0.69, 0.08, 0.76)
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.025,
    bevelThickness: 0.025,
    curveSegments: 12,
  })
}

function createCardiganBackGeometry() {
  const shape = new THREE.Shape()
  shape.moveTo(-0.46, -0.82)
  shape.bezierCurveTo(-0.5, -0.35, -0.5, 0.35, -0.42, 0.62)
  shape.bezierCurveTo(-0.26, 0.73, -0.12, 0.76, 0, 0.76)
  shape.bezierCurveTo(0.12, 0.76, 0.26, 0.73, 0.42, 0.62)
  shape.bezierCurveTo(0.5, 0.35, 0.5, -0.35, 0.46, -0.82)
  shape.closePath()
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.12,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.025,
    bevelThickness: 0.025,
    curveSegments: 12,
  })
}

export function createStandingMarchElderModel(): StandingMarchModel {
  const root = new THREE.Group()
  root.name = 'standing-march-elder'
  const nodes: Record<string, THREE.Object3D> = { root }
  const materials: THREE.Material[] = []

  const skin = physicalMaterial({ color: skinColor, roughness: 0.62, clearcoat: 0.16, clearcoatRoughness: 0.42 })
  const cheek = physicalMaterial({ color: 0xf0a982, roughness: 0.68 })
  const hair = physicalMaterial({ color: hairColor, roughness: 0.48, sheen: 0.28, sheenColor: 0xffffff, sheenRoughness: 0.72 })
  const hairShadow = physicalMaterial({ color: 0xb9b0a6, roughness: 0.58 })
  const cardigan = physicalMaterial({ color: cardiganColor, roughness: 0.88, sheen: 0.18, sheenColor: 0xddebd4, sheenRoughness: 0.9 })
  const shirt = physicalMaterial({ color: creamColor, roughness: 0.92, sheen: 0.08, sheenColor: 0xffffff, sheenRoughness: 0.95 })
  const trousers = physicalMaterial({ color: trouserColor, roughness: 0.9, sheen: 0.1, sheenColor: 0xbfc5ba, sheenRoughness: 0.95 })
  const shoes = physicalMaterial({ color: shoeColor, roughness: 0.72, clearcoat: 0.05, clearcoatRoughness: 0.65 })
  const soles = physicalMaterial({ color: soleColor, roughness: 0.8 })
  const eyeWhite = physicalMaterial({ color: 0xfff7ec, roughness: 0.16, clearcoat: 0.8, clearcoatRoughness: 0.08 })
  const iris = physicalMaterial({ color: 0x4a2416, roughness: 0.14, clearcoat: 0.9, clearcoatRoughness: 0.07 })
  const pupil = physicalMaterial({ color: 0x140b08, roughness: 0.12, clearcoat: 0.8, clearcoatRoughness: 0.08 })
  const catchlight = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const brow = physicalMaterial({ color: 0x8a7766, roughness: 0.58 })
  const lips = physicalMaterial({ color: 0xb96355, roughness: 0.48 })
  const buttons = physicalMaterial({ color: 0x8a5c3e, roughness: 0.38, clearcoat: 0.18, clearcoatRoughness: 0.35 })
  materials.push(skin, cheek, hair, hairShadow, cardigan, shirt, trousers, shoes, soles, eyeWhite, iris, pupil, catchlight, brow, lips, buttons)

  function group(name: string, parent: THREE.Object3D, position: [number, number, number]) {
    const node = new THREE.Group()
    node.name = name
    node.position.set(...position)
    parent.add(node)
    nodes[name] = node
    return node
  }

  function mesh(
    name: string,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    parent: THREE.Object3D,
    position: [number, number, number] = [0, 0, 0],
    scale: [number, number, number] = [1, 1, 1],
    rotation: [number, number, number] = [0, 0, 0],
  ) {
    const value = new THREE.Mesh(geometry, material)
    value.name = name
    value.position.set(...position)
    value.scale.set(...scale)
    value.rotation.set(...rotation)
    value.castShadow = true
    value.receiveShadow = true
    parent.add(value)
    nodes[name] = value
    return value
  }

  function capsule(name: string, parent: THREE.Object3D, length: number, radius: number, material: THREE.Material) {
    return mesh(
      name,
      new THREE.CapsuleGeometry(radius, Math.max(0.02, length - radius * 2), 8, 18),
      material,
      parent,
      [0, -length / 2, 0],
    )
  }

  const hips = group('pelvis-pivot', root, [0, 2.53, 0])
  mesh('shirt-body', new THREE.SphereGeometry(1, 28, 20), shirt, hips, [0, 0.72, 0], [0.48, 0.88, 0.31])
  mesh('hip-volume', new THREE.SphereGeometry(1, 24, 16), trousers, hips, [0, -0.02, 0], [0.47, 0.3, 0.31])

  const cardiganBody = group('cardigan-body', hips, [0, 0.76, 0.14])
  const panelGeometry = createCardiganPanelGeometry()
  mesh('cardigan-back', createCardiganBackGeometry(), cardigan, cardiganBody, [0, 0, -0.5])
  mesh('cardigan-panel-left', panelGeometry, cardigan, cardiganBody, [0, 0, 0], [1, 1, 1])
  mesh('cardigan-panel-right', panelGeometry, cardigan, cardiganBody, [0, 0, 0], [-1, 1, 1])

  for (const side of [-1, 1]) {
    const placketCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.1, 0.7, 0.16),
      new THREE.Vector3(side * 0.1, 0.2, 0.18),
      new THREE.Vector3(side * 0.08, -0.75, 0.17),
    ])
    mesh(`cardigan-placket-${side < 0 ? 'right' : 'left'}`, new THREE.TubeGeometry(placketCurve, 24, 0.035, 7, false), cardigan, cardiganBody)
  }

  for (const [index, y] of [0.35, 0.05, -0.25, -0.55].entries()) {
    mesh(`cardigan-button-${index + 1}`, new THREE.CylinderGeometry(0.035, 0.035, 0.018, 16), buttons, cardiganBody, [-0.105, y, 0.235], [1, 1, 1], [Math.PI / 2, 0, 0])
  }

  for (const side of [-1, 1]) {
    mesh(`cardigan-pocket-${side < 0 ? 'right' : 'left'}`, new THREE.BoxGeometry(0.23, 0.19, 0.035, 4, 4, 1), cardigan, cardiganBody, [side * 0.27, -0.39, 0.215], [1, 1, 1], [0, 0, side * -0.04])
  }

  for (let rib = 0; rib < 11; rib += 1) {
    const x = -0.43 + rib * 0.086
    mesh(`cardigan-hem-rib-${rib + 1}`, new THREE.BoxGeometry(0.018, 0.075, 0.035), cardigan, cardiganBody, [x, -0.76, 0.215])
  }

  const neck = group('neck-pivot', hips, [0, 1.62, 0])
  capsule('neck', neck, 0.32, 0.12, skin)
  const head = group('head-pivot', neck, [0, 0.12, 0])
  head.scale.setScalar(0.9)
  mesh('head', new THREE.SphereGeometry(1, 36, 26), skin, head, [0, 0.42, 0], [0.48, 0.55, 0.43])
  mesh('left-ear', new THREE.SphereGeometry(1, 20, 14), skin, head, [0.47, 0.43, -0.01], [0.09, 0.16, 0.07])
  mesh('right-ear', new THREE.SphereGeometry(1, 20, 14), skin, head, [-0.47, 0.43, -0.01], [0.09, 0.16, 0.07])

  for (const side of [-1, 1]) {
    const x = side * 0.17
    mesh(`eye-white-${side < 0 ? 'right' : 'left'}`, new THREE.SphereGeometry(1, 24, 18), eyeWhite, head, [x, 0.49, 0.39], [0.135, 0.105, 0.065])
    mesh(`iris-${side < 0 ? 'right' : 'left'}`, new THREE.SphereGeometry(1, 20, 14), iris, head, [x, 0.49, 0.448], [0.064, 0.067, 0.025])
    mesh(`pupil-${side < 0 ? 'right' : 'left'}`, new THREE.SphereGeometry(1, 16, 12), pupil, head, [x, 0.49, 0.468], [0.027, 0.036, 0.013])
    mesh(`catchlight-${side < 0 ? 'right' : 'left'}`, new THREE.SphereGeometry(1, 10, 8), catchlight, head, [x - 0.018, 0.52, 0.482], [0.012, 0.014, 0.008])

    const browCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x - side * 0.085, 0.62, 0.442),
      new THREE.Vector3(x, 0.65, 0.46),
      new THREE.Vector3(x + side * 0.09, 0.615, 0.435),
    ])
    mesh(`brow-${side < 0 ? 'right' : 'left'}`, new THREE.TubeGeometry(browCurve, 12, 0.012, 6, false), brow, head)
    mesh(`cheek-${side < 0 ? 'right' : 'left'}`, new THREE.SphereGeometry(1, 18, 12), cheek, head, [side * 0.24, 0.32, 0.395], [0.11, 0.07, 0.018])
  }

  mesh('nose', new THREE.SphereGeometry(1, 22, 16), skin, head, [0, 0.38, 0.445], [0.08, 0.11, 0.095])
  const smileCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.13, 0.25, 0.437),
    new THREE.Vector3(0, 0.21, 0.465),
    new THREE.Vector3(0.13, 0.25, 0.437),
  ])
  mesh('smile', new THREE.TubeGeometry(smileCurve, 18, 0.012, 7, false), lips, head)

  const hairGroup = group('hair-lock-system', head, [0, 0.43, -0.02])
  mesh('hair-scalp', new THREE.SphereGeometry(1, 30, 22), hairShadow, hairGroup, [0, 0.02, -0.06], [0.55, 0.58, 0.48])
  const hairLocks: Array<{ points: [number, number, number][]; radii: number[] }> = [
    { points: [[-0.02, 0.48, 0.18], [-0.16, 0.5, 0.35], [-0.36, 0.32, 0.39]], radii: [0.12, 0.1, 0.045] },
    { points: [[0.03, 0.48, 0.18], [0.19, 0.48, 0.34], [0.38, 0.3, 0.37]], radii: [0.115, 0.1, 0.045] },
    { points: [[-0.18, 0.4, 0.11], [-0.39, 0.3, 0.25], [-0.49, 0.08, 0.2]], radii: [0.11, 0.09, 0.04] },
    { points: [[0.19, 0.4, 0.1], [0.4, 0.28, 0.23], [0.5, 0.06, 0.17]], radii: [0.11, 0.09, 0.04] },
    { points: [[-0.32, 0.25, 0.02], [-0.48, 0.09, 0.15], [-0.43, -0.12, 0.12]], radii: [0.1, 0.08, 0.035] },
    { points: [[0.34, 0.23, 0.01], [0.49, 0.06, 0.13], [0.42, -0.14, 0.1]], radii: [0.1, 0.08, 0.035] },
    { points: [[-0.34, 0.3, -0.17], [-0.48, 0.1, -0.12], [-0.35, -0.18, -0.1]], radii: [0.11, 0.08, 0.04] },
    { points: [[0.34, 0.29, -0.18], [0.49, 0.08, -0.12], [0.34, -0.2, -0.1]], radii: [0.11, 0.08, 0.04] },
    { points: [[-0.15, 0.42, -0.32], [-0.27, 0.12, -0.43], [-0.18, -0.2, -0.35]], radii: [0.12, 0.09, 0.04] },
    { points: [[0.15, 0.42, -0.32], [0.27, 0.12, -0.43], [0.18, -0.2, -0.35]], radii: [0.12, 0.09, 0.04] },
    // Rear locks sit outside the scalp shell so the inferred back view keeps the curled silhouette.
    { points: [[-0.27, 0.39, -0.47], [-0.4, 0.2, -0.55], [-0.31, -0.09, -0.51]], radii: [0.105, 0.082, 0.038] },
    { points: [[0, 0.47, -0.5], [-0.08, 0.22, -0.6], [0.02, -0.12, -0.55]], radii: [0.115, 0.088, 0.04] },
    { points: [[0.27, 0.39, -0.47], [0.4, 0.2, -0.55], [0.31, -0.09, -0.51]], radii: [0.105, 0.082, 0.038] },
    { points: [[-0.39, 0.23, -0.39], [-0.51, 0.02, -0.46], [-0.38, -0.2, -0.41]], radii: [0.095, 0.072, 0.034] },
    { points: [[0.39, 0.23, -0.39], [0.51, 0.02, -0.46], [0.38, -0.2, -0.41]], radii: [0.095, 0.072, 0.034] },
    { points: [[-0.05, 0.47, 0.2], [-0.14, 0.34, 0.42], [-0.08, 0.17, 0.43]], radii: [0.09, 0.07, 0.03] },
    { points: [[0.08, 0.46, 0.18], [0.17, 0.33, 0.4], [0.1, 0.16, 0.42]], radii: [0.09, 0.07, 0.03] },
  ]
  hairLocks.forEach((lock, index) => {
    const points = lock.points.map(([x, y, z]) => new THREE.Vector3(x, y, z))
    mesh(`hair-lock-${index + 1}`, createTaperedSweep(points, lock.radii), hair, hairGroup)
  })

  const arms: Array<{ side: -1 | 1; shoulder: THREE.Group; elbow: THREE.Group }> = []
  for (const side of [-1, 1] as const) {
    const label = side < 0 ? 'right' : 'left'
    const shoulder = group(`${label}-shoulder-pivot`, hips, [side * 0.58, 1.35, 0.01])
    shoulder.rotation.z = side * 0.12
    capsule(`${label}-upper-sleeve`, shoulder, 0.83, 0.15, cardigan)
    const elbow = group(`${label}-elbow-pivot`, shoulder, [0, -0.75, 0])
    elbow.rotation.x = -2.05
    capsule(`${label}-forearm-sleeve`, elbow, 0.66, 0.135, cardigan)
    mesh(`${label}-cuff`, new THREE.CylinderGeometry(0.145, 0.145, 0.12, 18), cardigan, elbow, [0, -0.59, 0])
    const fist = group(`${label}-fist-pivot`, elbow, [0, -0.67, 0])
    mesh(`${label}-fist`, new THREE.SphereGeometry(1, 22, 16), skin, fist, [0, 0, 0], [0.16, 0.18, 0.14])
    for (let finger = 0; finger < 4; finger += 1) {
      mesh(`${label}-finger-${finger + 1}`, new THREE.SphereGeometry(1, 12, 8), skin, fist, [side * (0.055 - finger * 0.035), -0.02, 0.1], [0.045, 0.075, 0.035])
    }
    arms.push({ side, shoulder, elbow })
  }

  const legs: Array<{ side: -1 | 1; hip: THREE.Group; knee: THREE.Group; foot: THREE.Group }> = []
  for (const side of [-1, 1] as const) {
    const label = side < 0 ? 'right' : 'left'
    const hip = group(`${label}-hip-pivot`, hips, [side * 0.25, -0.1, 0])
    capsule(`${label}-trouser-thigh`, hip, 1.18, 0.22, trousers)
    const knee = group(`${label}-knee-pivot`, hip, [0, -1.1, 0])
    capsule(`${label}-trouser-shin`, knee, 1.16, 0.2, trousers)
    mesh(`${label}-trouser-hem`, new THREE.CylinderGeometry(0.205, 0.205, 0.1, 18), trousers, knee, [0, -1.05, 0])
    mesh(`${label}-ankle`, new THREE.CylinderGeometry(0.095, 0.105, 0.2, 16), skin, knee, [0, -1.16, 0])
    const foot = group(`${label}-foot-pivot`, knee, [0, -1.27, 0.09])
    mesh(`${label}-shoe`, new THREE.CapsuleGeometry(0.16, 0.3, 8, 18), shoes, foot, [0, 0.02, 0.14], [1.38, 0.72, 0.78], [Math.PI / 2, 0, 0])
    mesh(`${label}-sole`, new THREE.CapsuleGeometry(0.17, 0.33, 6, 16), soles, foot, [0, -0.075, 0.14], [1.42, 0.42, 0.8], [Math.PI / 2, 0, 0])
    for (let lace = 0; lace < 3; lace += 1) {
      const y = 0.075 - lace * 0.028
      const z = 0.28 + lace * 0.035
      const laceCurve = new THREE.LineCurve3(new THREE.Vector3(-0.11, y, z), new THREE.Vector3(0.11, y, z + 0.035))
      mesh(`${label}-lace-${lace + 1}`, new THREE.TubeGeometry(laceCurve, 4, 0.012, 5, false), soles, foot)
    }
    legs.push({ side, hip, knee, foot })
  }

  // Keep semantic spec names as runtime aliases while preserving readable implementation names.
  const semanticAliases: Record<string, string> = {
    pelvis: 'pelvis-pivot',
    abdomen: 'shirt-body',
    chest: 'cardigan-body',
    hair: 'hair-lock-system',
    'brow-l': 'brow-left',
    'brow-r': 'brow-right',
    'ear-l': 'left-ear',
    'ear-r': 'right-ear',
    mouth: 'smile',
    'eye-l': 'eye-white-left',
    'eye-r': 'eye-white-right',
    'clavicle-l': 'left-shoulder-pivot',
    'upper-arm-l': 'left-upper-sleeve',
    'forearm-l': 'left-forearm-sleeve',
    'hand-l': 'left-fist',
    'clavicle-r': 'right-shoulder-pivot',
    'upper-arm-r': 'right-upper-sleeve',
    'forearm-r': 'right-forearm-sleeve',
    'hand-r': 'right-fist',
    'thigh-l': 'left-trouser-thigh',
    'shin-l': 'left-trouser-shin',
    'foot-l': 'left-shoe',
    'thigh-r': 'right-trouser-thigh',
    'shin-r': 'right-trouser-shin',
    'foot-r': 'right-shoe',
    'cardigan-placket-l': 'cardigan-placket-left',
    'cardigan-placket-r': 'cardigan-placket-right',
    'cardigan-buttons': 'cardigan-button-1',
    'cardigan-pocket-l': 'cardigan-pocket-left',
    'cardigan-pocket-r': 'cardigan-pocket-right',
    'sleeve-cuff-l': 'left-cuff',
    'sleeve-cuff-r': 'right-cuff',
    'cardigan-hem': 'cardigan-hem-rib-1',
  }
  for (const [semanticName, implementationName] of Object.entries(semanticAliases)) {
    nodes[semanticName] = nodes[implementationName]
  }

  const runtime: CharacterRuntime = {
    nodes,
    colliders: {
      torso: { type: 'capsule', size: [0.55, 1.75, 0.38] },
      head: { type: 'capsule', size: [0.5, 1.05, 0.45] },
      leftLeg: { type: 'capsule', size: [0.23, 2.35, 0.23] },
      rightLeg: { type: 'capsule', size: [0.23, 2.35, 0.23] },
    },
    inferredRegions: { frontFace: 0.93, frontOutfit: 0.95, sideVolumes: 0.55, rearHair: 0.35, rearOutfit: 0.32 },
  }
  root.userData.sculptRuntime = runtime

  function update(elapsedSeconds: number, reduceMotion: boolean) {
    const phase = reduceMotion ? 0 : elapsedSeconds * Math.PI * 1.25
    const wave = Math.sin(phase)
    const leftLift = Math.max(0, wave)
    const rightLift = Math.max(0, -wave)
    const liftBySide = (side: -1 | 1) => (side > 0 ? leftLift : rightLift)

    root.position.y = reduceMotion ? 0 : Math.abs(wave) * 0.025
    root.rotation.z = reduceMotion ? 0 : wave * 0.012
    head.rotation.y = reduceMotion ? 0 : wave * 0.018

    for (const leg of legs) {
      const lift = liftBySide(leg.side)
      leg.hip.rotation.x = -lift * 0.48
      leg.knee.rotation.x = lift * 0.82
      leg.foot.rotation.x = -lift * 0.26
    }

    for (const arm of arms) {
      const counter = arm.side > 0 ? -wave : wave
      arm.shoulder.rotation.x = reduceMotion ? 0 : counter * 0.08
      arm.shoulder.rotation.z = arm.side * 0.12
      arm.elbow.rotation.x = -2.05 + (reduceMotion ? 0 : counter * 0.04)
    }
  }

  function dispose() {
    root.traverse((object) => {
      if (object instanceof THREE.Mesh) object.geometry.dispose()
    })
    materials.forEach((material) => material.dispose())
  }

  update(0, true)
  return { root, update, dispose }
}
