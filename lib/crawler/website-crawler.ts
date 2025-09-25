import * as cheerio from 'cheerio'

export interface CrawlResult {
  url: string
  title: string
  content: string
  links: string[]
  error?: string
}

export async function crawlWebsite(
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
      const result = await crawlPage(url, baseUrl)
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

async function crawlPage(url: string, baseUrl: string): Promise<CrawlResult> {
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

function extractTextContent($: cheerio.CheerioAPI): string {
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

function extractLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
  const links: string[] = []
  const baseUrlObj = new URL(baseUrl)
  
  $('a[href]').each((_, element) => {
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
