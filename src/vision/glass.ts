import { Color, CustomBlending, Mesh, OneFactor, OneMinusSrcAlphaFactor, PlaneGeometry, ShaderMaterial, Vector2 } from 'three'

/* The signature object: a floating pane of dark frosted glass with a thin rim
   of light, two soft specular streaks (top edge, bottom edge) and a small
   camera pill in the corner — drawn entirely in a fragment shader from a
   rounded-rectangle distance field, so it stays crisp at any size and costs one
   quad. */

export type GlassPanelOptions = {
  width: number
  height: number
  /** Corner radius in world units. */
  radius: number
  fill: number
  fillAlpha: number
  rim: number
  streak: number
  glow: number
  pill: boolean
  /** a flat plate: one even fill, a hairline rim, no sheen or streaks (the Studio look) */
  flat?: boolean
}

const VERTEX = /* glsl */ `
  varying vec2 vP;
  void main() {
    vP = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAGMENT = /* glsl */ `
  uniform vec2 uSize;
  uniform float uRadius;
  uniform vec3 uFill;
  uniform float uFillAlpha;
  uniform vec3 uRim;
  uniform vec3 uStreak;
  uniform vec3 uGlow;
  uniform float uPill;
  uniform float uOpacity;
  uniform float uShine;
  uniform float uFlat;
  varying vec2 vP;

  float sdRoundRect(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
  float band(float x, float center, float width) {
    float t = (x - center) / width;
    return exp(-t * t);
  }

  void main() {
    vec2 hs = uSize * 0.5;
    float d = sdRoundRect(vP, hs, uRadius);
    float aa = max(fwidth(d), 1e-5);
    float inside = 1.0 - smoothstep(-aa, aa, d);
    float unit = min(uSize.x, uSize.y);

    vec2 n = vP / hs;

    // body of the glass: deeper in the middle, a sheen drifting from the top-left
    float diag = dot(n, normalize(vec2(-0.55, 0.85))) * 0.5 + 0.5;
    float vignette = smoothstep(1.35, 0.1, length(n * vec2(0.9, 1.1)));
    vec3 body = uFill * (0.55 + 0.7 * diag * diag) * (0.7 + 0.5 * vignette);
    body += uGlow * 0.07 * smoothstep(0.2, 1.0, 1.0 - diag) * vignette;
    body = mix(body, uFill, uFlat);

    // thin rim light, strongest at the top-left and bottom-right corners
    float rimLine = band(d + unit * 0.004, 0.0, unit * 0.0075);
    float cornerA = pow(max(dot(normalize(n + 1e-4), normalize(vec2(-1.0, 1.0))), 0.0), 3.0);
    float cornerB = pow(max(dot(normalize(n + 1e-4), normalize(vec2(1.0, -1.0))), 0.0), 3.0);
    float rimI = mix(0.28 + 0.9 * (cornerA + cornerB), 0.45, uFlat);

    // the two soft streaks that run along the top and bottom edges
    float topS = band(n.x, 0.2, 0.2) * band(d + unit * 0.003, 0.0, unit * 0.012) * step(0.0, n.y);
    float botS = band(n.x, 0.4, 0.16) * band(d + unit * 0.003, 0.0, unit * 0.014) * step(0.0, -n.y);
    float streaks = (topS * 1.1 + botS * 1.35) * uShine;

    // that light spilling a little past the edge
    float outside = 1.0 - inside;
    float spill = outside * exp(-max(d, 0.0) / (unit * 0.05)) *
      (band(n.x, 0.2, 0.32) * step(0.0, n.y) * 0.55 + band(n.x, 0.4, 0.26) * step(0.0, -n.y) * 0.7) * uShine;

    // sensor pill and dot, top-left
    float pill = 0.0;
    float pillRing = 0.0;
    if (uPill > 0.5) {
      vec2 pc = vec2(-hs.x + uSize.x * 0.134, hs.y - uSize.y * 0.073);
      float pd = sdRoundRect(vP - pc, vec2(uSize.x * 0.045, uSize.y * 0.026), uSize.y * 0.026);
      pill = 1.0 - smoothstep(-aa, aa, pd);
      pillRing = band(pd, 0.0, unit * 0.004) * 0.7;
      vec2 dc = vec2(-hs.x + uSize.x * 0.062, pc.y);
      float dd = length(vP - dc) - uSize.x * 0.011;
      pill = max(pill, 1.0 - smoothstep(-aa, aa, dd));
      pillRing = max(pillRing, band(dd, 0.0, unit * 0.004) * 0.7);
    }

    vec3 rgb = body * inside * uFillAlpha;
    float alpha = inside * uFillAlpha;
    rgb = mix(rgb, vec3(0.012, 0.012, 0.045) * uFillAlpha, pill * inside);
    rgb += uRim * rimLine * rimI * inside * 0.8;
    rgb += uRim * pillRing * 0.5 * inside;
    rgb += uStreak * streaks * inside;
    rgb += uGlow * spill * 0.9;
    alpha = max(alpha, max(rimLine * rimI * inside * 0.85, max(streaks * inside, spill * 0.9)));

    gl_FragColor = vec4(rgb * uOpacity, alpha * uOpacity);
  }
`

export class GlassPanel extends Mesh<PlaneGeometry, ShaderMaterial> {
  readonly panelWidth: number
  readonly panelHeight: number

  constructor(options: GlassPanelOptions) {
    const pad = Math.min(options.width, options.height) * 0.22
    super(
      new PlaneGeometry(options.width + pad * 2, options.height + pad * 2),
      new ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: CustomBlending,
        blendSrc: OneFactor,
        blendDst: OneMinusSrcAlphaFactor,
        uniforms: {
          uSize: { value: new Vector2(options.width, options.height) },
          uRadius: { value: options.radius },
          uFill: { value: new Color(options.fill) },
          uFillAlpha: { value: options.fillAlpha },
          uRim: { value: new Color(options.rim) },
          uStreak: { value: new Color(options.streak) },
          uGlow: { value: new Color(options.glow) },
          uPill: { value: options.pill ? 1 : 0 },
          uOpacity: { value: 1 },
          uShine: { value: 1 },
          uFlat: { value: options.flat ? 1 : 0 },
        },
      }),
    )
    this.panelWidth = options.width
    this.panelHeight = options.height
    this.renderOrder = 2
  }

  /** 0 hides the pane entirely, 1 shows it at full strength. */
  set opacity(value: number) {
    this.material.uniforms.uOpacity.value = value
  }

  set shine(value: number) {
    this.material.uniforms.uShine.value = value
  }

  setColors(colors: { fill?: number; rim?: number; streak?: number; glow?: number }): void {
    const u = this.material.uniforms
    if (colors.fill !== undefined) (u.uFill.value as Color).set(colors.fill)
    if (colors.rim !== undefined) (u.uRim.value as Color).set(colors.rim)
    if (colors.streak !== undefined) (u.uStreak.value as Color).set(colors.streak)
    if (colors.glow !== undefined) (u.uGlow.value as Color).set(colors.glow)
  }

  dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
  }
}
