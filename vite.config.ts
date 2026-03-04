import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, writeFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

const DOC_PATH = resolve(__dirname, 'figment-doc.json')

/**
 * Vite plugin that adds sync API endpoints for bridging
 * the Figment SPA with the MCP server via a shared JSON file.
 */
function figmentSyncPlugin(): Plugin {
  return {
    name: 'figment-sync',
    configureServer(server) {
      // GET /api/sync — return document contents + mtime
      server.middlewares.use('/api/sync/status', (_req, res) => {
        try {
          const stat = statSync(DOC_PATH)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ mtime: stat.mtimeMs }))
        } catch {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ mtime: 0 }))
        }
      })

      server.middlewares.use('/api/sync', (req, res, next) => {
        if (req.method === 'GET') {
          try {
            const data = readFileSync(DOC_PATH, 'utf-8')
            const stat = statSync(DOC_PATH)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ document: JSON.parse(data), mtime: stat.mtimeMs }))
          } catch {
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ document: null, mtime: 0 }))
          }
        } else if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk: Buffer) => { body += chunk.toString() })
          req.on('end', () => {
            try {
              // Validate it's valid JSON
              JSON.parse(body)
              writeFileSync(DOC_PATH, body)
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ success: true }))
            } catch (e) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: String(e) }))
            }
          })
        } else {
          next()
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), figmentSyncPlugin()],
})
