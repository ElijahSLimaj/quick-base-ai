import * as mammoth from 'mammoth'
import { marked } from 'marked'

export interface ProcessedDocument {
  content: string
  metadata: {
    filename: string
    type: 'pdf' | 'docx' | 'markdown' | 'text'
    size: number
    pages?: number
  }
}

export async function processDocument(
  file: File,
  content: Buffer
): Promise<ProcessedDocument> {
  const filename = file.name.toLowerCase()
  const size = file.size
  
  if (filename.endsWith('.pdf')) {
    return processPDF(content, filename, size)
  } else if (filename.endsWith('.docx')) {
    return processDOCX(content, filename, size)
  } else if (filename.endsWith('.md') || filename.endsWith('.markdown')) {
    return processMarkdown(content, filename, size)
  } else if (filename.endsWith('.txt')) {
    return processText(content, filename, size)
  } else {
    throw new Error(`Unsupported file type: ${filename}`)
  }
}

async function processPDF(content: Buffer, filename: string, size: number): Promise<ProcessedDocument> {
  // For now, we'll treat PDF as text
  // In production, you'd use a library like pdf-parse or pdf2pic
  const text = content.toString('utf-8')
  
  return {
    content: cleanText(text),
    metadata: {
      filename,
      type: 'pdf',
      size,
      pages: Math.ceil(text.length / 2000)
    }
  }
}

async function processDOCX(content: Buffer, filename: string, size: number): Promise<ProcessedDocument> {
  try {
    const result = await mammoth.extractRawText({ buffer: content })
    const text = result.value
    
    return {
      content: cleanText(text),
      metadata: {
        filename,
        type: 'docx',
        size,
        pages: Math.ceil(text.length / 2000)
      }
    }
  } catch (error) {
    throw new Error(`Failed to process DOCX file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function processMarkdown(content: Buffer, filename: string, size: number): Promise<ProcessedDocument> {
  try {
    const markdown = content.toString('utf-8')
    const html = await marked.parse(markdown)
    
    // Convert HTML to plain text
    const text = html
      .replace(/<[^>]*>/g, '')
      .replace(/&[^;]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    
    return {
      content: cleanText(text),
      metadata: {
        filename,
        type: 'markdown',
        size,
        pages: Math.ceil(text.length / 2000)
      }
    }
  } catch (error) {
    throw new Error(`Failed to process Markdown file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function processText(content: Buffer, filename: string, size: number): Promise<ProcessedDocument> {
  const text = content.toString('utf-8')
  
  return {
    content: cleanText(text),
    metadata: {
      filename,
      type: 'text',
      size,
      pages: Math.ceil(text.length / 2000)
    }
  }
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .replace(/[^\x20-\x7E\n\r\t]/g, '')
    .trim()
}
