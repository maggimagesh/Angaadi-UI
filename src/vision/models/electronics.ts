import {
  AdditiveBlending,
  CapsuleGeometry,
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  TorusGeometry,
} from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { glowSprite, uiTexture } from '../textures'
import { makeMaterials, roundedPlane, screenMaterial, seat, Tracker, type BuiltModel, type ModelStyle } from './helpers'

const rbox = (t: Tracker, w: number, h: number, d: number, r: number, seg = 5) => t.geo(new RoundedBoxGeometry(w, h, d, seg, r))

/* ── smartphone ──────────────────────────────────────────────────────────── */

export function buildPhone(style: ModelStyle): BuiltModel {
  const t = new Tracker()
  const m = makeMaterials(t, style)
  const g = new Group()

  const rim = new Mesh(rbox(t, 0.8, 1.64, 0.1, 0.12, 6), m.metal)
  const back = new Mesh(rbox(t, 0.775, 1.615, 0.098, 0.105, 6), m.body)
  back.position.z = -0.002
  g.add(rim, back)

  const front = new Mesh(t.geo(roundedPlane(0.76, 1.6, 0.1)), m.glossDark)
  front.position.z = 0.0505
  const screen = new Mesh(t.geo(roundedPlane(0.715, 1.555, 0.082)), screenMaterial(t, uiTexture('phone', style.screen, style.seed)))
  screen.position.z = 0.0512
  g.add(front, screen)

  // camera plateau, three lenses and flash on the back
  const bump = new Mesh(rbox(t, 0.42, 0.42, 0.035, 0.1), m.glossDark)
  bump.position.set(-0.17, 0.56, -0.066)
  g.add(bump)
  const lensPositions: Array<[number, number]> = [
    [-0.27, 0.66],
    [-0.27, 0.46],
    [-0.08, 0.56],
  ]
  for (const [x, y] of lensPositions) {
    const ring = new Mesh(t.geo(new CylinderGeometry(0.085, 0.085, 0.04, 40)), m.metal)
    ring.rotation.x = Math.PI / 2
    ring.position.set(x, y, -0.092)
    const lens = new Mesh(t.geo(new CircleGeometry(0.058, 32)), m.neon2)
    lens.rotation.y = Math.PI
    lens.position.set(x, y, -0.1125)
    const core = new Mesh(t.geo(new CircleGeometry(0.03, 24)), m.glossDark)
    core.rotation.y = Math.PI
    core.position.set(x, y, -0.1135)
    g.add(ring, lens, core)
  }
  const flash = new Mesh(t.geo(new CircleGeometry(0.026, 20)), m.white)
  flash.rotation.y = Math.PI
  flash.position.set(-0.08, 0.7, -0.0845)
  g.add(flash)

  // side buttons
  const button = (x: number, y: number, h: number) => {
    const b = new Mesh(rbox(t, 0.022, h, 0.045, 0.01, 2), m.metal)
    b.position.set(x, y, 0)
    g.add(b)
  }
  button(0.405, 0.28, 0.28)
  button(-0.405, 0.42, 0.14)
  button(-0.405, 0.22, 0.2)
  button(-0.405, -0.02, 0.2)

  return seat(g, t)
}

/* ── tablet ──────────────────────────────────────────────────────────────── */

export function buildTablet(style: ModelStyle): BuiltModel {
  const t = new Tracker()
  const m = makeMaterials(t, style)
  const g = new Group()

  const rim = new Mesh(rbox(t, 2.08, 1.48, 0.078, 0.1, 6), m.metal)
  const back = new Mesh(rbox(t, 2.06, 1.46, 0.076, 0.09, 6), m.body)
  back.position.z = -0.002
  g.add(rim, back)
  const front = new Mesh(t.geo(roundedPlane(2.04, 1.44, 0.085)), m.glossDark)
  front.position.z = 0.0395
  const screen = new Mesh(t.geo(roundedPlane(1.92, 1.32, 0.055)), screenMaterial(t, uiTexture('tablet', style.screen, style.seed)))
  screen.position.z = 0.0402
  g.add(front, screen)
  const cam = new Mesh(t.geo(new CircleGeometry(0.014, 16)), m.neon2)
  cam.position.set(0, 0.69, 0.0405)
  g.add(cam)

  // pencil, snapped to the long edge
  const pencil = new Mesh(t.geo(new CapsuleGeometry(0.026, 1.25, 6, 20)), m.white)
  pencil.rotation.z = Math.PI / 2
  pencil.position.set(0, -0.76, 0.045)
  const band = new Mesh(t.geo(new CylinderGeometry(0.0275, 0.0275, 0.06, 20)), m.neon)
  band.rotation.z = Math.PI / 2
  band.position.set(0.36, -0.76, 0.045)
  g.add(pencil, band)

  return seat(g, t)
}

/* ── laptop ──────────────────────────────────────────────────────────────── */

export function buildLaptop(style: ModelStyle): BuiltModel {
  const t = new Tracker()
  const m = makeMaterials(t, style)
  const g = new Group()

  const baseMat = t.mat(new MeshStandardMaterial({ color: style.look === 'studio' ? 0x9a9da3 : 0x2b2a72, metalness: 0.85, roughness: 0.46, envMapIntensity: 0.7 }))
  const base = new Mesh(rbox(t, 2.24, 0.075, 1.52, 0.035, 4), baseMat)
  base.position.y = 0.0375
  g.add(base)
  const deck = new Mesh(rbox(t, 2.16, 0.012, 1.44, 0.03, 3), m.body)
  deck.position.y = 0.078
  g.add(deck)

  // backlit keys
  const keyGeo = t.geo(new RoundedBoxGeometry(0.118, 0.03, 0.118, 2, 0.025))
  const keyMat = t.mat(new MeshStandardMaterial({ color: style.look === 'studio' ? 0x202226 : 0x0a0a28, metalness: 0.2, roughness: 0.45, emissive: style.accent, emissiveIntensity: style.look === 'studio' ? 0 : 0.55 }))
  const cols = 14
  const rows = 5
  const keys = new InstancedMesh(keyGeo, keyMat, cols * rows)
  const mat4 = new Matrix4()
  let i = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      mat4.makeTranslation(-0.95 + c * 0.146, 0.098, -0.58 + r * 0.146)
      keys.setMatrixAt(i++, mat4)
    }
  }
  g.add(keys)
  const pad = new Mesh(t.geo(roundedPlane(0.82, 0.5, 0.05)), m.glossDark)
  pad.rotation.x = -Math.PI / 2
  pad.position.set(0, 0.0845, 0.46)
  g.add(pad)

  // lid on a hinge at the back edge
  const hinge = new Group()
  hinge.position.set(0, 0.085, -0.76)
  hinge.rotation.x = -0.28
  const lid = new Mesh(rbox(t, 2.24, 1.46, 0.052, 0.04, 4), m.metal)
  lid.position.set(0, 0.73, 0)
  const bezel = new Mesh(t.geo(roundedPlane(2.18, 1.4, 0.03)), m.glossDark)
  bezel.position.set(0, 0.73, 0.0268)
  const screen = new Mesh(t.geo(roundedPlane(2.08, 1.3, 0.02)), screenMaterial(t, uiTexture('laptop', style.screen, style.seed)))
  screen.position.set(0, 0.73, 0.0275)
  const logo = new Mesh(t.geo(new CircleGeometry(0.17, 40)), m.neon)
  logo.rotation.y = Math.PI
  logo.position.set(0, 0.73, -0.0268)
  hinge.add(lid, bezel, screen, logo)
  g.add(hinge)

  const pin = new Mesh(t.geo(new CylinderGeometry(0.035, 0.035, 1.9, 20)), m.metal)
  pin.rotation.z = Math.PI / 2
  pin.position.set(0, 0.085, -0.76)
  g.add(pin)

  // screen light washing onto the keys
  const wash = new Mesh(
    t.geo(new CircleGeometry(1.1, 40)),
    t.mat(new MeshBasicMaterial({ map: t.tex(glowSprite()), color: style.accent, transparent: true, opacity: 0.35, blending: AdditiveBlending, depthWrite: false, toneMapped: false })),
  )
  wash.rotation.x = -Math.PI / 2
  wash.scale.set(1.15, 0.7, 1)
  wash.position.set(0, 0.092, -0.1)
  wash.userData.noFit = true
  if (style.look === 'neon') g.add(wash)

  return seat(g, t)
}

/* ── television ──────────────────────────────────────────────────────────── */

export function buildTv(style: ModelStyle): BuiltModel {
  const t = new Tracker()
  const m = makeMaterials(t, style)
  const g = new Group()

  const frame = new Mesh(rbox(t, 3.44, 1.98, 0.075, 0.03, 4), m.metal)
  frame.position.y = 1.3
  const glass = new Mesh(t.geo(roundedPlane(3.38, 1.92, 0.02)), m.glossDark)
  glass.position.set(0, 1.3, 0.0385)
  const screen = new Mesh(t.geo(roundedPlane(3.3, 1.86, 0.015)), screenMaterial(t, uiTexture('tv', style.screen, style.seed)))
  screen.position.set(0, 1.3, 0.0392)
  g.add(frame, glass, screen)

  // backlight bleeding round the edges
  const halo = new Mesh(
    t.geo(new CircleGeometry(2.7, 48)),
    t.mat(new MeshBasicMaterial({ map: t.tex(glowSprite()), color: style.accent, transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false, toneMapped: false })),
  )
  halo.scale.set(1.3, 0.85, 1)
  halo.position.set(0, 1.3, -0.12)
  halo.userData.noFit = true
  if (style.look === 'neon') g.add(halo)

  const neck = new Mesh(rbox(t, 0.22, 0.4, 0.06, 0.02, 2), m.metal)
  neck.position.set(0, 0.34, -0.03)
  const foot = new Mesh(rbox(t, 1.5, 0.05, 0.42, 0.025, 3), m.metal)
  foot.position.set(0, 0.125, 0.02)
  g.add(neck, foot)

  // soundbar on the shelf in front
  const bar = new Mesh(rbox(t, 2.5, 0.15, 0.2, 0.07, 4), m.body)
  bar.position.set(0, 0.075, 0.55)
  const slit = new Mesh(t.geo(roundedPlane(2.2, 0.03, 0.015)), m.neon2)
  slit.position.set(0, 0.085, 0.652)
  g.add(bar, slit)

  return seat(g, t)
}

/* ── headphones ──────────────────────────────────────────────────────────── */

export function buildHeadphones(style: ModelStyle): BuiltModel {
  const t = new Tracker()
  const m = makeMaterials(t, style)
  const g = new Group()

  const band = new Mesh(t.geo(new TorusGeometry(0.86, 0.05, 20, 80, Math.PI)), m.metal)
  band.scale.set(1, 1.08, 0.9)
  band.position.y = 0.12
  const cushion = new Mesh(t.geo(new TorusGeometry(0.8, 0.062, 20, 80, Math.PI * 0.74)), m.soft)
  cushion.rotation.z = Math.PI * 0.13
  cushion.position.y = 0.12
  g.add(band, cushion)

  for (const side of [-1, 1] as const) {
    const x = side * 0.9
    const slider = new Mesh(t.geo(new CylinderGeometry(0.045, 0.045, 0.34, 20)), m.metal)
    slider.position.set(x, 0.0, 0)
    const yoke = new Mesh(t.geo(new TorusGeometry(0.4, 0.03, 12, 40, Math.PI)), m.metal)
    yoke.rotation.z = Math.PI
    yoke.rotation.y = Math.PI / 2
    yoke.position.set(x, -0.38, 0)
    const cup = new Mesh(t.geo(new CylinderGeometry(0.42, 0.4, 0.3, 64)), m.body)
    cup.rotation.z = Math.PI / 2
    cup.position.set(x, -0.38, 0)
    const cap = new Mesh(t.geo(new CylinderGeometry(0.36, 0.36, 0.03, 64)), m.glossDark)
    cap.rotation.z = Math.PI / 2
    cap.position.set(x + side * 0.158, -0.38, 0)
    const ring = new Mesh(t.geo(new TorusGeometry(0.27, 0.014, 10, 64)), m.neon)
    ring.rotation.y = Math.PI / 2
    ring.position.set(x + side * 0.176, -0.38, 0)
    const ring2 = new Mesh(t.geo(new TorusGeometry(0.15, 0.01, 10, 64)), m.neon2)
    ring2.rotation.y = Math.PI / 2
    ring2.position.set(x + side * 0.176, -0.38, 0)
    const pad = new Mesh(t.geo(new TorusGeometry(0.3, 0.115, 24, 64)), m.soft)
    pad.rotation.y = Math.PI / 2
    pad.position.set(x - side * 0.19, -0.38, 0)
    g.add(slider, yoke, cup, cap, ring, ring2, pad)
  }

  g.rotation.y = -0.5
  const wrap = new Group()
  wrap.add(g)
  return seat(wrap, t)
}

/* ── smartwatch ──────────────────────────────────────────────────────────── */

export function buildWatch(style: ModelStyle): BuiltModel {
  const t = new Tracker()
  const m = makeMaterials(t, style)
  const g = new Group()

  const strapMat = t.mat(new MeshStandardMaterial({ color: style.look === 'studio' ? 0x3a3d44 : style.accent, metalness: 0.1, roughness: 0.62, emissive: style.accent, emissiveIntensity: style.look === 'studio' ? 0 : 0.12 }))
  for (const side of [1, -1] as const) {
    const strap = new Group()
    strap.position.set(0, side * 0.5, -0.005)
    strap.rotation.x = side * -0.22
    const band = new Mesh(rbox(t, 0.6, 0.86, 0.075, 0.035, 3), strapMat)
    band.position.y = side * 0.4
    strap.add(band)
    if (side === -1) {
      for (let h = 0; h < 5; h++) {
        const hole = new Mesh(t.geo(new CircleGeometry(0.03, 16)), m.glossDark)
        hole.position.set(0, -0.22 - h * 0.1, 0.0385)
        strap.add(hole)
      }
    } else {
      const keeper = new Mesh(rbox(t, 0.64, 0.07, 0.1, 0.03, 2), m.metal)
      keeper.position.set(0, 0.62, 0.0)
      strap.add(keeper)
    }
    g.add(strap)
  }

  const caseMesh = new Mesh(rbox(t, 0.72, 0.86, 0.2, 0.18, 8), m.metal)
  const glass = new Mesh(t.geo(roundedPlane(0.64, 0.78, 0.15)), m.glossDark)
  glass.position.z = 0.1015
  const screen = new Mesh(t.geo(roundedPlane(0.6, 0.74, 0.13)), screenMaterial(t, uiTexture('watch', style.screen, style.seed)))
  screen.scale.set(1, 1, 1)
  screen.position.z = 0.1022
  g.add(caseMesh, glass, screen)
  const crown = new Mesh(t.geo(new CylinderGeometry(0.06, 0.06, 0.09, 24)), m.neon)
  crown.rotation.z = Math.PI / 2
  crown.position.set(0.39, 0.16, 0.0)
  const key = new Mesh(rbox(t, 0.05, 0.22, 0.05, 0.02, 2), m.metal)
  key.position.set(0.37, -0.12, 0)
  g.add(crown, key)

  g.rotation.y = -0.34
  g.rotation.x = 0.06
  const wrap = new Group()
  wrap.add(g)
  return seat(wrap, t)
}

/** Used by lifestyle builders for an additive glow plate. */
export function glowPlate(t: Tracker, color: number, size: number, opacity = 0.5): Mesh {
  const mesh = new Mesh(
    t.geo(new CircleGeometry(size, 40)),
    t.mat(new MeshBasicMaterial({ map: t.tex(glowSprite()), color, transparent: true, opacity, blending: AdditiveBlending, depthWrite: false, toneMapped: false, side: DoubleSide })),
  )
  return mesh
}
