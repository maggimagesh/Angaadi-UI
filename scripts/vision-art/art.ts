/* Renders one Vision-theme product still.

   Opened by render.mjs as  art.html?item=phone&variant=0&shape=square
     item     phone | laptop | tv | headphones | watch | tablet | kitchen | fashion | beauty | books | sports | grocery
     variant  0–3 (colourway)
     shape    square (product tile) | wide (department / hero art)
   When the frame is drawn it sets  window.__artReady = true. */

import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  Box3,
  CanvasTexture,
  CircleGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { createNeonEnvironment } from '../../src/vision/environment'
import { GlassPanel } from '../../src/vision/glass'
import { buildModel, MODEL_KINDS, MODEL_STYLES, type ModelKind } from '../../src/vision/models'
import { bokehDisc, glowSprite, gradientTexture } from '../../src/vision/textures'

declare global {
  interface Window {
    __artReady?: boolean
    __artError?: string
  }
}

const params = new URLSearchParams(location.search)
const item = (params.get('item') ?? 'phone') as ModelKind
const variant = parseInt(params.get('variant') ?? '0', 10) || 0
const shape = params.get('shape') === 'wide' ? 'wide' : 'square'
const SIZE = shape === 'wide' ? { w: 1200, h: 900 } : { w: 800, h: 800 }

if (!MODEL_KINDS.includes(item)) throw new Error(`unknown item ${item}`)

function rng(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** How each product is posed, and which companions join it in the wide art. */
type Pose = { rotY: number; rotX: number; hover: number; fit: number; companion?: 'phoneBack' }
const POSES: Record<ModelKind, Pose> = {
  phone: { rotY: 0.38, rotX: 0.03, hover: 0.12, fit: 1, companion: 'phoneBack' },
  laptop: { rotY: -0.5, rotX: 0, hover: 0.05, fit: 1.12 },
  tv: { rotY: -0.3, rotX: 0, hover: 0.04, fit: 1.05 },
  headphones: { rotY: 0, rotX: 0, hover: 0.18, fit: 0.96 },
  watch: { rotY: 0, rotX: 0, hover: 0.2, fit: 1.12 },
  tablet: { rotY: -0.5, rotX: 0.04, hover: 0.25, fit: 1.05 },
  kitchen: { rotY: 0, rotX: 0, hover: 0.04, fit: 1.02 },
  fashion: { rotY: 0, rotX: 0, hover: 0.22, fit: 1.1 },
  beauty: { rotY: 0, rotX: 0, hover: 0.04, fit: 1 },
  books: { rotY: 0, rotX: 0, hover: 0.04, fit: 1.12 },
  sports: { rotY: 0, rotX: 0, hover: 0.04, fit: 1.05 },
  grocery: { rotY: 0, rotX: 0, hover: 0.04, fit: 1.05 },
}

async function main(): Promise<void> {
  const canvas = document.getElementById('stage') as HTMLCanvasElement
  const renderer = new WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(1)
  renderer.setSize(SIZE.w, SIZE.h, false)
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05

  const style = MODEL_STYLES[variant % MODEL_STYLES.length]
  const scene = new Scene()
  // the haze sits on the horizon (about 0.39 down the frame); the floor below it is dark
  scene.background = gradientTexture(
    [
      [0, '#17164f'],
      [0.2, '#242166'],
      [0.36, '#37328a'],
      [0.392, '#0d0c38'],
      [1, '#05061a'],
    ],
    4,
    512,
  )
  scene.background.colorSpace = SRGBColorSpace

  const env = createNeonEnvironment(renderer, { base: 0x05061c, key: 0xe6e6ff, a: style.accent, b: style.accent2, c: 0xff5fd2 })
  scene.environment = env.texture

  const key = new DirectionalLight(0xdcd8ff, 2.2)
  key.position.set(-4, 8, 6)
  const rim = new DirectionalLight(style.accent, 3.4)
  rim.position.set(5, 3, -6)
  const rim2 = new DirectionalLight(style.accent2, 2.2)
  rim2.position.set(-6, 2, -4)
  scene.add(key, rim, rim2, new HemisphereLight(0x8d86ff, 0x05061a, 0.55))

  // the model, posed and fitted to the frame
  const rig = new Group()
  const model = buildModel(item, variant)
  const pose = POSES[item]
  const hero = new Group()
  hero.add(model.group)
  hero.rotation.set(pose.rotX, pose.rotY, 0)
  rig.add(hero)
  let companion: ReturnType<typeof buildModel> | null = null
  if (shape === 'wide' && pose.companion === 'phoneBack') {
    hero.position.x = -0.7
    companion = buildModel('phone', variant + 1)
    const c = new Group()
    c.add(companion.group)
    c.rotation.set(0.03, Math.PI - 0.38, 0)
    c.position.set(0.85, 0, -0.45)
    rig.add(c)
  }

  /** Bounds of the solid model — glow planes are tagged noFit so they do not shrink it. */
  const solidBounds = (root: Object3D): Box3 => {
    const b = new Box3()
    const visit = (o: Object3D) => {
      if (o.userData.noFit) return
      if ((o as Mesh).isMesh) b.expandByObject(o, false)
      o.children.forEach(visit)
    }
    root.updateMatrixWorld(true)
    visit(root)
    return b
  }
  const box = solidBounds(rig)
  const size = box.getSize(new Vector3())
  const target = shape === 'wide' ? { w: 5.3, h: 2.95 } : { w: 3.7, h: 3.25 }
  const scale = Math.min(target.w / size.x, target.h / size.y) * pose.fit
  rig.scale.setScalar(scale)
  rig.position.y = pose.hover
  rig.updateMatrixWorld(true)
  const fitted = solidBounds(rig)
  rig.position.x -= (fitted.min.x + fitted.max.x) / 2

  // reflection: the same rig mirrored under the floor, faded out by a floor veil
  const mirror = rig.clone(true)
  mirror.scale.y *= -1
  mirror.position.y = -rig.position.y
  scene.add(rig, mirror)

  const floorFade = new CanvasTexture(
    (() => {
      const c = document.createElement('canvas')
      c.width = c.height = 256
      const ctx = c.getContext('2d')!
      const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
      g.addColorStop(0, 'rgba(10,10,40,0.6)')
      g.addColorStop(0.05, 'rgba(10,10,40,0.78)')
      g.addColorStop(0.11, 'rgba(10,10,40,0.92)')
      g.addColorStop(0.26, 'rgba(8,8,34,1)')
      g.addColorStop(1, 'rgba(8,8,34,1)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, 256, 256)
      return c
    })(),
  )
  floorFade.colorSpace = SRGBColorSpace
  const veil = new Mesh(new PlaneGeometry(160, 160), new MeshBasicMaterial({ map: floorFade, transparent: true, depthWrite: false }))
  veil.rotation.x = -Math.PI / 2
  veil.position.y = 0.002
  scene.add(veil)

  // a pool of light and a thin ring on the floor
  const pool = new Mesh(
    new CircleGeometry(3.4, 64),
    new MeshBasicMaterial({ map: glowSprite(), color: style.accent, transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
  )
  pool.rotation.x = -Math.PI / 2
  pool.position.y = 0.004
  pool.scale.set(1.15, 0.8, 1)
  scene.add(pool)
  const ring = new Mesh(new TorusGeometry(2.3, 0.008, 6, 128), new MeshBasicMaterial({ color: style.accent2, toneMapped: false }))
  ring.rotation.x = -Math.PI / 2
  ring.scale.set(1.22, 0.8, 1)
  ring.position.y = 0.006
  scene.add(ring)

  // the floating pane behind the product, as in the key art
  const pane = new GlassPanel({
    width: shape === 'wide' ? 6.5 : 4.4,
    height: shape === 'wide' ? 3.95 : 4.0,
    radius: 0.4,
    fill: 0x10103a,
    fillAlpha: 0.78,
    rim: 0xd6d6f5,
    streak: 0xcfcfe6,
    glow: style.accent,
    pill: true,
  })
  pane.position.set(0, shape === 'wide' ? 2.55 : 2.3, -2.4)
  scene.add(pane)

  // out-of-focus lights
  const rand = rng(style.seed * 31 + (shape === 'wide' ? 7 : 3))
  const disc = bokehDisc()
  const colors = [style.accent, style.accent2, 0xffffff, 0xff5fd2, style.accent]
  const count = shape === 'wide' ? 22 : 16
  for (let i = 0; i < count; i++) {
    const m = new SpriteMaterial({ map: disc, color: colors[i % colors.length], transparent: true, opacity: 0.1 + rand() * 0.22, blending: AdditiveBlending, depthWrite: false, toneMapped: false })
    const s = new Sprite(m)
    const z = -3 - rand() * 6
    const spread = shape === 'wide' ? 8 : 5.4
    s.position.set((rand() - 0.5) * spread * 1.6, 0.3 + rand() * 5.2, z)
    s.scale.setScalar(0.35 + rand() * 1.1)
    scene.add(s)
  }
  // a couple of vertical light bars, like lamps seen across the room
  for (const [x, c] of [[-4.6, style.accent], [4.9, style.accent2]] as Array<[number, number]>) {
    const bar = new Mesh(new PlaneGeometry(0.14, 5.4), new MeshBasicMaterial({ map: glowSprite(), color: c, transparent: true, opacity: 0.55, blending: AdditiveBlending, depthWrite: false, toneMapped: false }))
    bar.position.set(shape === 'wide' ? x : x * 0.62, 2.6, -7)
    bar.scale.set(2.2, 1, 1)
    scene.add(bar)
  }

  const camera = new PerspectiveCamera(28, SIZE.w / SIZE.h, 0.1, 100)
  camera.position.set(0, shape === 'wide' ? 2.15 : 2.0, 11.6)
  camera.lookAt(0, shape === 'wide' ? 1.55 : 1.45, 0)

  const composer = new EffectComposer(renderer)
  composer.setSize(SIZE.w, SIZE.h)
  composer.addPass(new RenderPass(scene, camera))
  composer.addPass(new UnrealBloomPass(new Vector2(SIZE.w, SIZE.h), 0.5, 0.75, 0.86))
  composer.addPass(new OutputPass())
  // a whisper of grain so the dark gradients do not band in JPEG
  composer.addPass(
    new ShaderPass({
      uniforms: { tDiffuse: { value: null } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader:
        'uniform sampler2D tDiffuse; varying vec2 vUv; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }' +
        'void main(){ vec4 c = texture2D(tDiffuse, vUv); float n = (h(vUv * 1371.0) + h(vUv * 911.0 + 3.0) - 1.0) * 0.012; gl_FragColor = vec4(c.rgb + n, 1.0); }',
    }),
  )
  composer.render()

  window.__artReady = true
}

main().catch((e) => {
  window.__artError = String(e && (e as Error).stack ? (e as Error).stack : e)
  window.__artReady = true
})
