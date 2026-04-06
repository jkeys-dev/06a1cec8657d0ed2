import type { BrowserWorker } from '@cloudflare/puppeteer'
import type { Ai, Fetcher, Hyperdrive } from '@cloudflare/workers-types'

export interface Env {
  MYBROWSER: BrowserWorker
  ASSETS: Fetcher
  HYPERDRIVE: Hyperdrive
  AI: Ai
}
