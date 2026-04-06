import type { BrowserWorker } from '@cloudflare/puppeteer'
import type { Ai, Fetcher, Hyperdrive } from '@cloudflare/workers-types'

export interface Env {
  MYBROWSER: BrowserWorker
  ASSETS: Fetcher
  HYPERDRIVE: Hyperdrive
  AI: Ai
}

// Define an interface for the expected Wikipedia API response
export interface WikipediaSummary {
  title: string
  displaytitle: string
  pageid: number
  description?: string
  extract: string
  extract_html: string
  thumbnail?: {
    source: string
    width: number
    height: number
  }
  content_urls: {
    desktop: {
      page: string
      revisions: string
      edit: string
      talk: string
    }
    mobile: {
      page: string
      revisions: string
      edit: string
      talk: string
    }
  }
}

export interface NeonResponseMessage {
  word: string
  timestamp: number
}

export interface NeonResponse {
  type: "challenge"
  message: NeonResponseMessage[]
}
