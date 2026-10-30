/* Renders one Studio-theme product still: a matte object on a plain warm sweep,
   one soft light, a contact shadow. No glow, no reflection, no bloom.

   (Same poses and fitting as art.ts, which draws the neon Vision stills.)

   Opened by render.mjs as  art-studio.html?item=phone&variant=0&shape=square
     item     phone | laptop | tv | headphones | watch | tablet | kitchen | fashion | beauty | books | sports | grocery
     variant  0–3 (colourway)
     shape    square (product tile) | wide (department / hero art)
   When the frame is drawn it sets  window.__artReady = true. */

import {
  ACESFilmicToneMapping,
  Box3,
  CircleGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { createNeonEnvironment } from '../../src/vision/environment'
import { buildModel, MODEL_KINDS, type ModelKind } from '../../src/vision/models'
import { glowSprite, gradientTexture } from '../../src/vision/textures'

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
  renderer.toneMappingExposure = 1.0

  const scene = new Scene()
  // a warm paper sweep that darkens a little toward the floor
  scene.background = gradientTexture(
    [
      [0, '#f3f2ee'],
      [0.5, '#eceae5'],
      [1, '#dedbd4'],
    ],
    4,
    512,
  )
  scene.background.colorSpace = SRGBColorSpace

  const env = createNeonEnvironment(renderer, { base: 0xcfcdc8, key: 0xffffff, a: 0xe9e9ec, b: 0xc8ccd4, c: 0xb9b6ae })
  scene.environment = env.texture

  const key = new DirectionalLight(0xffffff, 2.0)
  key.position.set(-4, 8, 6)
  const fill = new DirectionalLight(0xdfe4ee, 0.9)
  fill.position.set(6, 3, 5)
  const rim = new DirectionalLight(0xffffff, 1.1)
  rim.position.set(5, 3, -6)
  scene.add(key, fill, rim, new HemisphereLight(0xffffff, 0x8b8985, 0.55))

  // the model, posed and fitted to the frame
  const rig = new Group()
  const model = buildModel(item, variant, 'studio')
  const pose = POSES[item]
  const hero = new Group()
  hero.add(model.group)
  hero.rotation.set(pose.rotX, pose.rotY, 0)
  rig.add(hero)
  let companion: ReturnType<typeof buildModel> | null = null
  if (shape === 'wide' && pose.companion === 'phoneBack') {
    hero.position.x = -0.7
    companion = buildModel('phone', variant + 1, 'studio')
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
  const target = shape === 'wide' ? { w: 6.6, h: 3.7 } : { w: 4.6, h: 4.1 }
  const scale = Math.min(target.w / size.x, target.h / size.y) * pose.fit
  rig.scale.setScalar(scale)
  rig.position.y = 0.0
  rig.updateMatrixWorld(true)
  const fitted = solidBounds(rig)
  rig.position.x -= (fitted.min.x + fitted.max.x) / 2

  scene.add(rig)

  // a contact shadow: soft, neutral, a little wider than the object
  const span = fitted.max.x - fitted.min.x
  const shadow = new Mesh(
    new CircleGeometry(1, 64),
    new MeshBasicMaterial({ map: glowSprite(), color: 0x000000, transparent: true, opacity: 0.42, depthWrite: false, toneMapped: false }),
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = 0.003
  shadow.scale.set(span * 0.78, span * 0.2, 1)
  scene.add(shadow)

  const camera = new PerspectiveCamera(28, SIZE.w / SIZE.h, 0.1, 100)
  camera.position.set(0, shape === 'wide' ? 2.15 : 2.0, 11.6)
  camera.lookAt(0, shape === 'wide' ? 1.55 : 1.45, 0)

  const composer = new EffectComposer(renderer)
  composer.setSize(SIZE.w, SIZE.h)
  composer.addPass(new RenderPass(scene, camera))
  composer.addPass(new OutputPass())
  // a whisper of grain so the light gradients do not band in JPEG
  composer.addPass(
    new ShaderPass({
      uniforms: { tDiffuse: { value: null } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader:
        'uniform sampler2D tDiffuse; varying vec2 vUv; float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }' +
        'void main(){ vec4 c = texture2D(tDiffuse, vUv); float n = (h(vUv * 1371.0) + h(vUv * 911.0 + 3.0) - 1.0) * 0.01; gl_FragColor = vec4(c.rgb + n, 1.0); }',
    }),
  )
  composer.render()

  window.__artReady = true
}

main().catch((e) => {
  window.__artError = String(e && (e as Error).stack ? (e as Error).stack : e)
  window.__artReady = true
})
