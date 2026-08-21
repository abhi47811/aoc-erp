// Vitest doesn't auto-load .env.local the way Next.js does, so we parse it
// ourselves — no dotenv dependency needed for a handful of KEY=VALUE lines.
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

const envPath = path.resolve(__dirname, '../../.env.local')

if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}
