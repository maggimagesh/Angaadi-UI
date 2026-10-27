import {
  BackSide,
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SphereGeometry,
  type Texture,
  type WebGLRenderer,
} from 'three'

/* A tiny studio built from emissive panels in a dark dome, baked once into a
   PMREM cube. Glossy bodies reflect these coloured strips, which is what makes
   dark glass read as lit by a neon room instead of flat black. */

export type EnvColors = {
  base: number
  key: number
  a: number
  b: number
  c: number
}

export type NeonEnvironment = { texture: Texture; dispose: () => void }

export function createNeonEnvironment(renderer: WebGLRenderer, colors: EnvColors): NeonEnvironment {
  const scene = new Scene()
  const disposables: Array<{ dispose: () => void }> = []

  const dome = new Mesh(new SphereGeometry(60, 32, 16), new MeshBasicMaterial({ color: colors.base, side: BackSide }))
  scene.add(dome)
  disposables.push(dome.geometry, dome.material as MeshBasicMaterial)

  const panel = (w: number, h: number, color: number, pos: [number, number, number], intensity: number) => {
    const material = new MeshBasicMaterial({ color: new Color(color).multiplyScalar(intensity), side: DoubleSide })
    const mesh = new Mesh(new PlaneGeometry(w, h), material)
    mesh.position.set(...pos)
    mesh.lookAt(0, 0, 0)
    scene.add(mesh)
    disposables.push(mesh.geometry, material)
  }

  panel(34, 9, colors.key, [0, 30, 12], 3.4) // overhead softbox
  panel(7, 34, colors.a, [-34, 4, 8], 2.6) // left strip
  panel(7, 34, colors.b, [34, 2, 6], 2.4) // right strip
  panel(40, 6, colors.c, [0, -8, -34], 1.8) // rear wash
  panel(16, 16, colors.key, [14, 8, -36], 1.5) // back-right window
  panel(10, 26, colors.a, [-20, 6, -34], 1.6)

  const pmrem = new PMREMGenerator(renderer)
  const target = pmrem.fromScene(scene, 0.03)
  pmrem.dispose()
  disposables.forEach((d) => d.dispose())

  return { texture: target.texture, dispose: () => target.dispose() }
}
