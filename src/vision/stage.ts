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
  NormalBlending,
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

/* The 3D room behind every page. One fixed canvas, one renderer, kept alive
   across route changes; each page asks for a *scene*:

     tour     a line of stations the camera flies along (the landing page)
     focus    one product on its own pane, turned by scroll (listing hero,
              product page)
     ambient  no product — drifting panes and dust, camera parallax (everything
              else)

   Switching scene rebuilds only the stations and eases the camera in, so
   navigating feels like moving through one space. Everything is procedural:
   no model or texture files are downloaded. */

export type StagePalette = {
  glowA: string
  glowB: string
  glowC: string
  dust: string
  /** 1 for the night room, 0 for the day room. */
  room: number
  /** neon is the Vision room; studio is plain light, a matte plate and a soft shadow. */
  look: 'neon' | 'studio'
}

export type SceneSpec =
  | { mode: 'tour'; stations: ModelKind[] }
  | { mode: 'focus'; kind: ModelKind; variant: number; side: 'left' | 'right' }
  | { mode: 'ambient' }

export type StageOptions = {
  canvas: HTMLCanvasElement
  palette: StagePalette
  scene: SceneSpec
  reducedMotion: boolean
  onStation: (index: number) => void
}

type Station = {
  built: BuiltModel
  hero: Group
  root: Group
  pane: GlassPanel
  pool: Mesh
  ring: Mesh
  baseScale: number
}

type DriftPane = { pane: GlassPanel; base: Vector3; spin: number; phase: number }

const SPACING = 7.4
const DUST_COUNT = 360

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function fitScale(built: BuiltModel, maxW: number, maxH: number): number {
  const group = built.group
  group.updateMatrixWorld(true)
  const min = new Vector3(Infinity, Infinity, Infinity)
  const max = new Vector3(-Infinity, -Infinity, -Infinity)
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
          min.min(v)
          max.max(v)
        }
  })
  const w = max.x - min.x
  const h = max.y - min.y
  if (w <= 0 || h <= 0) return 1
  return Math.min(maxW / w, maxH / h)
}

export class LandingStage {
  private renderer: WebGLRenderer
  private scene = new Scene()
  private camera = new PerspectiveCamera(36, 1, 0.1, 120)
  private stations: Station[] = []
  private drift: DriftPane[] = []
  private env: NeonEnvironment | null = null
  private dust: Points
  private dustBase: Float32Array
  private lights: { key: DirectionalLight; a: DirectionalLight; b: DirectionalLight; hemi: HemisphereLight }
  private opts: StageOptions
  private spec: SceneSpec

  private tourTarget = 0
  private tour = 0
  private pageTarget = 0
  private page = 0
  private pointer = { x: 0, y: 0, tx: 0, ty: 0 }
  private intro = 0
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
    this.spec = opts.scene
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

    const dustGeo = new BufferGeometry()
    this.dustBase = new Float32Array(DUST_COUNT * 3)
    let seed = 7
    const rand = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      return seed / 4294967296
    }
    for (let i = 0; i < DUST_COUNT; i++) {
      this.dustBase[i * 3] = rand() * 60 - 12
      this.dustBase[i * 3 + 1] = rand() * 8 - 0.5
      this.dustBase[i * 3 + 2] = -12 + rand() * 20
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

    this.build(this.spec)
    this.applyPalette(palette)
  }

  /* ── scenes ──────────────────────────────────────────────────────────── */

  /** Swaps the scene: stations are rebuilt, the camera eases in from further back. */
  setScene(spec: SceneSpec): void {
    if (this.disposed) return
    if (JSON.stringify(spec) === JSON.stringify(this.spec)) return
    this.clear()
    this.spec = spec
    this.active = -1
    this.intro = this.opts.reducedMotion ? 1 : 0
    this.build(spec)
    this.applyPalette(this.opts.palette)
  }

  private build(spec: SceneSpec): void {
    if (spec.mode === 'tour') spec.stations.forEach((kind, i) => this.addStation(kind, i, i, 3.7, 2.7))
    else if (spec.mode === 'focus') this.addStation(spec.kind, 0, spec.variant, 4.2, 3.1)
    else this.addDrift()
  }

  private clear(): void {
    for (const st of this.stations) {
      this.scene.remove(st.root)
      st.built.dispose()
      st.pane.dispose()
      st.pool.geometry.dispose()
      ;(st.pool.material as MeshBasicMaterial).dispose()
      st.ring.geometry.dispose()
      ;(st.ring.material as MeshBasicMaterial).dispose()
    }
    this.stations = []
    for (const d of this.drift) {
      this.scene.remove(d.pane)
      d.pane.dispose()
    }
    this.drift = []
  }

  private panePalette(): { fill: number; rim: number; streak: number; glow: number } {
    const p = this.opts.palette
    const night = p.room > 0.5
    if (p.look === 'studio') {
      // a plain plate: no streaks, no glow, a hairline rim
      const plate = night ? 0x1d1d20 : 0xeceae5
      return { fill: plate, rim: night ? 0x3a3a3f : 0xc9c6bf, streak: plate, glow: plate }
    }
    return {
      fill: night ? 0x10103a : 0xf4f2ff,
      rim: night ? 0xd6d6f5 : 0xffffff,
      streak: night ? 0xcfcfe6 : 0x7a6bff,
      glow: new Color(p.glowA).getHex(),
    }
  }

  private addDrift(): void {
    // the studio room is empty between products
    if (this.opts.palette.look === 'studio') return
    const c = this.panePalette()
    const spec: Array<[number, number, number, number, number, number]> = [
      // x, y, z, width, height, yaw
      [-8.5, 3.2, -7, 6.2, 3.8, 0.42],
      [9.5, 2.6, -10, 7.2, 4.3, -0.4],
      [1, 6.4, -16, 9.6, 5.4, 0.05],
    ]
    spec.forEach(([x, y, z, w, h, yaw], i) => {
      const pane = new GlassPanel({ width: w, height: h, radius: 0.5, fillAlpha: 0.7, pill: i !== 2, ...c })
      pane.position.set(x, y, z)
      pane.rotation.y = yaw
      this.scene.add(pane)
      this.drift.push({ pane, base: new Vector3(x, y, z), spin: yaw, phase: i * 1.7 })
    })
  }

  private addStation(kind: ModelKind, index: number, variant: number, maxW: number, maxH: number): void {
    const p = this.opts.palette
    const built = buildModel(kind, variant, p.look)
    const hero = new Group()
    hero.add(built.group)
    const baseScale = fitScale(built, maxW, maxH)
    hero.scale.setScalar(baseScale)

    const root = new Group()
    root.position.set(index * SPACING, 0, 0)
    root.add(hero)

    const c = this.panePalette()
    const studio = p.look === 'studio'
    const pane = new GlassPanel({ width: 6.4, height: 3.9, radius: studio ? 0.2 : 0.4, fillAlpha: studio ? 1 : 0.78, pill: !studio, flat: studio, ...c })
    pane.position.set(0, 2.45, -2.3)
    root.add(pane)

    const pool = new Mesh(
      new CircleGeometry(3.2, 48),
      new MeshBasicMaterial({
        map: glowSprite(),
        color: studio ? new Color(0x000000) : new Color(p.glowA),
        transparent: true,
        opacity: studio ? 0.3 : 0.5,
        blending: studio ? NormalBlending : AdditiveBlending,
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
    ring.visible = !studio
    root.add(ring)

    this.scene.add(root)
    this.stations.push({ built, hero, root, pane, pool, ring, baseScale })
  }

  private rebuildEnvironment(): void {
    this.env?.dispose()
    const p = this.opts.palette
    const night = p.room > 0.5
    this.env = createNeonEnvironment(
      this.renderer,
      p.look === 'studio'
        ? // a plain studio: white softbox overhead, two grey strips, no colour
          { base: night ? 0x1c1c1f : 0xcfcdc8, key: 0xffffff, a: 0xe9e9ec, b: 0xc8ccd4, c: 0xb9b6ae }
        : {
            base: night ? 0x05061c : 0x2a2760,
            key: 0xe6e6ff,
            a: new Color(p.glowA).getHex(),
            b: new Color(p.glowB).getHex(),
            c: new Color(p.glowC).getHex(),
          },
    )
    this.scene.environment = this.env.texture
  }

  /** Re-tints lights, glow and panes from the current theme tokens. */
  applyPalette(palette: StagePalette): void {
    const lookChanged = palette.look !== this.opts.palette.look
    const roomChanged = Math.round(palette.room) !== Math.round(this.opts.palette.room) || lookChanged
    this.opts.palette = palette
    // models are built per look, so a theme switch rebuilds them
    if (lookChanged) {
      this.clear()
      this.build(this.spec)
    }
    const a = new Color(palette.glowA)
    const b = new Color(palette.glowB)
    const studio = palette.look === 'studio'
    this.lights.a.color.set(studio ? 0xffffff : a)
    this.lights.b.color.set(studio ? 0xc8ccd4 : b)
    this.lights.a.intensity = studio ? 1.1 : 3.2
    this.lights.b.intensity = studio ? 0.7 : 2
    this.lights.hemi.color.set(studio ? 0xffffff : 0x8d86ff)
    this.lights.hemi.groundColor.set(studio ? 0x8b8985 : 0x05061a)
    this.lights.hemi.intensity = studio ? 0.5 : 0.55
    this.dust.visible = !studio
    ;(this.dust.material as PointsMaterial).color.set(palette.dust)
    ;(this.dust.material as PointsMaterial).opacity = palette.room > 0.5 ? 0.7 : 0.55
    this.renderer.toneMappingExposure = studio ? (palette.room > 0.5 ? 1.0 : 1.05) : palette.room > 0.5 ? 1.05 : 1.2
    const c = this.panePalette()
    for (const st of this.stations) {
      st.pane.setColors(c)
      if (!studio) (st.pool.material as MeshBasicMaterial).color.copy(a)
      ;(st.ring.material as MeshBasicMaterial).color.copy(b)
    }
    for (const d of this.drift) d.pane.setColors(c)
    if (roomChanged) this.rebuildEnvironment()
    this.requestFrame()
  }

  /** `tour` is 0..1 across the pinned track (or the page), `page` 0..1 across the whole page. */
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
    this.intro = reduced ? 1 : Math.min(1, this.intro + dt * 1.4)

    this.tour += (this.tourTarget - this.tour) * k
    this.page += (this.pageTarget - this.page) * k
    this.pointer.x += (this.pointer.tx - this.pointer.x) * k
    this.pointer.y += (this.pointer.ty - this.pointer.y) * k

    this.update()
    this.renderer.render(this.scene, this.camera)

    const settled =
      this.intro >= 1 &&
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
    const t = this.time
    const ease = smooth(0, 1, this.intro)
    const spec = this.spec
    const wide = this.camera.aspect > 1.15
    const portrait = this.camera.aspect < 0.9
    const poolK = this.opts.palette.look === 'studio' ? 0.45 : 1

    let camX = 0
    let camY = 2
    let camZ = 9.2
    let lookX = 0
    let lookY = 1.5

    if (spec.mode === 'tour') {
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
      const shift = (wide ? 2.6 : 0) * (1 - smooth(0, 0.1, this.tour))
      // on portrait screens the copy fills the top of the hero and the card the
      // bottom of the tour, so the model drops below the first and rises above the second
      const vShift = portrait ? (smooth(0, 0.1, this.tour) * -4.5 + 3.4) * (1 - out) : 0
      camX = along * (1 - out) + wideX * out + this.pointer.x * 0.45 - shift
      camY = 2.0 + out * 1.9 + this.pointer.y * -0.25 + vShift
      camZ = 9.2 + out * (6 + last * 1.6) + (this.camera.aspect < 0.9 ? 3 : 0)
      lookX = camX * 0.98 + this.pointer.x * 0.2
      lookY = 1.5 + out * 0.4 + vShift

      this.stations.forEach((st, i) => {
        const near = Math.max(0, 1 - Math.abs(pos - i) * (out > 0.5 ? 0.15 : 1))
        const focus = smooth(0, 1, near)
        st.root.position.x = i * SPACING
        st.hero.position.y = 0.1 + Math.sin(t * 0.9 + i) * 0.06
        st.hero.rotation.y = (i % 2 ? -1 : 1) * (0.5 - focus * 0.25) + Math.sin(t * 0.4 + i) * 0.12 + (this.tour - i / last) * 0.9 + this.pointer.x * 0.25
        st.hero.scale.setScalar(st.baseScale * (0.82 + 0.18 * focus) * (0.9 + 0.1 * ease))
        st.pane.opacity = (0.35 + 0.65 * focus) * ease
        st.pane.shine = 0.45 + 0.75 * focus
        ;(st.pool.material as MeshBasicMaterial).opacity = (0.18 + 0.4 * focus) * ease * poolK
      })
    } else if (spec.mode === 'focus') {
      // one product, turned by scroll: a full half-turn and a little more over the track
      const sideSign = spec.side === 'right' ? 1 : -1
      const shift = (wide ? 2.9 : 0) * sideSign
      const vShift = portrait ? 3.4 : 0
      camX = -shift + this.pointer.x * 0.4
      camY = 2.0 + this.pointer.y * -0.2 + vShift
      camZ = 9.6 + (portrait ? 3 : 0)
      lookX = camX * 0.98 + this.pointer.x * 0.2
      lookY = 1.5 + vShift
      const st = this.stations[0]
      if (st) {
        st.hero.position.y = 0.12 + Math.sin(t * 0.9) * 0.07
        st.hero.rotation.y = 0.45 + this.tour * Math.PI * 1.35 + Math.sin(t * 0.4) * 0.1 + this.pointer.x * 0.3
        st.hero.rotation.x = Math.sin(t * 0.5) * 0.03 + this.pointer.y * 0.05
        st.hero.scale.setScalar(st.baseScale * (0.88 + 0.12 * ease) * (1 - this.tour * 0.06))
        st.pane.opacity = ease
        st.pane.shine = 0.7 + Math.sin(t * 0.8) * 0.2 + this.tour * 0.5
        ;(st.pool.material as MeshBasicMaterial).opacity = 0.55 * ease * poolK
      }
    } else {
      // ambient: panes drift, the camera slides with the page
      camX = (this.page - 0.5) * 3.2 + this.pointer.x * 0.6
      camY = 2.4 + this.pointer.y * -0.3
      camZ = 12
      lookX = camX * 0.5
      lookY = 2.4
      for (const d of this.drift) {
        d.pane.position.set(d.base.x, d.base.y + Math.sin(t * 0.35 + d.phase) * 0.22, d.base.z)
        d.pane.rotation.y = d.spin + Math.sin(t * 0.2 + d.phase) * 0.05 + this.pointer.x * 0.06
        d.pane.opacity = (portrait ? 0.35 : 0.6) * ease
        d.pane.shine = 0.5 + Math.sin(t * 0.6 + d.phase) * 0.2
      }
    }

    // every scene dollies in from further back when it begins
    this.camera.position.set(camX, camY, camZ + (1 - ease) * 5)
    this.lookAt.set(lookX, lookY, 0)
    this.camera.lookAt(this.lookAt)

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
    this.clear()
    this.dust.geometry.dispose()
    ;(this.dust.material as PointsMaterial).dispose()
    this.env?.dispose()
    this.renderer.dispose()
  }
}
