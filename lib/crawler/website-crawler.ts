import FirecrawlApp from '@mendable/firecrawl-js'

export interface CrawlResult {
  url: string
  title: string
  content: string
  links: string[]
  error?: string
  metadata?: {
    ogTitle?: string
    ogDescription?: string
    description?: string
    keywords?: string
    sourceURL?: string
    language?: string
    statusCode?: number
  }
}

export async function crawlWebsite(
  baseUrl: string,
  maxDepth: number = 2,
  maxPages: number = 50
): Promise<CrawlResult[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) {
    throw new Error('FIRECRAWL_API_KEY is required but not found. Please configure your Firecrawl API key.')
  }

  const app = new FirecrawlApp({ apiKey })

  try {
    const crawlResponse = await app.crawl(baseUrl, {
      limit: maxPages,
      scrapeOptions: {
        formats: ['markdown'],
        onlyMainContent: true
      }
    })

    if (!crawlResponse || !crawlResponse.data) {
      throw new Error('Firecrawl crawl failed - no data returned')
    }

    // Normalize URLs to avoid duplicates from fragments
    const normalizedResults = crawlResponse.data.map((page: any) => {
      const originalUrl = page.metadata?.sourceURL || page.url
      const normalizedUrl = normalizeUrl(originalUrl)
      
      return {
        url: normalizedUrl,
        title: page.metadata?.title || page.metadata?.ogTitle || '',
        content: page.markdown || page.content || '',
        links: extractLinksFromContent(page.markdown || page.content || ''),
        metadata: {
          ogTitle: page.metadata?.ogTitle,
          ogDescription: page.metadata?.ogDescription,
          description: page.metadata?.description,
          keywords: page.metadata?.keywords,
          sourceURL: page.metadata?.sourceURL,
          language: page.metadata?.language,
          statusCode: page.metadata?.statusCode
        }
      }
    })

    // Remove duplicates based on normalized URLs
    const uniqueResults = normalizedResults.filter((result, index, self) => 
      index === self.findIndex(r => r.url === result.url)
    )

    return uniqueResults
  } catch (error) {
    console.error('Firecrawl error:', error)
    throw new Error(`Website crawling failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

function extractLinksFromContent(content: string): string[] {
  const linkRegex = /\[.*?\]\((https?:\/\/[^\)]+)\)/g
  const links: string[] = []
  let match

  while ((match = linkRegex.exec(content)) !== null) {
    links.push(match[1])
  }

  return [...new Set(links)]
}


function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    // Remove fragment (hash) and normalize
    urlObj.hash = ''
    // Remove trailing slash for consistency
    let normalized = urlObj.toString()
    if (normalized.endsWith('/') && normalized !== urlObj.origin + '/') {
      normalized = normalized.slice(0, -1)
    }
    return normalized
  } catch {
    return url
  }
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim()
}
