import {
  Color,
  DoubleSide,
  Group,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Shape,
  ShapeGeometry,
  type BufferGeometry,
  type Material,
  type Texture,
} from 'three'
import type { ScreenColors } from '../textures'

/** Four colourways so a department's images do not repeat each other. */
export type ModelStyle = {
  /** body shell colour */
  body: number
  /** machined metal */
  metal: number
  /** main neon accent */
  accent: number
  /** secondary neon accent */
  accent2: number
  screen: ScreenColors
  seed: number
  /** neon is the Vision look (lit trim, glow); studio is matte, lit only by the room */
  look: 'neon' | 'studio'
}

export const MODEL_STYLES: ModelStyle[] = [
  { body: 0x16154a, metal: 0xb9b6ff, accent: 0x7b6cff, accent2: 0x3fd2ff, screen: { a: '#5a49f0', b: '#1d1b6b', c: '#3fd2ff' }, seed: 11, look: 'neon' },
  { body: 0x0a2a3f, metal: 0xbfeaff, accent: 0x3fd2ff, accent2: 0x7b6cff, screen: { a: '#1fb6e6', b: '#10335f', c: '#7b6cff' }, seed: 23, look: 'neon' },
  { body: 0x2c1148, metal: 0xe6c9ff, accent: 0xff5fd2, accent2: 0x7b6cff, screen: { a: '#d34fd0', b: '#3b1670', c: '#ff7ab8' }, seed: 37, look: 'neon' },
  { body: 0x1d1740, metal: 0xffe0c2, accent: 0xffb066, accent2: 0x8f82ff, screen: { a: '#ff9a55', b: '#4a2a86', c: '#8f82ff' }, seed: 51, look: 'neon' },
]

/** Studio colourways: graphite, titanium, deep blue and sand, with one cobalt trim. */
export const STUDIO_STYLES: ModelStyle[] = [
  { body: 0x2b2d31, metal: 0xcfd1d6, accent: 0x2f6df6, accent2: 0x9aa1ad, screen: { a: '#3b4660', b: '#1a1d26', c: '#6f86b8' }, seed: 11, look: 'studio' },
  { body: 0xc9c7c1, metal: 0xe9e8e5, accent: 0x2f6df6, accent2: 0x7d838d, screen: { a: '#aab4c6', b: '#59606e', c: '#dfe3ea' }, seed: 23, look: 'studio' },
  { body: 0x1e2c47, metal: 0xc7ccd6, accent: 0x2f6df6, accent2: 0x8f98a8, screen: { a: '#2c4f94', b: '#101a30', c: '#7ba0e8' }, seed: 37, look: 'studio' },
  { body: 0x8d7f6d, metal: 0xe2dccf, accent: 0x2f6df6, accent2: 0x9a8f80, screen: { a: '#8c7a63', b: '#2e2923', c: '#d6c3a6' }, seed: 51, look: 'studio' },
]

export type BuiltModel = {
  group: Group
  /** Height of the model's tallest point above y = 0 (its lowest point). */
  height: number
  dispose: () => void
}

/** Collects everything a builder creates so it can be freed in one call. */
export class Tracker {
  private geometries = new Set<BufferGeometry>()
  private materials = new Set<Material>()
  private textures = new Set<Texture>()

  geo<T extends BufferGeometry>(g: T): T {
    this.geometries.add(g)
    return g
  }
  mat<T extends Material>(m: T): T {
    this.materials.add(m)
    return m
  }
  tex<T extends Texture>(t: T): T {
    this.textures.add(t)
    return t
  }
  dispose(): void {
    this.geometries.forEach((g) => g.dispose())
    this.materials.forEach((m) => m.dispose())
    this.textures.forEach((t) => t.dispose())
    this.geometries.clear()
    this.materials.clear()
    this.textures.clear()
  }
}

/** A flat rounded rectangle with 0..1 UVs, for screens and bezels. */
export function roundedPlane(w: number, h: number, r: number): ShapeGeometry {
  const x = -w / 2
  const y = -h / 2
  const rr = Math.min(r, w / 2, h / 2)
  const s = new Shape()
  s.moveTo(x + rr, y)
  s.lineTo(x + w - rr, y)
  s.absarc(x + w - rr, y + rr, rr, -Math.PI / 2, 0, false)
  s.lineTo(x + w, y + h - rr)
  s.absarc(x + w - rr, y + h - rr, rr, 0, Math.PI / 2, false)
  s.lineTo(x + rr, y + h)
  s.absarc(x + rr, y + h - rr, rr, Math.PI / 2, Math.PI, false)
  s.lineTo(x, y + rr)
  s.absarc(x + rr, y + rr, rr, Math.PI, Math.PI * 1.5, false)
  const g = new ShapeGeometry(s, 10)
  const pos = g.attributes.position
  const uv = g.attributes.uv
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h)
  uv.needsUpdate = true
  return g
}

export type Materials = ReturnType<typeof makeMaterials>

export function makeMaterials(t: Tracker, style: ModelStyle) {
  return {
    /** glossy lacquered shell */
    body: t.mat(
      style.look === 'studio'
        ? new MeshPhysicalMaterial({ color: style.body, metalness: 0.25, roughness: 0.42, clearcoat: 0.25, clearcoatRoughness: 0.4, envMapIntensity: 0.9 })
        : new MeshPhysicalMaterial({ color: style.body, metalness: 0.55, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 1.25 }),
    ),
    /** machined aluminium */
    metal: t.mat(new MeshStandardMaterial({ color: style.metal, metalness: 1, roughness: 0.24, envMapIntensity: 1.2 })),
    /** black glass and rubber */
    dark: t.mat(new MeshStandardMaterial({ color: 0x06061a, metalness: 0.3, roughness: 0.42, envMapIntensity: 0.9 })),
    glossDark: t.mat(new MeshPhysicalMaterial({ color: 0x05051a, metalness: 0.2, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.4 })),
    soft: t.mat(new MeshStandardMaterial({ color: 0x1a1850, metalness: 0, roughness: 0.82 })),
    /** clear glass with a faint tint */
    glass: t.mat(
      new MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: 0.04,
        transmission: 1,
        thickness: 0.6,
        ior: 1.45,
        attenuationColor: new Color(style.accent),
        attenuationDistance: 2.2,
        envMapIntensity: 1.5,
        specularIntensity: 1,
      }),
    ),
    // the trim: lit and unshaded in the neon look, plain painted parts in the studio look
    neon: t.mat(style.look === 'studio' ? new MeshStandardMaterial({ color: style.accent, metalness: 0.1, roughness: 0.5 }) : new MeshBasicMaterial({ color: style.accent, toneMapped: false })),
    neon2: t.mat(style.look === 'studio' ? new MeshStandardMaterial({ color: style.accent2, metalness: 0.2, roughness: 0.5 }) : new MeshBasicMaterial({ color: style.accent2, toneMapped: false })),
    white: t.mat(new MeshBasicMaterial({ color: 0xf2f0ff, toneMapped: false })),
  }
}

export function screenMaterial(t: Tracker, texture: Texture): MeshBasicMaterial {
  return t.mat(new MeshBasicMaterial({ map: t.tex(texture), toneMapped: false, side: DoubleSide }))
}

/** Seats a freshly built group on y = 0 and reports its height. */
export function seat(group: Group, tracker: Tracker): BuiltModel {
  group.updateMatrixWorld(true)
  const box = new Box3Lite(group)
  group.position.y -= box.minY
  group.updateMatrixWorld(true)
  return { group, height: box.maxY - box.minY, dispose: () => tracker.dispose() }
}

/** Minimal world-space y extent of a group, without importing Box3 twice. */
class Box3Lite {
  minY = Infinity
  maxY = -Infinity
  constructor(root: Group) {
    root.traverse((o) => {
      const mesh = o as { geometry?: BufferGeometry; matrixWorld: { elements: number[] } }
      const geo = mesh.geometry
      if (!geo) return
      if (!geo.boundingBox) geo.computeBoundingBox()
      const bb = geo.boundingBox
      if (!bb) return
      const e = mesh.matrixWorld.elements
      for (const x of [bb.min.x, bb.max.x]) {
        for (const y of [bb.min.y, bb.max.y]) {
          for (const z of [bb.min.z, bb.max.z]) {
            const wy = e[1] * x + e[5] * y + e[9] * z + e[13]
            if (wy < this.minY) this.minY = wy
            if (wy > this.maxY) this.maxY = wy
          }
        }
      }
    })
    if (!isFinite(this.minY)) {
      this.minY = 0
      this.maxY = 0
    }
  }
}
