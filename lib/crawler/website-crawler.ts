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
    console.warn('FIRECRAWL_API_KEY not found, falling back to basic crawler')
    return fallbackCrawlWebsite(baseUrl, maxDepth, maxPages)
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
      throw new Error('Firecrawl crawl failed')
    }

    return crawlResponse.data.map((page: any) => ({
      url: page.metadata?.sourceURL || page.url,
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
    }))
  } catch (error) {
    console.error('Firecrawl error, falling back to basic crawler:', error)
    return fallbackCrawlWebsite(baseUrl, maxDepth, maxPages)
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

async function fallbackCrawlWebsite(
  baseUrl: string,
  maxDepth: number = 2,
  maxPages: number = 50
): Promise<CrawlResult[]> {
  const visited = new Set<string>()
  const results: CrawlResult[] = []
  const queue: { url: string; depth: number }[] = [{ url: baseUrl, depth: 0 }]

  while (queue.length > 0 && results.length < maxPages) {
    const { url, depth } = queue.shift()!

    if (visited.has(url) || depth > maxDepth) continue
    visited.add(url)

    try {
      const result = await fallbackCrawlPage(url, baseUrl)
      results.push(result)

      if (depth < maxDepth) {
        result.links.forEach(link => {
          if (!visited.has(link) && isInternalLink(link, baseUrl)) {
            queue.push({ url: link, depth: depth + 1 })
          }
        })
      }
    } catch (error) {
      console.error(`Error crawling ${url}:`, error)
      results.push({
        url,
        title: '',
        content: '',
        links: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  return results
}

async function fallbackCrawlPage(url: string, baseUrl: string): Promise<CrawlResult> {
  const cheerio = await import('cheerio')

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'QuickBase AI Crawler 1.0'
    }
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const html = await response.text()
  const $ = cheerio.load(html)

  const title = $('title').text().trim() || $('h1').first().text().trim()

  $('script, style, nav, header, footer, aside').remove()

  const content = extractTextContent($)
  const links = extractLinks($, baseUrl)

  return {
    url,
    title,
    content,
    links
  }
}

function extractTextContent($: any): string {
  const selectors = [
    'main',
    'article',
    '.content',
    '.post-content',
    '.entry-content',
    '.page-content',
    'body'
  ]
  
  for (const selector of selectors) {
    const element = $(selector).first()
    if (element.length > 0) {
      return cleanText(element.text())
    }
  }
  
  return cleanText($('body').text())
}

function extractLinks($: any, baseUrl: string): string[] {
  const links: string[] = []
  const baseUrlObj = new URL(baseUrl)
  
  $('a[href]').each((_: any, element: any) => {
    const href = $(element).attr('href')
    if (!href) return
    
    try {
      const url = new URL(href, baseUrl)
      if (url.origin === baseUrlObj.origin) {
        links.push(url.href)
      }
    } catch {
      // Invalid URL, skip
    }
  })
  
  return [...new Set(links)]
}

function isInternalLink(url: string, baseUrl: string): boolean {
  try {
    const urlObj = new URL(url)
    const baseUrlObj = new URL(baseUrl)
    return urlObj.origin === baseUrlObj.origin
  } catch {
    return false
  }
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim()
}
