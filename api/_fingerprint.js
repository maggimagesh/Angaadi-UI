/*
 * Browser fingerprint for /request-headers, after CreepJS
 * (abrahamjuliot.github.io/creepjs). Runs in the visitor's browser, below the
 * server-rendered headers table, and only reads what the browser exposes about
 * itself. Nothing is sent anywhere: the page's CSP sets connect-src 'none'.
 *
 * The leading underscore keeps Vercel from deploying this file as a function.
 * fingerprintMain is written as real code and shipped with .toString(), so it
 * must stay self-contained: no imports, no references to module scope.
 */

/* global document, window, navigator, screen, Intl, Worker, Blob, URL, matchMedia */
function fingerprintMain() {
  'use strict'
  var root = document.getElementById('fingerprint')
  if (!root) return

  // ── helpers ──────────────────────────────────────────────────────────────
  function hash(str) {
    // cyrb53: fast, stable 53-bit hash, shown as hex
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i)
      h1 = Math.imul(h1 ^ ch, 2654435761)
      h2 = Math.imul(h2 ^ ch, 1597334677)
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0')
  }
  function fmt(v) {
    if (v === undefined) return 'unsupported'
    if (v === null) return 'null'
    if (Array.isArray(v)) return v.length ? v.join(', ') : '(none)'
    if (typeof v === 'object') return JSON.stringify(v)
    return String(v)
  }
  function attempt(fn, fallback) {
    try { return fn() } catch (e) { return fallback === undefined ? 'error: ' + (e && e.name) : fallback }
  }
  function withTimeout(promise, ms, fallback) {
    return Promise.race([promise, new Promise(function (r) { setTimeout(function () { r(fallback) }, ms) })])
      .catch(function () { return fallback })
  }

  // Sections render as soon as they are known; async ones fill in later.
  var hashes = {}
  // Values that change between visits are kept out of the fingerprint ID.
  var VOLATILE = { summary: 1, storage: 1, consistency: 1 }
  function section(id, title) {
    var el = document.createElement('section')
    el.id = 'fp-' + id
    el.setAttribute('data-testid', 'fp-' + id)
    var h = document.createElement('h2')
    var name = document.createElement('span')
    name.textContent = title
    var code = document.createElement('code')
    code.className = 'hash'
    h.appendChild(name)
    h.appendChild(document.createTextNode(' '))
    h.appendChild(code)
    var table = document.createElement('table')
    var thead = document.createElement('thead')
    thead.innerHTML = '<tr><th scope="col">Property</th><th scope="col">Value</th></tr>'
    var tbody = document.createElement('tbody')
    table.appendChild(thead)
    table.appendChild(tbody)
    el.appendChild(h)
    el.appendChild(table)
    root.appendChild(el)
    return {
      set: function (rows) {
        tbody.textContent = ''
        rows.forEach(function (r) {
          var tr = document.createElement('tr')
          tr.setAttribute('data-key', r[0])
          var th = document.createElement('th')
          th.scope = 'row'
          th.textContent = r[0]
          var td = document.createElement('td')
          td.textContent = fmt(r[1])
          if (r[2]) td.className = r[2]
          tr.appendChild(th)
          tr.appendChild(td)
          tbody.appendChild(tr)
        })
        var hv = hash(JSON.stringify(rows.map(function (r) { return [r[0], fmt(r[1])] })))
        code.textContent = hv
        if (!VOLATILE[id]) hashes[id] = hv
      },
    }
  }
  var bad = function (flag) { return flag ? 'flag' : '' }

  // ── summary (filled last) ───────────────────────────────────────────────
  var summary = section('summary', 'Fingerprint summary')
  summary.set([['Fingerprint ID', '…']])
  var signals = { headless: [], likeHeadless: [], lies: [], workerMismatch: [], headerMismatch: [] }
  // The verdict sections sit under the summary, as on CreepJS; they fill in last.
  var headless = section('headless', 'Headless & automation')
  var lies = section('lies', 'Lies & API tampering')
  var worker = section('worker', 'Worker scope vs window')

  // ── HTTP headers vs JavaScript ─────────────────────────────────────────
  var consistency = section('consistency', 'HTTP headers vs JavaScript')
  function headerValue(name) {
    var row = document.querySelector('#request-headers-table tr[data-header="' + name + '"] td')
    return row ? row.textContent : null
  }
  var uad = navigator.userAgentData
  ;(function () {
    var rows = []
    function compare(label, header, js, same) {
      var match = header === null || js === undefined ? null : same(header, js)
      if (match === false) signals.headerMismatch.push(label)
      rows.push([label, (header === null ? '(header not sent)' : header) + '  ⟷  ' + fmt(js) + (match === null ? '' : match ? '  ✓ match' : '  ✗ mismatch'), bad(match === false)])
    }
    compare('User-Agent', headerValue('user-agent'), navigator.userAgent, function (a, b) { return a === b })
    compare('Accept-Language → navigator.language', headerValue('accept-language'), navigator.language, function (a, b) {
      return a.split(',')[0].split(';')[0].trim().toLowerCase() === String(b).toLowerCase()
    })
    if (uad) {
      compare('Sec-CH-UA-Platform', headerValue('sec-ch-ua-platform'), uad.platform, function (a, b) { return a.replace(/"/g, '') === b })
      compare('Sec-CH-UA-Mobile', headerValue('sec-ch-ua-mobile'), uad.mobile, function (a, b) { return (a === '?1') === b })
      compare('Sec-CH-UA', headerValue('sec-ch-ua'), uad.brands.map(function (b) { return b.brand + ';v=' + b.version }), function (a, b) {
        return b.every(function (x) { return a.indexOf(x.split(';v=')[0]) > -1 })
      })
    }
    consistency.set(rows)
  })()

  // ── navigator ───────────────────────────────────────────────────────────
  var nav = section('navigator', 'Navigator')
  nav.set([
    ['userAgent', navigator.userAgent],
    ['appVersion', navigator.appVersion],
    ['platform', navigator.platform],
    ['vendor', navigator.vendor],
    ['language', navigator.language],
    ['languages', attempt(function () { return Array.from(navigator.languages) })],
    ['hardwareConcurrency', navigator.hardwareConcurrency],
    ['deviceMemory (GB)', navigator.deviceMemory],
    ['maxTouchPoints', navigator.maxTouchPoints],
    ['cookieEnabled', navigator.cookieEnabled],
    ['doNotTrack', navigator.doNotTrack],
    ['globalPrivacyControl', navigator.globalPrivacyControl],
    ['pdfViewerEnabled', navigator.pdfViewerEnabled],
    ['webdriver', navigator.webdriver, bad(navigator.webdriver)],
    ['plugins', attempt(function () { return Array.from(navigator.plugins).map(function (p) { return p.name }) })],
    ['mimeTypes', attempt(function () { return Array.from(navigator.mimeTypes).map(function (m) { return m.type }) })],
    ['userAgentData.brands', uad ? uad.brands.map(function (b) { return b.brand + ' ' + b.version }) : undefined],
    ['userAgentData.mobile', uad ? uad.mobile : undefined],
    ['userAgentData.platform', uad ? uad.platform : undefined],
  ])

  var hints = section('client-hints', 'User-Agent client hints (high entropy)')
  if (uad && uad.getHighEntropyValues) {
    hints.set([['status', 'reading…']])
    var hintKeys = ['architecture', 'bitness', 'model', 'platformVersion', 'uaFullVersion', 'fullVersionList', 'wow64', 'formFactors']
    var pHints = withTimeout(uad.getHighEntropyValues(hintKeys), 1500, null).then(function (v) {
      hints.set(v ? hintKeys.map(function (k) {
        var val = v[k]
        if (k === 'fullVersionList' && val) val = val.map(function (b) { return b.brand + ' ' + b.version })
        return [k, val]
      }) : [['status', 'unavailable']])
    })
  } else {
    hints.set([['userAgentData', 'unsupported (not a Chromium browser)']])
    pHints = Promise.resolve()
  }

  // ── screen & window ─────────────────────────────────────────────────────
  var scr = section('screen', 'Screen & window')
  scr.set([
    ['screen', screen.width + ' × ' + screen.height],
    ['available', screen.availWidth + ' × ' + screen.availHeight],
    ['colorDepth / pixelDepth', screen.colorDepth + ' / ' + screen.pixelDepth],
    ['devicePixelRatio', window.devicePixelRatio],
    ['window inner', window.innerWidth + ' × ' + window.innerHeight],
    ['window outer', window.outerWidth + ' × ' + window.outerHeight, bad(window.outerWidth === 0)],
    ['orientation', attempt(function () { return screen.orientation.type + ' (' + screen.orientation.angle + '°)' }, undefined)],
    ['touch', 'ontouchstart' in window],
  ])

  // ── timezone & Intl ─────────────────────────────────────────────────────
  var tz = section('timezone', 'Timezone & Intl')
  var ro = attempt(function () { return Intl.DateTimeFormat().resolvedOptions() }, {})
  tz.set([
    ['timeZone', ro.timeZone],
    ['UTC offset (minutes)', -new Date().getTimezoneOffset()],
    ['offset in January / July', -new Date(2024, 0, 1).getTimezoneOffset() + ' / ' + -new Date(2024, 6, 1).getTimezoneOffset()],
    ['locale', ro.locale],
    ['calendar', ro.calendar],
    ['numberingSystem', ro.numberingSystem],
    ['hourCycle', attempt(function () { return Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hourCycle }, undefined)],
    ['number format', attempt(function () { return (1234567.891).toLocaleString() })],
    ['date string', new Date(0).toString()],
  ])

  // ── CSS media features ─────────────────────────────────────────────────
  var css = section('css-media', 'CSS media features')
  function mq(feature, values) {
    for (var i = 0; i < values.length; i++) if (matchMedia('(' + feature + ': ' + values[i] + ')').matches) return values[i]
    return 'no match'
  }
  css.set([
    ['prefers-color-scheme', mq('prefers-color-scheme', ['dark', 'light'])],
    ['prefers-reduced-motion', mq('prefers-reduced-motion', ['reduce', 'no-preference'])],
    ['prefers-reduced-transparency', mq('prefers-reduced-transparency', ['reduce', 'no-preference'])],
    ['prefers-contrast', mq('prefers-contrast', ['more', 'less', 'custom', 'no-preference'])],
    ['forced-colors', mq('forced-colors', ['active', 'none'])],
    ['inverted-colors', mq('inverted-colors', ['inverted', 'none'])],
    ['color-gamut', mq('color-gamut', ['rec2020', 'p3', 'srgb'])],
    ['dynamic-range', mq('dynamic-range', ['high', 'standard'])],
    ['hover / any-hover', mq('hover', ['hover', 'none']) + ' / ' + mq('any-hover', ['hover', 'none'])],
    ['pointer / any-pointer', mq('pointer', ['fine', 'coarse', 'none']) + ' / ' + mq('any-pointer', ['fine', 'coarse', 'none'])],
    ['display-mode', mq('display-mode', ['fullscreen', 'standalone', 'minimal-ui', 'browser'])],
  ])

  // ── canvas 2D ───────────────────────────────────────────────────────────
  var cv = section('canvas', 'Canvas 2D')
  function paint() {
    var c = document.createElement('canvas')
    c.width = 240
    c.height = 60
    var x = c.getContext('2d')
    x.textBaseline = 'top'
    x.font = '16px "Times New Roman", serif'
    x.fillStyle = '#f60'
    x.fillRect(100, 1, 62, 20)
    x.fillStyle = '#069'
    x.fillText('Angaadi fp ✓ 😃 Cwm fjordbank', 2, 15)
    x.fillStyle = 'rgba(102, 204, 0, 0.7)'
    x.beginPath()
    x.arc(200, 30, 20, 0, Math.PI * 2)
    x.fill()
    return { url: c.toDataURL(), ctx: x }
  }
  var canvasRows = attempt(function () {
    var a = paint(), b = paint()
    var randomized = a.url !== b.url
    if (randomized) signals.lies.push('canvas output changes between identical draws')
    var m = a.ctx.measureText('Angaadi fp ✓ 😃 Cwm fjordbank')
    return [
      ['image hash', hash(a.url)],
      ['stable across two identical draws', !randomized, bad(randomized)],
      ['text width', m.width],
      ['text bounding box', [m.actualBoundingBoxLeft, m.actualBoundingBoxRight, m.actualBoundingBoxAscent, m.actualBoundingBoxDescent].map(function (n) { return n === undefined ? '?' : n.toFixed(3) })],
      ['emoji width', a.ctx.measureText('😃🧪🛒').width],
    ]
  }, [['canvas', 'blocked or unsupported']])
  cv.set(canvasRows)

  // ── WebGL ───────────────────────────────────────────────────────────────
  var gl = section('webgl', 'WebGL / GPU')
  var webglRows = attempt(function () {
    var c = document.createElement('canvas')
    var g = c.getContext('webgl') || c.getContext('experimental-webgl')
    if (!g) return [['WebGL', 'unsupported']]
    var dbg = g.getExtension('WEBGL_debug_renderer_info')
    var renderer = dbg ? g.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER)
    var software = /swiftshader|llvmpipe|software|softpipe|mesa offscreen/i.test(renderer)
    if (software) signals.likeHeadless.push('software GPU renderer')
    var p = function (k) { return attempt(function () { var v = g.getParameter(g[k]); return v && v.length !== undefined && typeof v !== 'string' ? Array.from(v) : v }) }
    var c2 = document.createElement('canvas').getContext('webgl2')
    return [
      ['vendor', dbg ? g.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : g.getParameter(g.VENDOR)],
      ['renderer', renderer, bad(software)],
      ['version', g.getParameter(g.VERSION)],
      ['shading language', g.getParameter(g.SHADING_LANGUAGE_VERSION)],
      ['WebGL2', !!c2],
      ['MAX_TEXTURE_SIZE', p('MAX_TEXTURE_SIZE')],
      ['MAX_RENDERBUFFER_SIZE', p('MAX_RENDERBUFFER_SIZE')],
      ['MAX_VIEWPORT_DIMS', p('MAX_VIEWPORT_DIMS')],
      ['MAX_VERTEX_ATTRIBS', p('MAX_VERTEX_ATTRIBS')],
      ['MAX_TEXTURE_IMAGE_UNITS', p('MAX_TEXTURE_IMAGE_UNITS')],
      ['ALIASED_LINE_WIDTH_RANGE', p('ALIASED_LINE_WIDTH_RANGE')],
      ['extensions', (g.getSupportedExtensions() || []).length + ' — hash ' + hash((g.getSupportedExtensions() || []).join())],
    ]
  }, [['WebGL', 'blocked or unsupported']])
  gl.set(webglRows)

  // ── fonts ───────────────────────────────────────────────────────────────
  var fonts = section('fonts', 'Fonts')
  var FONT_LIST = ['Arial', 'Arial Black', 'Calibri', 'Cambria', 'Candara', 'Comic Sans MS', 'Consolas', 'Courier New', 'DejaVu Sans', 'Droid Sans',
    'Futura', 'Garamond', 'Geneva', 'Georgia', 'Helvetica', 'Helvetica Neue', 'Impact', 'Liberation Sans', 'Lucida Console', 'Lucida Grande',
    'Menlo', 'Monaco', 'Noto Sans', 'Noto Color Emoji', 'Optima', 'Palatino', 'Roboto', 'Segoe UI', 'Segoe UI Emoji', 'SF Pro Text',
    'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Ubuntu', 'Verdana', 'Apple Color Emoji', 'Cantarell', 'Fira Sans', 'Inter', 'Nirmala UI']
  fonts.set(attempt(function () {
    var span = document.createElement('span')
    span.textContent = 'mmmmmmmmmmlli1WQ@#'
    span.style.cssText = 'position:absolute;left:-9999px;top:0;font-size:72px;visibility:hidden'
    document.body.appendChild(span)
    var base = {}
    ;['monospace', 'sans-serif', 'serif'].forEach(function (f) { span.style.fontFamily = f; base[f] = span.offsetWidth + 'x' + span.offsetHeight })
    var found = FONT_LIST.filter(function (font) {
      return ['monospace', 'sans-serif', 'serif'].some(function (f) {
        span.style.fontFamily = '"' + font + '",' + f
        return span.offsetWidth + 'x' + span.offsetHeight !== base[f]
      })
    })
    span.remove()
    return [['detected', found.length + ' of ' + FONT_LIST.length], ['fonts', found]]
  }, [['fonts', 'unavailable']]))

  // ── math & engine ───────────────────────────────────────────────────────
  var math = section('math', 'JS engine & Math')
  var mathValues = [Math.acos(0.123), Math.acosh(1e308), Math.asinh(1), Math.atanh(0.5), Math.cbrt(Math.PI), Math.cosh(10), Math.expm1(1),
    Math.log1p(10), Math.sinh(1), Math.tan(-1e300), Math.tanh(1), Math.pow(Math.PI, -100)]
  math.set([
    ['Math results hash', hash(mathValues.join())],
    ['Math.tan(-1e300)', Math.tan(-1e300)],
    ['error message', attempt(function () { try { null.x } catch (e) { return e.message } })],
    ['stack trace format', attempt(function () { try { null.x } catch (e) { return (e.stack || '').split('\n')[1] ? 'V8-style' : 'Firefox/Safari-style' } })],
    ['function toString length', Function.prototype.toString.call(Math.max).length],
  ])

  // ── DOM rect ────────────────────────────────────────────────────────────
  var rect = section('domrect', 'DOMRect & SVG')
  rect.set(attempt(function () {
    var d = document.createElement('div')
    d.style.cssText = 'position:absolute;left:-9999px;width:10.33px;height:7.17px;transform:rotate(13.7deg) skew(3deg);font:13px serif'
    d.textContent = 'Angaadi 😃'
    document.body.appendChild(d)
    var r = d.getBoundingClientRect()
    var svgNS = 'http://www.w3.org/2000/svg'
    var svg = document.createElementNS(svgNS, 'svg')
    var t = document.createElementNS(svgNS, 'text')
    t.textContent = 'Angaadi 😃 Cwm'
    svg.appendChild(t)
    d.appendChild(svg)
    var len = t.getComputedTextLength()
    d.remove()
    return [
      ['element rect', [r.x, r.y, r.width, r.height].map(function (n) { return n.toFixed(4) })],
      ['SVG text length', len],
      ['hash', hash([r.x, r.y, r.width, r.height, len].join())],
    ]
  }, [['DOMRect', 'unavailable']]))

  // ── media ───────────────────────────────────────────────────────────────
  var media = section('media', 'Media & codecs')
  var v = document.createElement('video'), a = document.createElement('audio')
  var codecs = [
    ['video/mp4; codecs="avc1.42E01E"', v], ['video/webm; codecs="vp9"', v], ['video/webm; codecs="av01.0.05M.08"', v], ['video/mp4; codecs="hvc1"', v],
    ['audio/mpeg', a], ['audio/ogg; codecs="opus"', a], ['audio/mp4; codecs="mp4a.40.2"', a], ['audio/flac', a], ['audio/wav', a],
  ]
  var mediaRows = codecs.map(function (c) { return [c[0], c[1].canPlayType(c[0]) || 'no'] })
  mediaRows.push(['MediaRecorder', typeof window.MediaRecorder === 'function'])
  mediaRows.push(['RTCPeerConnection (WebRTC)', typeof window.RTCPeerConnection === 'function'])
  mediaRows.push(['WebRTC video codecs', attempt(function () { return window.RTCRtpSender.getCapabilities('video').codecs.length }, undefined)])
  media.set(mediaRows)
  var pMedia = navigator.mediaDevices && navigator.mediaDevices.enumerateDevices
    ? withTimeout(navigator.mediaDevices.enumerateDevices(), 1500, []).then(function (devices) {
      var count = function (k) { return devices.filter(function (d) { return d.kind === k }).length }
      mediaRows.push(['media devices', 'audio in ' + count('audioinput') + ', audio out ' + count('audiooutput') + ', video in ' + count('videoinput')])
      media.set(mediaRows)
    })
    : Promise.resolve()

  // ── audio ───────────────────────────────────────────────────────────────
  var audio = section('audio', 'Audio')
  var Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext
  var pAudio
  if (!Offline) { audio.set([['OfflineAudioContext', 'unsupported']]); pAudio = Promise.resolve() } else {
    audio.set([['status', 'rendering…']])
    pAudio = withTimeout(new Promise(function (resolve, reject) {
      var ctx = new Offline(1, 5000, 44100)
      var osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = 10000
      var comp = ctx.createDynamicsCompressor()
      comp.threshold.value = -50; comp.knee.value = 40; comp.ratio.value = 12; comp.attack.value = 0; comp.release.value = 0.25
      osc.connect(comp); comp.connect(ctx.destination); osc.start(0)
      ctx.oncomplete = function (e) { resolve(e.renderedBuffer.getChannelData(0)) }
      ctx.startRendering().catch(reject)
    }), 2000, null).then(function (data) {
      if (!data) return audio.set([['audio', 'blocked or timed out']])
      var sum = 0
      for (var i = 4500; i < 5000; i++) sum += Math.abs(data[i])
      var ac = attempt(function () { return new (window.AudioContext || window.webkitAudioContext)() }, null)
      audio.set([
        ['compressor sum', sum],
        ['sample hash', hash(Array.prototype.slice.call(data, 4500, 4600).join())],
        ['sampleRate', ac ? ac.sampleRate : undefined],
        ['maxChannelCount', ac ? ac.destination.maxChannelCount : undefined],
        ['baseLatency', ac ? ac.baseLatency : undefined],
      ])
      if (ac && ac.close) ac.close()
    })
  }

  // ── speech voices ───────────────────────────────────────────────────────
  var voices = section('voices', 'Speech voices')
  var pVoices = !window.speechSynthesis ? (voices.set([['speechSynthesis', 'unsupported']]), Promise.resolve()) : withTimeout(new Promise(function (resolve) {
    var list = speechSynthesis.getVoices()
    if (list.length) return resolve(list)
    speechSynthesis.addEventListener('voiceschanged', function () { resolve(speechSynthesis.getVoices()) }, { once: true })
  }), 1500, []).then(function (list) {
    var def = list.filter(function (x) { return x.default })[0]
    voices.set([
      ['count', list.length],
      ['default', def ? def.name + ' (' + def.lang + ')' : '(none)'],
      ['local voices', list.filter(function (x) { return x.localService }).length],
      ['voices', list.map(function (x) { return x.name })],
    ])
  })

  // ── permissions ─────────────────────────────────────────────────────────
  var perms = section('permissions', 'Permissions (queried, never requested)')
  var PERM = ['geolocation', 'notifications', 'camera', 'microphone', 'clipboard-read', 'clipboard-write', 'persistent-storage', 'midi', 'background-sync', 'accelerometer']
  var pPerms = navigator.permissions ? Promise.all(PERM.map(function (name) {
    return withTimeout(navigator.permissions.query({ name: name }).then(function (s) { return [name, s.state] }), 1000, [name, 'unsupported'])
      .catch(function () { return [name, 'unsupported'] })
  })).then(function (rows) {
    var notif = rows.filter(function (r) { return r[0] === 'notifications' })[0]
    if (window.Notification && Notification.permission === 'denied' && notif && notif[1] === 'prompt') signals.headless.push('Notification.permission "denied" but permission state "prompt"')
    rows.push(['Notification.permission', window.Notification ? Notification.permission : undefined])
    perms.set(rows)
  }) : (perms.set([['Permissions API', 'unsupported']]), Promise.resolve())

  // ── storage & device ────────────────────────────────────────────────────
  var store = section('storage', 'Storage, network & battery')
  var conn = navigator.connection
  var storeRows = [
    ['localStorage', attempt(function () { return !!window.localStorage }, false)],
    ['sessionStorage', attempt(function () { return !!window.sessionStorage }, false)],
    ['indexedDB', !!window.indexedDB],
    ['serviceWorker', 'serviceWorker' in navigator],
    ['connection', conn ? conn.effectiveType + ', rtt ' + conn.rtt + ' ms, downlink ' + conn.downlink + ' Mb/s' + (conn.saveData ? ', save-data' : '') : undefined],
  ]
  store.set(storeRows)
  var pStore = Promise.all([
    navigator.storage && navigator.storage.estimate ? withTimeout(navigator.storage.estimate(), 1000, null) : null,
    navigator.getBattery ? withTimeout(navigator.getBattery(), 1000, null) : null,
  ]).then(function (r) {
    if (r[0]) storeRows.push(['storage quota', Math.round(r[0].quota / 1048576) + ' MB'])
    if (r[1]) storeRows.push(['battery', Math.round(r[1].level * 100) + '%' + (r[1].charging ? ', charging' : '')])
    store.set(storeRows)
  })

  // ── lies / tampering ────────────────────────────────────────────────────
  var NATIVE = /\{\s*\[native code\]\s*\}\s*$/
  var checks = [
    ['Navigator.prototype', ['userAgent', 'platform', 'hardwareConcurrency', 'deviceMemory', 'languages', 'webdriver', 'plugins', 'vendor']],
    ['Screen.prototype', ['width', 'height', 'colorDepth', 'availWidth']],
  ]
  var methodChecks = [
    ['HTMLCanvasElement.prototype.toDataURL', window.HTMLCanvasElement && HTMLCanvasElement.prototype.toDataURL],
    ['HTMLCanvasElement.prototype.getContext', window.HTMLCanvasElement && HTMLCanvasElement.prototype.getContext],
    ['CanvasRenderingContext2D.prototype.getImageData', window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype.getImageData],
    ['WebGLRenderingContext.prototype.getParameter', window.WebGLRenderingContext && WebGLRenderingContext.prototype.getParameter],
    ['AudioBuffer.prototype.getChannelData', window.AudioBuffer && AudioBuffer.prototype.getChannelData],
    ['Element.prototype.getBoundingClientRect', Element.prototype.getBoundingClientRect],
    ['Date.prototype.getTimezoneOffset', Date.prototype.getTimezoneOffset],
    ['Intl.DateTimeFormat.prototype.resolvedOptions', Intl.DateTimeFormat.prototype.resolvedOptions],
    ['Function.prototype.toString', Function.prototype.toString],
    ['navigator.permissions.query', navigator.permissions && navigator.permissions.query],
  ]
  var tested = 0
  checks.forEach(function (c) {
    var proto = attempt(function () { return c[0].split('.').reduce(function (o, k) { return o[k] }, window) }, null)
    if (!proto) return
    c[1].forEach(function (prop) {
      var d = Object.getOwnPropertyDescriptor(proto, prop)
      if (!d || !d.get) return
      tested++
      var src = attempt(function () { return Function.prototype.toString.call(d.get) }, '')
      if (!NATIVE.test(src) || 'prototype' in d.get) signals.lies.push(c[0] + '.' + prop)
    })
  })
  methodChecks.forEach(function (m) {
    if (typeof m[1] !== 'function') return
    tested++
    var src = attempt(function () { return Function.prototype.toString.call(m[1]) }, '')
    if (!NATIVE.test(src) || 'prototype' in m[1]) signals.lies.push(m[0])
  })
  var ownNav = Object.getOwnPropertyNames(navigator)
  if (ownNav.length) signals.lies.push('navigator has own properties: ' + ownNav.join(', '))
  var autoGlobals = Object.getOwnPropertyNames(window).filter(function (k) {
    return /^(__playwright|__pw|__puppeteer|_phantom|callPhantom|__nightmare|__selenium|__webdriver|__driver|domAutomation|cdc_|\$cdc_|_Selenium_IDE)/i.test(k)
  })
  var autoDoc = Object.getOwnPropertyNames(document).filter(function (k) { return /^\$?cdc_|^\$wdc_|webdriver/i.test(k) })

  // ── worker scope (async) ────────────────────────────────────────────────
  var pWorker = typeof Worker !== 'function' ? (worker.set([['Worker', 'unsupported']]), Promise.resolve()) : withTimeout(new Promise(function (resolve, reject) {
    var src = 'postMessage({ua:navigator.userAgent,lang:navigator.language,langs:Array.from(navigator.languages||[]),cores:navigator.hardwareConcurrency,mem:navigator.deviceMemory,platform:navigator.platform,tz:Intl.DateTimeFormat().resolvedOptions().timeZone})'
    var url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }))
    var w = new Worker(url)
    w.onmessage = function (e) { resolve(e.data); w.terminate(); URL.revokeObjectURL(url) }
    w.onerror = function (e) { reject(e); URL.revokeObjectURL(url) }
  }), 1500, null).then(function (d) {
    if (!d) return worker.set([['Worker', 'blocked or timed out']])
    var rows = []
    function cmp(label, w, win) {
      var same = JSON.stringify(w) === JSON.stringify(win)
      if (!same) signals.workerMismatch.push(label)
      rows.push([label, fmt(w) + (same ? '  ✓ same as window' : '  ✗ window says ' + fmt(win)), bad(!same)])
    }
    cmp('userAgent', d.ua, navigator.userAgent)
    cmp('language', d.lang, navigator.language)
    cmp('languages', d.langs, Array.from(navigator.languages || []))
    cmp('hardwareConcurrency', d.cores, navigator.hardwareConcurrency)
    cmp('deviceMemory', d.mem, navigator.deviceMemory)
    cmp('platform', d.platform, navigator.platform)
    cmp('timeZone', d.tz, ro.timeZone)
    worker.set(rows)
  }).catch(function () { worker.set([['Worker', 'blocked']]) })

  // ── headless & automation ───────────────────────────────────────────────
  var isChrome = /Chrome\//.test(navigator.userAgent) && !/Edg\/|OPR\//.test(navigator.userAgent)
  var strong = [
    ['navigator.webdriver is true', navigator.webdriver === true],
    ['"HeadlessChrome" in user agent', /HeadlessChrome/.test(navigator.userAgent)],
    ['"HeadlessChrome" in client-hint brands', !!(uad && uad.brands.some(function (b) { return /Headless/i.test(b.brand) }))],
    ['automation globals on window', autoGlobals.length ? autoGlobals : false],
    ['ChromeDriver markers on document', autoDoc.length ? autoDoc : false],
  ]
  var weak = [
    ['no plugins', attempt(function () { return navigator.plugins.length === 0 }, false)],
    ['no languages', attempt(function () { return !navigator.languages || navigator.languages.length === 0 }, false)],
    ['window.chrome missing in Chrome', isChrome && !window.chrome],
    ['outer window size is 0', window.outerWidth === 0 || window.outerHeight === 0],
    ['window fills the whole screen with no browser UI', window.outerHeight === screen.height && window.innerHeight === screen.height],
    ['PDF viewer disabled in Chrome', isChrome && navigator.pdfViewerEnabled === false],
  ]
  strong.forEach(function (s) { if (s[1]) signals.headless.push(s[0]) })
  weak.forEach(function (s) { if (s[1]) signals.likeHeadless.push(s[0]) })

  function renderHeadless() {
    headless.set(strong.concat(weak).map(function (s) { return [s[0], s[1] === false ? 'no' : s[1] === true ? 'yes' : s[1], bad(!!s[1])] })
      .concat(signals.headless.filter(function (x) { return /Notification/.test(x) }).map(function (x) { return [x, 'yes', 'flag'] }))
      .concat(signals.likeHeadless.filter(function (x) { return /GPU/.test(x) }).map(function (x) { return [x, 'yes', 'flag'] })))
  }
  renderHeadless()
  lies.set([['status', 'checking…']])

  // ── finish: once every async section is in ─────────────────────────────
  Promise.all([pHints, pMedia, pAudio, pVoices, pPerms, pStore, pWorker].map(function (p) { return Promise.resolve(p).catch(function () {}) })).then(function () {
    renderHeadless()
    lies.set([['APIs checked', tested], ['lies detected', signals.lies.length, bad(signals.lies.length > 0)]].concat(
      signals.lies.map(function (l) { return ['lie', l, 'flag'] })))
    var ids = Object.keys(hashes).sort()
    var fpId = hash(ids.map(function (k) { return k + ':' + hashes[k] }).join('|'))
    var strongCount = strong.length + 1
    var weakCount = weak.length + 1
    summary.set([
      ['Fingerprint ID', fpId],
      ['headless', Math.round(signals.headless.length / strongCount * 100) + '% (' + signals.headless.length + ' of ' + strongCount + ' signals)', bad(signals.headless.length > 0)],
      ['like headless', Math.round(signals.likeHeadless.length / weakCount * 100) + '% (' + signals.likeHeadless.length + ' of ' + weakCount + ' signals)', bad(signals.likeHeadless.length > 1)],
      ['lies', signals.lies.length, bad(signals.lies.length > 0)],
      ['worker scope mismatches', signals.workerMismatch.length ? signals.workerMismatch : 0, bad(signals.workerMismatch.length > 0)],
      ['HTTP header vs JS mismatches', signals.headerMismatch.length ? signals.headerMismatch : 0, bad(signals.headerMismatch.length > 0)],
      ['sections hashed', ids.length],
    ])
    root.setAttribute('data-ready', 'true')
  })
}

export const FINGERPRINT_SCRIPT = '(' + fingerprintMain.toString() + ')()'
