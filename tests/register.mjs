// Lets the Node test runner import the app's TypeScript modules directly
// (Node strips the types), so the tests exercise the shipped source rather than
// a copy.
//
// The webhook client reads VITE_* values through import.meta.env, which is
// undefined under plain Node. The client already falls back when it is, so the
// tests derive their expected origins from the client's own helpers instead of
// hard-coding one.
import { registerHooks } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      return nextResolve(
        pathToFileURL(path.join(projectRoot, 'src', specifier.slice(2))).href,
        context
      )
    }
    return nextResolve(specifier, context)
  },
})
