import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
} from 'three'
import { createNeonEnvironment, type NeonEnvironment } from './environment'
import { GlassPanel } from './glass'
import { buildModel, type BuiltModel, type ModelKind } from './models'
import { glowSprite } from './textures'

/* The landing page's 3D room. One fixed canvas behind the page; the page's
   scroll position is the only input (plus a little pointer parallax). The
   camera flies a line of "stations" — one product on its own glass pane at each
   — and pulls back to a wide view once the tour is over.

   Everything here is procedural: no model or texture files are downloaded. */

export type StagePalette = {
  glowA: string
  glowB: string
  glowC: string
  dust: string
  /** 1 for the night room, 0 for the day room. */
  room: number
}

export type StageOptions = {
  canvas: HTMLCanvasElement
  palette: StagePalette
  stations: ModelKind[]
  reducedMotion: boolean
  onStation: (index: number) => void
}

type Station = {
  built: BuiltModel
  hero: Group
  pane: GlassPanel
  pool: Mesh
  x: number
  baseScale: number
}

const SPACING = 7.4
const DUST_COUNT = 360

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function fitScale(built: BuiltModel, maxW: number, maxH: number): number {
  const group = built.group
  group.updateMatrixWorld(true)
  const size = new Vector3()
  const box = { min: new Vector3(Infinity, Infinity, Infinity), max: new Vector3(-Infinity, -Infinity, -Infinity) }
  group.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh || mesh.userData.noFit) return
    const geo = mesh.geometry
    if (!geo.boundingBox) geo.computeBoundingBox()
    if (!geo.boundingBox) return
    const bb = geo.boundingBox
    for (const x of [bb.min.x, bb.max.x])
      for (const y of [bb.min.y, bb.max.y])
        for (const z of [bb.min.z, bb.max.z]) {
          const v = new Vector3(x, y, z).applyMatrix4(mesh.matrixWorld)
          box.min.min(v)
          box.max.max(v)
        }
  })
  size.subVectors(box.max, box.min)
  if (size.x <= 0 || size.y <= 0) return 1
  return Math.min(maxW / size.x, maxH / size.y)
}

export class LandingStage {
  private renderer: WebGLRenderer
  private scene = new Scene()
  private camera = new PerspectiveCamera(36, 1, 0.1, 120)
  private stations: Station[] = []
  private env: NeonEnvironment | null = null
  private dust: Points
  private dustBase: Float32Array
  private lights: { key: DirectionalLight; a: DirectionalLight; b: DirectionalLight; hemi: HemisphereLight }
  private opts: StageOptions

  private tourTarget = 0
  private tour = 0
  private pageTarget = 0
  private page = 0
  private pointer = { x: 0, y: 0, tx: 0, ty: 0 }
  private active = -1
  private raf = 0
  private last = 0
  private time = 0
  private running = false
  private visible = true
  private disposed = false
  private lookAt = new Vector3()

  constructor(opts: StageOptions) {
    this.opts = opts
    const { canvas, palette } = opts

    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.outputColorSpace = SRGBColorSpace
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05

    this.lights = {
      key: new DirectionalLight(0xdcd8ff, 2.2),
      a: new DirectionalLight(new Color(palette.glowA), 3.2),
      b: new DirectionalLight(new Color(palette.glowB), 2),
      hemi: new HemisphereLight(0x8d86ff, 0x05061a, 0.55),
    }
    this.lights.key.position.set(-4, 8, 10)
    this.lights.a.position.set(6, 3, -4)
    this.lights.b.position.set(-7, 2, -3)
    this.scene.add(this.lights.key, this.lights.a, this.lights.b, this.lights.hemi)

    this.rebuildEnvironment()

    opts.stations.forEach((kind, i) => this.addStation(kind, i))

    const dustGeo = new BufferGeometry()
    this.dustBase = new Float32Array(DUST_COUNT * 3)
    let seed = 7
    const rand = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      return seed / 4294967296
    }
    const span = SPACING * Math.max(1, opts.stations.length - 1)
    for (let i = 0; i < DUST_COUNT; i++) {
      this.dustBase[i * 3] = -8 + rand() * (span + 16)
      this.dustBase[i * 3 + 1] = rand() * 8 - 0.5
      this.dustBase[i * 3 + 2] = -10 + rand() * 18
    }
    dustGeo.setAttribute('position', new BufferAttribute(this.dustBase.slice(), 3))
    this.dust = new Points(
      dustGeo,
      new PointsMaterial({
        map: glowSprite(),
        color: new Color(palette.dust),
        size: 0.13,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: AdditiveBlending,
        sizeAttenuation: true,
      }),
    )
    this.dust.frustumCulled = false
    this.scene.add(this.dust)

    this.applyPalette(palette)
  }

  private rebuildEnvironment(): void {
    this.env?.dispose()
    const p = this.opts.palette
    const night = p.room > 0.5
    this.env = createNeonEnvironment(this.renderer, {
      base: night ? 0x05061c : 0x2a2760,
      key: 0xe6e6ff,
      a: new Color(p.glowA).getHex(),
      b: new Color(p.glowB).getHex(),
      c: new Color(p.glowC).getHex(),
    })
    this.scene.environment = this.env.texture
  }

  private addStation(kind: ModelKind, index: number): void {
    const p = this.opts.palette
    const built = buildModel(kind, index)
    const hero = new Group()
    hero.add(built.group)
    const baseScale = fitScale(built, 3.7, 2.7)
    hero.scale.setScalar(baseScale)

    const root = new Group()
    root.position.set(index * SPACING, 0, 0)
    root.add(hero)

    const pane = new GlassPanel({
      width: 6.4,
      height: 3.9,
      radius: 0.4,
      fill: 0x10103a,
      fillAlpha: 0.78,
      rim: 0xd6d6f5,
      streak: 0xcfcfe6,
      glow: new Color(p.glowA).getHex(),
      pill: true,
    })
    pane.position.set(0, 2.45, -2.3)
    root.add(pane)

    const pool = new Mesh(
      new CircleGeometry(3.2, 48),
      new MeshBasicMaterial({
        map: glowSprite(),
        color: new Color(p.glowA),
        transparent: true,
        opacity: 0.5,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    )
    pool.rotation.x = -Math.PI / 2
    pool.position.y = 0.01
    pool.scale.set(1.15, 0.8, 1)
    root.add(pool)

    const ring = new Mesh(new TorusGeometry(2.2, 0.01, 6, 96), new MeshBasicMaterial({ color: new Color(p.glowB), toneMapped: false }))
    ring.rotation.x = -Math.PI / 2
    ring.scale.set(1.2, 0.8, 1)
    ring.position.y = 0.015
    root.add(ring)

    this.scene.add(root)
    this.stations.push({ built, hero, pane, pool, x: root.position.x, baseScale })
  }

  /** Re-tints lights, glow and panes from the current theme tokens. */
  applyPalette(palette: StagePalette): void {
    const roomChanged = Math.round(palette.room) !== Math.round(this.opts.palette.room)
    this.opts.palette = palette
    const a = new Color(palette.glowA)
    const b = new Color(palette.glowB)
    this.lights.a.color.copy(a)
    this.lights.b.color.copy(b)
    ;(this.dust.material as PointsMaterial).color.set(palette.dust)
    ;(this.dust.material as PointsMaterial).opacity = palette.room > 0.5 ? 0.7 : 0.55
    this.renderer.toneMappingExposure = palette.room > 0.5 ? 1.05 : 1.2
    for (const st of this.stations) {
      st.pane.setColors({ glow: a.getHex(), fill: palette.room > 0.5 ? 0x10103a : 0xf4f2ff, rim: palette.room > 0.5 ? 0xd6d6f5 : 0xffffff, streak: palette.room > 0.5 ? 0xcfcfe6 : 0x7a6bff })
      ;(st.pool.material as MeshBasicMaterial).color.copy(a)
    }
    if (roomChanged) this.rebuildEnvironment()
    this.requestFrame()
  }

  /** `tour` is 0..1 across the pinned product tour, `page` 0..1 across the whole page. */
  setProgress(tour: number, page: number): void {
    this.tourTarget = Math.min(1, Math.max(0, tour))
    this.pageTarget = Math.min(1, Math.max(0, page))
    this.requestFrame()
  }

  setPointer(x: number, y: number): void {
    this.pointer.tx = x
    this.pointer.ty = y
    if (!this.opts.reducedMotion) this.requestFrame()
  }

  setVisible(visible: boolean): void {
    this.visible = visible
    if (visible) this.requestFrame()
  }

  resize(width: number, height: number, dpr: number): void {
    this.renderer.setPixelRatio(Math.min(dpr, 1.75))
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / Math.max(1, height)
    // narrow screens get a wider field so the pane still fits
    this.camera.fov = this.camera.aspect < 0.8 ? 52 : this.camera.aspect < 1.2 ? 44 : 36
    this.camera.updateProjectionMatrix()
    this.requestFrame()
  }

  private requestFrame(): void {
    if (this.running || this.disposed || !this.visible) return
    this.running = true
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.tick)
  }

  private tick = (now: number): void => {
    if (this.disposed) return
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    const reduced = this.opts.reducedMotion
    const k = reduced ? 1 : 1 - Math.exp(-dt * 5)
    this.time += reduced ? 0 : dt

    this.tour += (this.tourTarget - this.tour) * k
    this.page += (this.pageTarget - this.page) * k
    this.pointer.x += (this.pointer.tx - this.pointer.x) * k
    this.pointer.y += (this.pointer.ty - this.pointer.y) * k

    this.update()
    this.renderer.render(this.scene, this.camera)

    const settled =
      Math.abs(this.tourTarget - this.tour) < 0.0004 &&
      Math.abs(this.pageTarget - this.page) < 0.0004 &&
      Math.abs(this.pointer.tx - this.pointer.x) < 0.0004 &&
      Math.abs(this.pointer.ty - this.pointer.y) < 0.0004
    if (reduced && settled) {
      this.running = false
      return
    }
    this.raf = requestAnimationFrame(this.tick)
  }

  private update(): void {
    const n = this.stations.length
    const last = Math.max(1, n - 1)
    const pos = this.tour * last
    const index = Math.min(n - 1, Math.floor(pos))
    const f = pos - index
    // hold on each station, glide between them
    const glide = smooth(0.28, 0.72, f)
    const along = (index + (index < last ? glide : 0)) * SPACING
    const nearest = Math.round(pos)
    if (nearest !== this.active) {
      this.active = nearest
      this.opts.onStation(nearest)
    }

    // after the tour: pull back and drift across the whole line
    const out = smooth(0.96, 1, this.tour) * smooth(0, 0.55, this.page)
    const wideX = last * SPACING * 0.5
    // on wide screens the hero headline sits left, so the first station sits right
    const shift = (this.camera.aspect > 1.15 ? 2.6 : 0) * (1 - smooth(0, 0.1, this.tour))
    const camX = along * (1 - out) + wideX * out + this.pointer.x * 0.45 - shift
    // on portrait screens the copy fills the top of the hero and the card the
    // bottom of the tour, so the model drops below the first and rises above the second
    const portrait = this.camera.aspect < 0.9
    const vShift = portrait ? (smooth(0, 0.1, this.tour) * -4.5 + 3.4) * (1 - out) : 0
    const camY = 2.0 + out * 1.9 + this.pointer.y * -0.25 + vShift
    const camZ = 9.2 + out * (6 + last * 1.6) + (this.camera.aspect < 0.9 ? 3 : 0)
    this.camera.position.set(camX, camY, camZ)
    this.lookAt.set(camX * 0.98 + this.pointer.x * 0.2, 1.5 + out * 0.4 + vShift, 0)
    this.camera.lookAt(this.lookAt)

    const t = this.time
    this.stations.forEach((st, i) => {
      const near = Math.max(0, 1 - Math.abs(pos - i) * (out > 0.5 ? 0.15 : 1))
      const focus = smooth(0, 1, near)
      st.hero.position.y = 0.1 + Math.sin(t * 0.9 + i) * 0.06
      st.hero.rotation.y = (i % 2 ? -1 : 1) * (0.5 - focus * 0.25) + Math.sin(t * 0.4 + i) * 0.12 + (this.tour - i / last) * 0.9 + this.pointer.x * 0.25
      st.hero.scale.setScalar(st.baseScale * (0.82 + 0.18 * focus))
      st.pane.opacity = 0.35 + 0.65 * focus
      st.pane.shine = 0.45 + 0.75 * focus
      ;(st.pool.material as MeshBasicMaterial).opacity = 0.18 + 0.4 * focus
    })

    // dust drifts upward slowly and wraps
    const pos3 = this.dust.geometry.getAttribute('position') as BufferAttribute
    for (let i = 0; i < DUST_COUNT; i++) {
      const y = (this.dustBase[i * 3 + 1] + t * (0.05 + (i % 7) * 0.012)) % 8
      pos3.setY(i, y - 0.5)
      pos3.setX(i, this.dustBase[i * 3] + Math.sin(t * 0.3 + i) * 0.15)
    }
    pos3.needsUpdate = true
  }

  dispose(): void {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    for (const st of this.stations) {
      st.built.dispose()
      st.pane.dispose()
      st.pool.geometry.dispose()
      ;(st.pool.material as MeshBasicMaterial).dispose()
    }
    this.dust.geometry.dispose()
    ;(this.dust.material as PointsMaterial).dispose()
    this.env?.dispose()
    this.renderer.dispose()
  }
}
