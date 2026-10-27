import { CanvasTexture, LinearFilter, SRGBColorSpace, type Texture } from 'three'

/* Procedural textures for the spatial scene. Everything is drawn on a 2D canvas
   at runtime — no image files — so the stage works offline, themes cleanly and
   adds nothing to the page weight. */

export type UiKind = 'phone' | 'tablet' | 'laptop' | 'tv' | 'watch' | 'wallpaper'

export type ScreenColors = { a: string; b: string; c: string }

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const el = document.createElement('canvas')
  el.width = w
  el.height = h
  const ctx = el.getContext('2d')
  if (!ctx) throw new Error('2D canvas unavailable')
  return [el, ctx]
}

function finish(el: HTMLCanvasElement): CanvasTexture {
  const tex = new CanvasTexture(el)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  tex.minFilter = LinearFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  return tex
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

/** Deterministic pseudo-random so every render of a texture is identical. */
function rng(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** A soft diagonal wallpaper with light blobs, dithered so dark gradients do not band. */
function wallpaper(ctx: CanvasRenderingContext2D, w: number, h: number, c: ScreenColors, seed: number): void {
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, c.a)
  g.addColorStop(0.6, c.b)
  g.addColorStop(1, '#05061a')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  const rand = rng(seed)
  for (let i = 0; i < 4; i++) {
    const x = rand() * w
    const y = rand() * h
    const r = (0.35 + rand() * 0.5) * Math.max(w, h)
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r)
    rg.addColorStop(0, i % 2 ? `${c.c}66` : `${c.a}88`)
    rg.addColorStop(1, 'transparent')
    ctx.fillStyle = rg
    ctx.fillRect(0, 0, w, h)
  }
  const img = ctx.getImageData(0, 0, w, h)
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * 5
    img.data[i] += n
    img.data[i + 1] += n
    img.data[i + 2] += n
  }
  ctx.putImageData(img, 0, 0)
}

const TILE_HUES = ['#7b6cff', '#3fd2ff', '#ff5fd2', '#ffb066', '#5eeab0', '#a99dff', '#ff7a99', '#6ad1ff']

function appTiles(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, cols: number, rows: number, seed: number): void {
  const rand = rng(seed)
  const gap = Math.min(w / cols, h / rows) * 0.22
  const tw = (w - gap * (cols - 1)) / cols
  const th = (h - gap * (rows - 1)) / rows
  const size = Math.min(tw, th)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = x0 + c * (tw + gap) + (tw - size) / 2
      const y = y0 + r * (th + gap) + (th - size) / 2
      const hue = TILE_HUES[Math.floor(rand() * TILE_HUES.length)]
      const g = ctx.createLinearGradient(x, y, x + size, y + size)
      g.addColorStop(0, hue)
      g.addColorStop(1, '#1b1a55')
      ctx.fillStyle = g
      roundRect(ctx, x, y, size, size, size * 0.26)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.beginPath()
      ctx.arc(x + size / 2, y + size / 2, size * 0.14, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

function glassBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.fillStyle = 'rgba(255,255,255,0.14)'
  roundRect(ctx, x, y, w, h, r)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.28)'
  ctx.lineWidth = 2
  roundRect(ctx, x, y, w, h, r)
  ctx.stroke()
}

/** A convincing device screen for each product class. */
export function uiTexture(kind: UiKind, colors: ScreenColors, seed = 7): Texture {
  switch (kind) {
    case 'phone': {
      const [el, ctx] = canvas(512, 1040)
      wallpaper(ctx, 512, 1040, colors, seed)
      ctx.fillStyle = '#05050f'
      roundRect(ctx, 188, 30, 136, 40, 20)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.font = '600 92px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('9:41', 256, 250)
      ctx.font = '500 26px system-ui, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.fillText('Thursday 29 October', 256, 296)
      glassBar(ctx, 40, 340, 432, 150, 38)
      appTiles(ctx, 52, 380, 408, 72, 5, 1, seed + 1)
      appTiles(ctx, 40, 540, 432, 330, 4, 3, seed + 2)
      glassBar(ctx, 40, 920, 432, 92, 40)
      appTiles(ctx, 56, 934, 400, 64, 4, 1, seed + 3)
      return finish(el)
    }
    case 'tablet': {
      const [el, ctx] = canvas(1024, 720)
      wallpaper(ctx, 1024, 720, colors, seed)
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.font = '600 78px system-ui, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('10:08', 60, 120)
      glassBar(ctx, 60, 170, 430, 250, 40)
      glassBar(ctx, 520, 170, 444, 250, 40)
      appTiles(ctx, 70, 440, 884, 190, 8, 2, seed + 4)
      glassBar(ctx, 250, 650, 524, 54, 27)
      return finish(el)
    }
    case 'laptop': {
      const [el, ctx] = canvas(1280, 800)
      wallpaper(ctx, 1280, 800, colors, seed)
      ctx.fillStyle = 'rgba(8,8,32,0.55)'
      ctx.fillRect(0, 0, 1280, 36)
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.beginPath()
      ctx.arc(26, 18, 7, 0, Math.PI * 2)
      ctx.fill()
      glassBar(ctx, 150, 120, 560, 420, 30)
      glassBar(ctx, 740, 200, 390, 290, 30)
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      for (let i = 0; i < 6; i++) {
        roundRect(ctx, 190, 170 + i * 52, 300 + ((i * 53) % 160), 18, 9)
        ctx.fill()
      }
      glassBar(ctx, 350, 700, 580, 70, 35)
      appTiles(ctx, 366, 708, 548, 54, 9, 1, seed + 5)
      return finish(el)
    }
    case 'tv': {
      const [el, ctx] = canvas(1280, 720)
      wallpaper(ctx, 1280, 720, colors, seed)
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      ctx.font = '700 64px system-ui, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('Good evening', 70, 110)
      appTiles(ctx, 60, 170, 1160, 440, 6, 3, seed + 6)
      return finish(el)
    }
    case 'watch': {
      const [el, ctx] = canvas(512, 512)
      ctx.fillStyle = '#04040f'
      ctx.fillRect(0, 0, 512, 512)
      const rings: Array<[number, string, number]> = [
        [210, '#ff5fd2', 0.78],
        [168, '#5eeab0', 0.62],
        [126, '#3fd2ff', 0.88],
      ]
      for (const [r, hue, f] of rings) {
        ctx.lineCap = 'round'
        ctx.lineWidth = 30
        ctx.strokeStyle = `${hue}33`
        ctx.beginPath()
        ctx.arc(256, 256, r, 0, Math.PI * 2)
        ctx.stroke()
        ctx.strokeStyle = hue
        ctx.beginPath()
        ctx.arc(256, 256, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f)
        ctx.stroke()
      }
      ctx.fillStyle = '#fff'
      ctx.font = '700 70px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('10:09', 256, 282)
      return finish(el)
    }
    default: {
      const [el, ctx] = canvas(1024, 1024)
      wallpaper(ctx, 1024, 1024, colors, seed)
      return finish(el)
    }
  }
}

/** A soft round light — bokeh, glows and dust all use this one sprite. */
export function glowSprite(): Texture {
  const [el, ctx] = canvas(128, 128)
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)')
  g.addColorStop(0.6, 'rgba(255,255,255,0.12)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  return finish(el)
}

/** A ring-shaped bokeh disc with a bright edge, like an out-of-focus lamp. */
export function bokehDisc(): Texture {
  const [el, ctx] = canvas(128, 128)
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 62)
  g.addColorStop(0, 'rgba(255,255,255,0.35)')
  g.addColorStop(0.82, 'rgba(255,255,255,0.45)')
  g.addColorStop(0.93, 'rgba(255,255,255,0.95)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  return finish(el)
}

/** A vertical colour ramp used as scene background and floor fade. */
export function gradientTexture(stops: Array<[number, string]>, w = 4, h = 512): Texture {
  const [el, ctx] = canvas(w, h)
  const g = ctx.createLinearGradient(0, 0, 0, h)
  for (const [at, color] of stops) g.addColorStop(at, color)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  return finish(el)
}

/** Fine vertical stripes — a speaker grille, a keyboard deck, a book spine. */
export function stripeTexture(base: string, line: string, count: number): Texture {
  const [el, ctx] = canvas(256, 256)
  ctx.fillStyle = base
  ctx.fillRect(0, 0, 256, 256)
  ctx.fillStyle = line
  const step = 256 / count
  for (let i = 0; i < count; i++) ctx.fillRect(i * step + step * 0.35, 0, step * 0.3, 256)
  return finish(el)
}
