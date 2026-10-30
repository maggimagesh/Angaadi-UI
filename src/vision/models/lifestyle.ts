import {
  CapsuleGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  LatheGeometry,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  Shape,
  SphereGeometry,
  TorusGeometry,
  Vector2,
} from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { uiTexture } from '../textures'
import { makeMaterials, roundedPlane, seat, Tracker, type BuiltModel, type ModelStyle } from './helpers'

const rbox = (t: Tracker, w: number, h: number, d: number, r: number, seg = 5) => t.geo(new RoundedBoxGeometry(w, h, d, seg, r))
const lathe = (t: Tracker, pts: Array<[number, number]>, seg = 64) => t.geo(new LatheGeometry(pts.map(([x, y]) => new Vector2(x, y)), seg))

/* ── home & kitchen: a smart kettle and mug ──────────────────────────────── */

export function buildKitchen(style: ModelStyle): BuiltModel {
  const t = new Tracker()
  const m = makeMaterials(t, style)
  const g = new Group()

  const base = new Mesh(t.geo(new CylinderGeometry(0.6, 0.62, 0.1, 64)), m.dark)
  base.position.y = 0.05
  const baseRing = new Mesh(t.geo(new TorusGeometry(0.55, 0.014, 10, 80)), m.neon)
  baseRing.rotation.x = Math.PI / 2
  baseRing.position.y = 0.105
  g.add(base, baseRing)

  const body = new Mesh(
    lathe(t, [
      [0.0, 0.1],
      [0.46, 0.1],
      [0.5, 0.16],
      [0.52, 0.34],
      [0.5, 0.82],
      [0.44, 1.08],
      [0.36, 1.18],
      [0.3, 1.2],
      [0.0, 1.2],
    ]),
    m.body,
  )
  g.add(body)
  const band = new Mesh(t.geo(new CylinderGeometry(0.512, 0.505, 0.07, 64, 1, true)), m.metal)
  band.position.y = 0.58
  const lit = new Mesh(t.geo(new TorusGeometry(0.506, 0.012, 8, 80)), m.neon2)
  lit.rotation.x = Math.PI / 2
  lit.position.y = 0.46
  g.add(band, lit)

  const lid = new Mesh(t.geo(new SphereGeometry(0.3, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2)), m.metal)
  lid.position.y = 1.2
  lid.scale.y = 0.45
  const knob = new Mesh(t.geo(new SphereGeometry(0.06, 20, 16)), m.neon)
  knob.position.y = 1.36
  g.add(lid, knob)

  const spout = new Mesh(t.geo(new CylinderGeometry(0.09, 0.15, 0.5, 28)), m.body)
  spout.position.set(0.55, 0.95, 0)
  spout.rotation.z = -1.05
  g.add(spout)

  const handle = new Mesh(t.geo(new TorusGeometry(0.4, 0.06, 16, 48, Math.PI * 1.05)), m.metal)
  handle.rotation.z = Math.PI * 0.46
  handle.position.set(-0.48, 0.7, 0)
  const grip = new Mesh(t.geo(new TorusGeometry(0.4, 0.075, 16, 24, Math.PI * 0.45)), m.soft)
  grip.rotation.z = Math.PI * 0.62
  grip.position.set(-0.48, 0.7, 0)
  g.add(handle, grip)

  // temperature readout on the shoulder
  const readout = new Mesh(t.geo(roundedPlane(0.2, 0.09, 0.03)), m.neon)
  readout.position.set(0.0, 0.88, 0.5)
  readout.rotation.x = -0.12
  g.add(readout)

  // a mug beside it
  const mug = new Mesh(t.geo(new CylinderGeometry(0.22, 0.19, 0.3, 40)), m.metal)
  mug.position.set(0.98, 0.15, 0.55)
  const tea = new Mesh(t.geo(new CircleGeometry(0.2, 40)), m.neon)
  tea.rotation.x = -Math.PI / 2
  tea.position.set(0.98, 0.296, 0.55)
  const mugHandle = new Mesh(t.geo(new TorusGeometry(0.1, 0.028, 12, 24, Math.PI)), m.metal)
  mugHandle.rotation.z = -Math.PI / 2
  mugHandle.position.set(1.2, 0.16, 0.55)
  g.add(mug, tea, mugHandle)

  g.rotation.y = -0.45
  const wrap = new Group()
  wrap.add(g)
  return seat(wrap, t)
}

/* ── fashion & lifestyle: sunglasses ─────────────────────────────────────── */

function lensShape(w: number, h: number): Shape {
  const s = new Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + w * 0.1, y + h * 0.04)
  s.bezierCurveTo(x + w * 0.4, y - h * 0.02, x + w * 0.8, y, x + w * 0.96, y + h * 0.18)
  s.bezierCurveTo(x + w * 1.04, y + h * 0.5, x + w * 1.02, y + h * 0.9, x + w * 0.9, y + h)
  s.bezierCurveTo(x + w * 0.6, y + h * 1.02, x + w * 0.2, y + h * 1.0, x + w * 0.05, y + h * 0.9)
  s.bezierCurveTo(x - w * 0.04, y + h * 0.6, x - w * 0.03, y + h * 0.2, x + w * 0.1, y + h * 0.04)
  return s
}

export function buildFashion(style: ModelStyle): BuiltModel {
  const t = new Tracker()
  const m = makeMaterials(t, style)
  const g = new Group()

  const frameMat = t.mat(new MeshPhysicalMaterial({ color: 0x0a0a22, metalness: 0.4, roughness: 0.18, clearcoat: 1, envMapIntensity: 1.4 }))
  const lensMat = t.mat(
    new MeshPhysicalMaterial({
      color: new Color(style.accent).multiplyScalar(0.55),
      metalness: 0.1,
      roughness: 0.04,
      transparent: true,
      opacity: 0.82,
      iridescence: 1,
      iridescenceIOR: 1.6,
      clearcoat: 1,
      envMapIntensity: 2,
    }),
  )

  const w = 0.92
  const h = 0.64
  const outer = lensShape(w, h)
  const hole = lensShape(w * 0.86, h * 0.84)
  outer.holes.push(hole)
  const rimGeo = t.geo(new ExtrudeGeometry(outer, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 4, curveSegments: 24 }))
  const lensGeo = t.geo(new ExtrudeGeometry(lensShape(w * 0.88, h * 0.86), { depth: 0.02, bevelEnabled: false, curveSegments: 24 }))

  for (const side of [-1, 1] as const) {
    const x = side * 0.55
    const rim = new Mesh(rimGeo, frameMat)
    rim.position.set(x, 0, -0.035)
    const lens = new Mesh(lensGeo, lensMat)
    lens.position.set(x, 0, -0.01)
    g.add(rim, lens)

    const arm = new Mesh(rbox(t, 0.05, 0.08, 1.4, 0.02, 2), frameMat)
    arm.position.set(side * 1.02, 0.2, -0.76)
    arm.rotation.y = side * -0.1
    const tip = new Mesh(t.geo(new CapsuleGeometry(0.035, 0.28, 4, 12)), m.neon)
    tip.rotation.x = Math.PI / 2
    tip.position.set(side * 1.09, 0.1, -1.5)
    g.add(arm, tip)
  }
  const bridge = new Mesh(t.geo(new TorusGeometry(0.11, 0.032, 12, 28, Math.PI)), frameMat)
  bridge.position.set(0, 0.17, 0)
  const brow = new Mesh(rbox(t, 1.9, 0.07, 0.08, 0.03, 3), frameMat)
  brow.position.set(0, 0.28, 0)
  g.add(bridge, brow)

  g.rotation.set(0.28, -0.62, 0)
  const wrap = new Group()
  wrap.add(g)
  return seat(wrap, t)
}

/* ── beauty: perfume bottle and lipstick ─────────────────────────────────── */

export function buildBeauty(style: ModelStyle): BuiltModel {
  const t = new Tracker()
  const m = makeMaterials(t, style)
  const g = new Group()

  const glass = t.mat(
    new MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.03,
      transmission: 1,
      thickness: 0.9,
      ior: 1.52,
      attenuationColor: new Color(style.accent),
      attenuationDistance: 1.4,
      clearcoat: 1,
      envMapIntensity: 1.8,
    }),
  )
  const bottle = new Mesh(rbox(t, 0.9, 1.1, 0.42, 0.1, 6), glass)
  bottle.position.y = 0.66
  const liquid = new Mesh(
    rbox(t, 0.74, 0.78, 0.3, 0.06, 4),
    t.mat(new MeshStandardMaterial({ color: style.accent2, emissive: style.accent2, emissiveIntensity: style.look === 'studio' ? 0 : 0.55, transparent: true, opacity: 0.9, roughness: 0.2 })),
  )
  liquid.position.y = 0.52
  const neck = new Mesh(t.geo(new CylinderGeometry(0.12, 0.14, 0.16, 32)), m.metal)
  neck.position.y = 1.29
  const cap = new Mesh(rbox(t, 0.42, 0.44, 0.34, 0.07, 4), m.metal)
  cap.position.y = 1.58
  const capBand = new Mesh(rbox(t, 0.44, 0.04, 0.36, 0.015, 2), m.neon)
  capBand.position.y = 1.4
  g.add(bottle, liquid, neck, cap, capBand)

  const label = new Mesh(t.geo(roundedPlane(0.5, 0.26, 0.04)), m.white)
  label.position.set(0, 0.6, 0.216)
  g.add(label)

  // lipstick
  const stick = new Group()
  const tube = new Mesh(t.geo(new CylinderGeometry(0.12, 0.12, 0.56, 36)), m.metal)
  tube.position.y = 0.28
  const sleeve = new Mesh(t.geo(new CylinderGeometry(0.125, 0.125, 0.12, 36)), m.neon)
  sleeve.position.y = 0.56
  const bullet = new Mesh(t.geo(new CylinderGeometry(0.095, 0.1, 0.36, 36)), m.neon2)
  bullet.position.y = 0.76
  const tip = new Mesh(t.geo(new SphereGeometry(0.095, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2)), m.neon2)
  tip.scale.set(1, 1.1, 1)
  tip.rotation.z = 0.5
  tip.position.y = 0.94
  stick.add(tube, sleeve, bullet, tip)
  stick.position.set(0.95, 0, 0.2)
  stick.rotation.z = -0.1
  g.add(stick)

  g.rotation.y = -0.35
  const wrap = new Group()
  wrap.add(g)
  return seat(wrap, t)
}

/* ── books & media: a stack of hardcovers ────────────────────────────────── */

export function buildBooks(style: ModelStyle): BuiltModel {
  const t = new Tracker()
  const m = makeMaterials(t, style)
  const g = new Group()
  const pages = t.mat(new MeshStandardMaterial({ color: 0xece9ff, roughness: 0.9, emissive: 0x2a2860, emissiveIntensity: style.look === 'studio' ? 0 : 0.25 }))

  const books: Array<{ w: number; d: number; h: number; rot: number; x: number; hue: number }> = [
    { w: 1.7, d: 1.2, h: 0.26, rot: 0.1, x: 0, hue: 0 },
    { w: 1.5, d: 1.08, h: 0.22, rot: -0.2, x: 0.05, hue: 1 },
    { w: 1.3, d: 0.96, h: 0.2, rot: 0.32, x: -0.03, hue: 2 },
  ]
  const hues = [style.body, style.accent, style.accent2]
  let y = 0
  books.forEach((b, i) => {
    const grp = new Group()
    const cover = new Mesh(rbox(t, b.w, b.h, b.d, 0.025, 3), t.mat(new MeshPhysicalMaterial({ color: hues[b.hue], metalness: 0.2, roughness: 0.3, clearcoat: 0.8, envMapIntensity: 1.1 })))
    const block = new Mesh(rbox(t, b.w - 0.1, b.h - 0.07, b.d - 0.02, 0.012, 2), pages)
    block.position.set(0.03, 0, 0.02)
    grp.add(cover, block)
    const art = new Mesh(t.geo(roundedPlane(b.w * 0.74, b.d * 0.62, 0.05)), t.mat(new MeshStandardMaterial({ map: t.tex(uiTexture('wallpaper', style.screen, style.seed + i * 5)), emissive: 0xffffff, emissiveMap: null, emissiveIntensity: style.look === 'studio' ? 0 : 0, roughness: 0.4 })))
    art.rotation.x = -Math.PI / 2
    art.position.set(-0.02, b.h / 2 + 0.003, 0)
    const stripe = new Mesh(rbox(t, 0.04, b.h + 0.004, b.d + 0.004, 0.015, 2), m.neon)
    stripe.position.set(-b.w / 2 + 0.07, 0, 0)
    grp.add(art, stripe)
    grp.position.set(b.x, y + b.h / 2, 0)
    grp.rotation.y = b.rot
    g.add(grp)
    y += b.h + 0.004
  })

  // an e-reader leaning on the stack
  const reader = new Group()
  const slab = new Mesh(rbox(t, 0.86, 1.2, 0.06, 0.06, 4), m.body)
  const page = new Mesh(t.geo(roundedPlane(0.74, 1.08, 0.035)), t.mat(new MeshStandardMaterial({ color: 0xf1eeff, emissive: 0x8f86ff, emissiveIntensity: style.look === 'studio' ? 0 : 0.55, roughness: 0.7 })))
  page.position.z = 0.0315
  reader.add(slab, page)
  reader.position.set(-1.2, 0.62, 0.35)
  reader.rotation.set(-0.12, 0.5, 0.16)
  g.add(reader)

  g.rotation.y = -0.4
  const wrap = new Group()
  wrap.add(g)
  return seat(wrap, t)
}

/* ── sports & fitness: hex dumbbell and a glowing ball ───────────────────── */

export function buildSports(style: ModelStyle): BuiltModel {
  const t = new Tracker()
  const m = makeMaterials(t, style)
  const g = new Group()

  const handle = new Mesh(t.geo(new CylinderGeometry(0.075, 0.075, 1.2, 32)), m.metal)
  handle.rotation.z = Math.PI / 2
  g.add(handle)
  for (const side of [-1, 1] as const) {
    const head = new Mesh(t.geo(new CylinderGeometry(0.46, 0.46, 0.42, 6)), m.body)
    head.rotation.z = Math.PI / 2
    head.position.x = side * 0.78
    const plate = new Mesh(t.geo(new CylinderGeometry(0.4, 0.4, 0.03, 6)), m.neon)
    plate.rotation.z = Math.PI / 2
    plate.position.x = side * 0.99
    const collar = new Mesh(t.geo(new CylinderGeometry(0.13, 0.13, 0.12, 28)), m.metal)
    collar.rotation.z = Math.PI / 2
    collar.position.x = side * 1.04
    const edge = new Mesh(t.geo(new CylinderGeometry(0.472, 0.472, 0.05, 6)), m.dark)
    edge.rotation.z = Math.PI / 2
    edge.position.x = side * 0.6
    g.add(head, plate, collar, edge)
  }
  g.position.y = 0.48
  g.rotation.set(0.12, -0.5, 0.08)

  const ball = new Group()
  const sphere = new Mesh(t.geo(new SphereGeometry(0.46, 48, 32)), m.glossDark)
  ball.add(sphere)
  for (const rot of [0, Math.PI / 2]) {
    const seam = new Mesh(t.geo(new TorusGeometry(0.462, 0.012, 8, 80)), m.neon2)
    seam.rotation.y = rot
    ball.add(seam)
  }
  const seam3 = new Mesh(t.geo(new TorusGeometry(0.462, 0.012, 8, 80)), m.neon2)
  seam3.rotation.x = Math.PI / 2
  ball.add(seam3)
  ball.position.set(-0.4, 0.46, 1.1)

  const wrap = new Group()
  wrap.add(g, ball)
  return seat(wrap, t)
}

/* ── grocery & gourmet: a jar of beans and an oil bottle ─────────────────── */

export function buildGrocery(style: ModelStyle): BuiltModel {
  const t = new Tracker()
  const m = makeMaterials(t, style)
  const g = new Group()

  const glass = t.mat(new MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.03, transmission: 1, thickness: 0.5, ior: 1.45, attenuationColor: new Color(style.accent), attenuationDistance: 3, envMapIntensity: 1.6, clearcoat: 1 }))
  const jar = new Mesh(lathe(t, [[0.0, 0.0], [0.44, 0.0], [0.5, 0.06], [0.5, 0.8], [0.44, 0.88], [0.4, 0.92], [0.0, 0.92]]), glass)
  g.add(jar)
  const lid = new Mesh(t.geo(new CylinderGeometry(0.43, 0.43, 0.16, 48)), m.metal)
  lid.position.y = 1.0
  const lidRing = new Mesh(t.geo(new TorusGeometry(0.43, 0.012, 8, 64)), m.neon)
  lidRing.rotation.x = Math.PI / 2
  lidRing.position.y = 1.09
  g.add(lid, lidRing)

  // beans packed into the jar
  const beanGeo = t.geo(new SphereGeometry(0.075, 12, 10))
  const beanMat = t.mat(new MeshStandardMaterial({ color: 0x8a4f2b, roughness: 0.45, emissive: 0xff8a3d, emissiveIntensity: style.look === 'studio' ? 0 : 0.18 }))
  const count = 220
  const beans = new InstancedMesh(beanGeo, beanMat, count)
  const dummy = new Object3D()
  let s = 1234567
  const rand = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2
    const r = Math.sqrt(rand()) * 0.4
    dummy.position.set(Math.cos(a) * r, 0.1 + rand() * 0.55, Math.sin(a) * r)
    dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3)
    dummy.scale.set(1, 0.7, 0.62 + rand() * 0.2)
    dummy.updateMatrix()
    beans.setMatrixAt(i, dummy.matrix)
  }
  g.add(beans)

  // olive-oil bottle behind
  const oil = new Group()
  const bottleBody = new Mesh(lathe(t, [[0.0, 0.0], [0.3, 0.0], [0.34, 0.06], [0.34, 0.9], [0.28, 1.08], [0.13, 1.34], [0.11, 1.62], [0.0, 1.62]]), glass)
  const liquid = new Mesh(
    lathe(t, [[0.0, 0.03], [0.27, 0.03], [0.3, 0.08], [0.3, 0.86], [0.24, 1.02], [0.0, 1.02]]),
    t.mat(new MeshStandardMaterial({ color: 0xffb347, emissive: 0xffa43a, emissiveIntensity: style.look === 'studio' ? 0 : 0.65, roughness: 0.15, transparent: true, opacity: 0.92 })),
  )
  const cork = new Mesh(t.geo(new CylinderGeometry(0.1, 0.085, 0.16, 24)), m.neon)
  cork.position.y = 1.7
  oil.add(bottleBody, liquid, cork)
  oil.position.set(0.82, 0, -0.45)
  g.add(oil)

  g.rotation.y = -0.4
  const wrap = new Group()
  wrap.add(g)
  return seat(wrap, t)
}
