import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ioniconsSource = readFileSync(
  path.resolve(__dirname, 'node_modules/ionicons/icons/index.mjs'),
  'utf8',
)
const ioniconsByName = new Map(
  Array.from(ioniconsSource.matchAll(/^export const (\w+) = (.+)$/gm), match => [match[1], match[2]]),
)

const selectiveIonicons = () => ({
  name: 'selective-ionicons',
  enforce: 'pre',
  transform(code, id) {
    if (!/\.[jt]sx?$/.test(id) || !code.includes('ionicons/icons')) return null

    const transformed = code.replace(
      /import\s*\{([^}]*)\}\s*from\s*[']ionicons\/icons['];?/g,
      (_, imports) => imports
        .split(',')
        .map(name => name.trim())
        .filter(Boolean)
        .map(name => {
          const value = ioniconsByName.get(name)
          if (!value) throw new Error(`Unknown Ionicon: ${name} in ${id}`)
          return `const ${name} = ${value}`
        })
        .join('\n'),
    )

    return transformed === code ? null : { code: transformed, map: null }
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [selectiveIonicons(), react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@ionic/react': path.resolve(__dirname, './src/components/IonIcon.jsx'),
    },
  },
  // Exclude /games from dependency scanning
  build: {
    rollupOptions: {
      external: [],
    },
  },
  server: {
    fs: {
      allow: ['.'],
    },
  },
})
