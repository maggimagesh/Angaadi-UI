import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HalfFloatType,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NormalBlending,
  Object3D,
  VSMShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Scene,
  ShadowMaterial,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { createNeonEnvironment, type NeonEnvironment } from './environment'
import { fitDistance } from './frame'
import { buildModel, type BuiltModel, type ModelKind } from './models'
import { bokehDisc, glowSprite, gradientTexture } from './textures'

/* One product shot, drawn into its own window.

   A scene is a product (or a line of them) on a plinth, lit by a key light that
   casts a real soft shadow, with a backdrop gradient behind. The window's own
   shape decides the camera distance (see frame.ts), so it never crops on a phone.

     tour   a line of stations the camera glides along as the page scrolls
     focus  one product, turned by scroll, drag and a slow idle sway

   Two looks: `neon` is Vision (night glass, bokeh, bloom) and `studio` is the
   Studio theme (matte, plain light, no bloom). Everything is procedural: no
   model or texture file is downloaded. */

export type StagePalette = {
  glowA: string
  glowB: string
  glowC: string
  dust: string
  /** 1 for the night room, 0 for the day room. */
  room: number
  look: 'neon' | 'studio'
  /** backdrop gradient, top to bottom */
  bgTop: string
  bgMid: string
  bgBottom: string
}

export type SceneSpec =
  | { mode: 'tour'; stations: ModelKind[] }
  | { mode: 'focus'; kind: ModelKind; variant: number }

export type StageOptions = {
  canvas: HTMLCanvasElement
  palette: StagePalette
  scene: SceneSpec
  reducedMotion: boolean
  onStation?: (index: number) => void
}

type Station = {
  built: BuiltModel
  hero: Group
  root: Group
  plinth: Mesh
  rim: Mesh | null
  pool: Mesh
  shadow: Mesh
  baseScale: number
}

const SPACING = 7.2
const FOV = 32
const PLINTH_H = 0.16
const DUST_COUNT = 220

const smooth = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
const easeOut = (t: number): number => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3)

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
  private composer: EffectComposer | null = null
  private bloom: UnrealBloomPass | null = null
  private scene = new Scene()
  private camera = new PerspectiveCamera(FOV, 1, 0.1, 120)
  private stations: Station[] = []
  private decor = new Group()
  private env: NeonEnvironment | null = null
  private dust: Points
  private dustBase: Float32Array
  private background: ReturnType<typeof gradientTexture> | null = null
  private key: DirectionalLight
  private fill: DirectionalLight
  private rimLight: DirectionalLight
  private hemi: HemisphereLight
  private keyTarget = new Object3D()
  private opts: StageOptions
  private spec: SceneSpec

  private progressTarget = 0
  private progress = 0
  private pointer = { x: 0, y: 0, tx: 0, ty: 0 }
  private drag = { yaw: 0, vel: 0, active: false }
  private intro = 0
  private active = -1
  private raf = 0
  private last = 0
  private time = 0
  private running = false
  private visible = true
  private disposed = false
  private lookAt = new Vector3()
  private size = { w: 1, h: 1 }

  constructor(opts: StageOptions) {
    this.opts = opts
    this.spec = opts.scene
    const { canvas, palette } = opts

    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
    this.renderer.outputColorSpace = SRGBColorSpace
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = VSMShadowMap

    this.key = new DirectionalLight(0xffffff, 2.2)
    this.key.castShadow = true
    this.key.shadow.mapSize.set(1536, 1536)
    // variance shadows blur with distance from the object, which is what a soft box does
    this.key.shadow.radius = 9
    this.key.shadow.blurSamples = 20
    this.key.shadow.bias = -0.0004
    this.key.shadow.normalBias = 0.02
    const sc = this.key.shadow.camera
    sc.left = -5.5
    sc.right = 5.5
    sc.top = 5.5
    sc.bottom = -5.5
    sc.near = 1
    sc.far = 30
    this.key.target = this.keyTarget
    this.fill = new DirectionalLight(0xffffff, 1)
    this.rimLight = new DirectionalLight(0xffffff, 2)
    this.hemi = new HemisphereLight(0xffffff, 0x222233, 0.5)
    this.scene.add(this.key, this.keyTarget, this.fill, this.rimLight, this.hemi, this.decor)

    const dustGeo = new BufferGeometry()
    this.dustBase = new Float32Array(DUST_COUNT * 3)
    let seed = 7
    const rand = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      return seed / 4294967296
    }
    for (let i = 0; i < DUST_COUNT; i++) {
      this.dustBase[i * 3] = rand() * 70 - 14
      this.dustBase[i * 3 + 1] = rand() * 7 - 0.5
      this.dustBase[i * 3 + 2] = -9 + rand() * 14
    }
    dustGeo.setAttribute('position', new BufferAttribute(this.dustBase.slice(), 3))
    this.dust = new Points(
      dustGeo,
      new PointsMaterial({ map: glowSprite(), color: new Color(palette.dust), size: 0.1, transparent: true, opacity: 0.6, depthWrite: false, blending: AdditiveBlending, sizeAttenuation: true }),
    )
    this.dust.frustumCulled = false
    this.scene.add(this.dust)

    this.rebuild()
    this.applyPalette(palette)
  }

  /* ── building ─────────────────────────────────────────────────────────── */

  private rebuild(): void {
    this.clear()
    this.rebuildEnvironment()
    this.rebuildBackground()
    this.rebuildComposer()
    const spec = this.spec
    if (spec.mode === 'tour') spec.stations.forEach((kind, i) => this.addStation(kind, i, i, 3.8, 3.0))
    else this.addStation(spec.kind, 0, spec.variant, 4.3, 3.4)
    this.addDecor()
    this.intro = this.opts.reducedMotion ? 1 : 0
  }

  /** Swaps the scene. Stations are rebuilt and the intro plays again. */
  setScene(spec: SceneSpec): void {
    if (this.disposed || JSON.stringify(spec) === JSON.stringify(this.spec)) return
    this.spec = spec
    this.active = -1
    this.rebuild()
    this.applyPalette(this.opts.palette)
    this.requestFrame()
  }

  private clear(): void {
    for (const st of this.stations) {
      this.scene.remove(st.root)
      st.built.dispose()
      st.plinth.geometry.dispose()
      ;(st.plinth.material as MeshStandardMaterial).dispose()
      st.rim?.geometry.dispose()
      ;(st.rim?.material as MeshBasicMaterial | undefined)?.dispose()
      st.pool.geometry.dispose()
      ;(st.pool.material as MeshBasicMaterial).dispose()
      st.shadow.geometry.dispose()
      ;(st.shadow.material as ShadowMaterial).dispose()
    }
    this.stations = []
    for (const child of [...this.decor.children]) {
      this.decor.remove(child)
      const sprite = child as Sprite
      if (sprite.isSprite) sprite.material.dispose()
    }
  }

  private rebuildBackground(): void {
    this.background?.dispose()
    const p = this.opts.palette
    this.background = gradientTexture(
      [
        [0, p.bgTop],
        [0.5, p.bgMid],
        [1, p.bgBottom],
      ],
      4,
      512,
    )
    this.background.colorSpace = SRGBColorSpace
    this.scene.background = this.background
  }

  private rebuildComposer(): void {
    this.composer?.dispose()
    this.composer = null
    this.bloom = null
    if (this.opts.palette.look !== 'neon') return
    // antialiased float target, so the neon trim stays crisp under bloom
    const target = new WebGLRenderTarget(this.size.w, this.size.h, { type: HalfFloatType, samples: 4 })
    this.composer = new EffectComposer(this.renderer, target)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.bloom = new UnrealBloomPass(new Vector2(this.size.w, this.size.h), this.opts.palette.room > 0.5 ? 0.42 : 0.18, 0.7, 0.88)
    this.composer.addPass(this.bloom)
    this.composer.addPass(new OutputPass())
    this.composer.setSize(this.size.w, this.size.h)
  }

  private rebuildEnvironment(): void {
    this.env?.dispose()
    const p = this.opts.palette
    const night = p.room > 0.5
    this.env = createNeonEnvironment(
      this.renderer,
      p.look === 'studio'
        ? { base: night ? 0x1c1c1f : 0xcfcdc8, key: 0xffffff, a: 0xe9e9ec, b: 0xc8ccd4, c: 0xb9b6ae }
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

  private addStation(kind: ModelKind, index: number, variant: number, maxW: number, maxH: number): void {
    const p = this.opts.palette
    const studio = p.look === 'studio'
    const night = p.room > 0.5
    const built = buildModel(kind, variant, p.look)
    built.group.traverse((o) => {
      const mesh = o as Mesh
      if (mesh.isMesh && !mesh.userData.noFit) mesh.castShadow = true
    })
    const hero = new Group()
    hero.add(built.group)
    const baseScale = fitScale(built, maxW, maxH)
    hero.scale.setScalar(baseScale)
    hero.position.y = PLINTH_H

    const root = new Group()
    root.position.set(index * SPACING, 0, 0)

    // the plinth the product stands on
    const plinthMaterial = studio
      ? new MeshStandardMaterial({ color: night ? 0x2b2b2e : 0xdcd9d2, roughness: 0.85, metalness: 0, envMapIntensity: 0.6 })
      : new MeshPhysicalMaterial({ color: night ? 0x0d0d30 : 0xd8d3f6, roughness: 0.28, metalness: 0.55, clearcoat: 0.6, clearcoatRoughness: 0.25, envMapIntensity: 1.1 })
    const plinth = new Mesh(new CylinderGeometry(2.75, 2.9, PLINTH_H, 96), plinthMaterial)
    plinth.position.y = PLINTH_H / 2
    plinth.receiveShadow = true

    // neon: a thin lit edge on the plinth, a pool of light under the product
    let rim: Mesh | null = null
    if (!studio) {
      rim = new Mesh(new TorusGeometry(2.76, 0.014, 8, 128), new MeshBasicMaterial({ color: new Color(p.glowB), toneMapped: false }))
      rim.rotation.x = Math.PI / 2
      rim.position.y = PLINTH_H
    }
    const pool = new Mesh(
      new CircleGeometry(3.1, 64),
      new MeshBasicMaterial({
        map: glowSprite(),
        color: studio ? new Color(0x000000) : new Color(p.glowA),
        transparent: true,
        opacity: 0,
        blending: studio ? NormalBlending : AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    )
    pool.rotation.x = -Math.PI / 2
    pool.position.y = PLINTH_H + 0.004

    // receives the key light's shadow and nothing else
    const shadow = new Mesh(new PlaneGeometry(9, 9), new ShadowMaterial({ opacity: studio ? (night ? 0.5 : 0.34) : night ? 0.4 : 0.24 }))
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = PLINTH_H + 0.006
    shadow.receiveShadow = true

    root.add(plinth, pool, shadow, hero)
    if (rim) root.add(rim)
    this.scene.add(root)
    this.stations.push({ built, hero, root, plinth, rim, pool, shadow, baseScale })
  }

  /** Bokeh behind the product (neon only); the studio backdrop stays plain. */
  private addDecor(): void {
    const p = this.opts.palette
    if (p.look === 'studio') return
    const span = SPACING * Math.max(0, (this.spec.mode === 'tour' ? this.spec.stations.length : 1) - 1)
    let seed = 31
    const rand = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      return seed / 4294967296
    }
    const disc = bokehDisc()
    const colors = [p.glowA, p.glowB, '#ffffff', p.glowC, p.glowA]
    const count = 14 + Math.round(span / 2.2)
    for (let i = 0; i < count; i++) {
      const m = new SpriteMaterial({ map: disc, color: new Color(colors[i % colors.length]), transparent: true, opacity: 0.08 + rand() * 0.16, blending: AdditiveBlending, depthWrite: false, toneMapped: false })
      const s = new Sprite(m)
      s.position.set(-7 + rand() * (span + 14), 0.6 + rand() * 4.6, -3.5 - rand() * 5)
      s.scale.setScalar(0.4 + rand() * 1.1)
      this.decor.add(s)
    }
  }

  /** Re-tints lights, glow and backdrop from the current theme tokens. */
  applyPalette(palette: StagePalette): void {
    const lookChanged = palette.look !== this.opts.palette.look
    const roomChanged = Math.round(palette.room) !== Math.round(this.opts.palette.room)
    const bgChanged = palette.bgTop !== this.opts.palette.bgTop || palette.bgMid !== this.opts.palette.bgMid || palette.bgBottom !== this.opts.palette.bgBottom
    this.opts.palette = palette
    const studio = palette.look === 'studio'
    const night = palette.room > 0.5

    // models, plinth and decor are built per look and per room, so those rebuild
    if (lookChanged || roomChanged) {
      this.rebuild()
    } else if (bgChanged) {
      this.rebuildBackground()
    }

    this.key.color.set(studio ? 0xffffff : night ? 0xdcd8ff : 0xffffff)
    this.key.intensity = studio ? 2.2 : 2.4
    this.fill.color.set(studio ? 0xdfe4ee : new Color(palette.glowB))
    this.fill.intensity = studio ? 0.9 : 1.6
    this.fill.position.set(7, 3, 5)
    this.rimLight.color.set(studio ? 0xffffff : new Color(palette.glowA))
    this.rimLight.intensity = studio ? 1.1 : 3
    this.rimLight.position.set(5, 3, -6)
    this.hemi.color.set(studio ? 0xffffff : 0x8d86ff)
    this.hemi.groundColor.set(studio ? 0x8b8985 : 0x05061a)
    this.hemi.intensity = studio ? 0.5 : 0.55
    this.dust.visible = !studio
    ;(this.dust.material as PointsMaterial).color.set(palette.dust)
    ;(this.dust.material as PointsMaterial).opacity = night ? 0.6 : 0.4
    this.renderer.toneMappingExposure = studio ? (night ? 1.0 : 1.05) : night ? 1.05 : 1.15
    if (this.bloom) this.bloom.strength = night ? 0.42 : 0.18
    if (!studio) {
      for (const st of this.stations) {
        ;(st.pool.material as MeshBasicMaterial).color.set(palette.glowA)
        if (st.rim) (st.rim.material as MeshBasicMaterial).color.set(palette.glowB)
      }
    }
    this.requestFrame()
  }

  /* ── input ────────────────────────────────────────────────────────────── */

  /** 0..1 across the scroll track that drives the scene. */
  setProgress(progress: number): void {
    // a tour clamps this to its own range; a focus scene may turn a little either way of rest
    this.progressTarget = Math.min(2, Math.max(-2, progress))
    this.requestFrame()
  }

  setPointer(x: number, y: number): void {
    this.pointer.tx = x
    this.pointer.ty = y
    if (!this.opts.reducedMotion) this.requestFrame()
  }

  /** Dragging turns the product; letting go keeps a little momentum. */
  dragBy(dx: number): void {
    this.drag.active = true
    this.drag.yaw += dx
    this.drag.vel = dx
    this.requestFrame()
  }

  dragEnd(): void {
    this.drag.active = false
    this.requestFrame()
  }

  setVisible(visible: boolean): void {
    this.visible = visible
    if (visible) this.requestFrame()
  }

  resize(width: number, height: number, dpr: number): void {
    const w = Math.max(1, Math.round(width))
    const h = Math.max(1, Math.round(height))
    this.size = { w, h }
    // a window is small, so it can afford a sharper pixel ratio than a full screen
    const ratio = Math.min(dpr, w * h > 900_000 ? 1.5 : 2)
    this.renderer.setPixelRatio(ratio)
    this.renderer.setSize(w, h, false)
    this.composer?.setPixelRatio(ratio)
    this.composer?.setSize(w, h)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.requestFrame()
  }

  /* ── frame loop ───────────────────────────────────────────────────────── */

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
    this.intro = reduced ? 1 : Math.min(1, this.intro + dt / 1.5)

    this.progress += (this.progressTarget - this.progress) * k
    this.pointer.x += (this.pointer.tx - this.pointer.x) * k
    this.pointer.y += (this.pointer.ty - this.pointer.y) * k

    // momentum after a drag, then a slow return to the scroll-driven angle
    if (!this.drag.active && !reduced) {
      this.drag.yaw += this.drag.vel
      this.drag.vel *= Math.exp(-dt * 4)
      this.drag.yaw *= Math.exp(-dt * 0.45)
    }

    this.update()
    if (this.composer) this.composer.render()
    else this.renderer.render(this.scene, this.camera)

    const settled =
      this.intro >= 1 &&
      !this.drag.active &&
      Math.abs(this.drag.vel) < 0.0005 &&
      Math.abs(this.drag.yaw) < 0.002 &&
      Math.abs(this.progressTarget - this.progress) < 0.0004 &&
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
    const reduced = this.opts.reducedMotion
    const spec = this.spec
    const studio = this.opts.palette.look === 'studio'
    const k = easeOut(this.intro)
    const distance = fitDistance(this.camera.aspect, FOV)

    let along = 0
    if (spec.mode === 'tour') {
      const n = this.stations.length
      const last = Math.max(1, n - 1)
      const clamped = Math.min(1, Math.max(0, this.progress))
      const pos = clamped * last
      const index = Math.min(n - 1, Math.floor(pos))
      const f = pos - index
      // hold on each station, glide between them
      const glide = smooth(0.28, 0.72, f)
      along = (index + (index < last ? glide : 0)) * SPACING
      const nearest = Math.round(pos)
      if (nearest !== this.active) {
        this.active = nearest
        this.opts.onStation?.(nearest)
      }
      this.stations.forEach((st, i) => {
        const near = smooth(0, 1, Math.max(0, 1 - Math.abs(pos - i)))
        this.poseStation(st, i, k, near, (clamped - i / last) * 0.9, t, reduced, studio)
      })
    } else {
      const st = this.stations[0]
      if (st) this.poseStation(st, 0, k, 1, this.progress * Math.PI * 1.1, t, reduced, studio)
    }

    // the camera: a little above the plinth, looking at the product's middle
    this.camera.position.set(along + this.pointer.x * 0.35, 2.55 + this.pointer.y * -0.2 + (1 - k) * 0.6, distance + (1 - k) * 1.8)
    this.lookAt.set(along + this.pointer.x * 0.1, 1.75, 0)
    this.camera.lookAt(this.lookAt)

    // the key light follows the camera along the line so every station gets a shadow
    this.keyTarget.position.set(along, 0.4, 0)
    this.key.position.set(along - 4, 9, 6)

    // dust drifts up slowly and wraps (neon only)
    if (!studio) {
      const pos3 = this.dust.geometry.getAttribute('position') as BufferAttribute
      for (let i = 0; i < DUST_COUNT; i++) {
        const y = (this.dustBase[i * 3 + 1] + t * (0.05 + (i % 7) * 0.012)) % 7
        pos3.setY(i, y - 0.5)
        pos3.setX(i, this.dustBase[i * 3] + Math.sin(t * 0.3 + i) * 0.12)
      }
      pos3.needsUpdate = true
      this.decor.position.x = -along * 0.12
    }
  }

  private poseStation(st: Station, i: number, k: number, near: number, scrollYaw: number, t: number, reduced: boolean, studio: boolean): void {
    // a slow sway either side of the resting angle; it never accumulates, so the front always comes back round
    const sway = reduced ? 0 : Math.sin(t * 0.4 + i * 1.7) * 0.2
    // the intro turns the product in from the side as it settles onto the plinth
    st.hero.rotation.y = 0.55 * (i % 2 ? -1 : 1) + scrollYaw + this.drag.yaw + sway + (1 - k) * 1.3 + this.pointer.x * 0.2
    st.hero.rotation.x = reduced ? 0 : Math.sin(t * 0.5 + i) * 0.015 + this.pointer.y * 0.04
    st.hero.position.y = PLINTH_H + (1 - k) * 0.7 + (reduced ? 0 : Math.sin(t * 0.8 + i) * 0.015)
    st.hero.scale.setScalar(st.baseScale * (0.9 + 0.1 * k) * (0.9 + 0.1 * near))
    st.plinth.scale.set(0.82 + 0.18 * k, 1, 0.82 + 0.18 * k)
    ;(st.pool.material as MeshBasicMaterial).opacity = (studio ? 0 : 0.18 + 0.3 * near) * k
    st.rim?.scale.set(0.82 + 0.18 * k, 0.82 + 0.18 * k, 1)
  }

  dispose(): void {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.clear()
    this.background?.dispose()
    this.composer?.dispose()
    this.dust.geometry.dispose()
    ;(this.dust.material as PointsMaterial).dispose()
    this.env?.dispose()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
  }
}
