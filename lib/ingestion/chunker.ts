export interface Chunk {
  text: string
  metadata: {
    source: string
    chunkIndex: number
    totalChunks: number
    wordCount: number
  }
}

export function chunkText(text: string, source: string, maxTokens: number = 1000): Chunk[] {
  const words = text.split(/\s+/)
  const chunks: Chunk[] = []
  const wordsPerChunk = Math.floor(maxTokens * 0.75)
  
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    const chunkWords = words.slice(i, i + wordsPerChunk)
    const chunkText = chunkWords.join(' ')
    
    if (chunkText.trim().length === 0) continue
    
    chunks.push({
      text: chunkText.trim(),
      metadata: {
        source,
        chunkIndex: chunks.length,
        totalChunks: Math.ceil(words.length / wordsPerChunk),
        wordCount: chunkWords.length
      }
    })
  }
  
  return chunks
}

export function chunkByParagraphs(text: string, source: string, maxTokens: number = 1000): Chunk[] {
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0)
  const chunks: Chunk[] = []
  let currentChunk = ''
  let chunkIndex = 0
  
  for (const paragraph of paragraphs) {
    const testChunk = currentChunk + (currentChunk ? '\n\n' : '') + paragraph
    const wordCount = testChunk.split(/\s+/).length
    
    if (wordCount > maxTokens && currentChunk) {
      chunks.push({
        text: currentChunk.trim(),
        metadata: {
          source,
          chunkIndex: chunkIndex++,
          totalChunks: 0,
          wordCount: currentChunk.split(/\s+/).length
        }
      })
      currentChunk = paragraph
    } else {
      currentChunk = testChunk
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk.trim(),
      metadata: {
        source,
        chunkIndex: chunkIndex++,
        totalChunks: 0,
        wordCount: currentChunk.split(/\s+/).length
      }
    })
  }
  
  chunks.forEach(chunk => {
    chunk.metadata.totalChunks = chunks.length
  })
  
  return chunks
}

export function chunkBySentences(text: string, source: string, maxTokens: number = 1000): Chunk[] {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const chunks: Chunk[] = []
  let currentChunk = ''
  let chunkIndex = 0
  
  for (const sentence of sentences) {
    const testChunk = currentChunk + (currentChunk ? '. ' : '') + sentence.trim()
    const wordCount = testChunk.split(/\s+/).length
    
    if (wordCount > maxTokens && currentChunk) {
      chunks.push({
        text: currentChunk.trim() + '.',
        metadata: {
          source,
          chunkIndex: chunkIndex++,
          totalChunks: 0,
          wordCount: currentChunk.split(/\s+/).length
        }
      })
      currentChunk = sentence.trim()
    } else {
      currentChunk = testChunk
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk.trim() + '.',
      metadata: {
        source,
        chunkIndex: chunkIndex++,
        totalChunks: 0,
        wordCount: currentChunk.split(/\s+/).length
      }
    })
  }
  
  chunks.forEach(chunk => {
    chunk.metadata.totalChunks = chunks.length
  })
  
  return chunks
}
