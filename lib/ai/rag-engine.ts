import { createServiceClient } from '@/lib/supabase/service'
import { generateEmbedding, generateAnswer } from './embedder'

export interface SearchResult {
  text: string
  source_url: string
  similarity: number
  metadata: Record<string, unknown>
}

export interface RAGResponse {
  answer: string
  confidence: number
  sources: Array<{
    text: string
    url: string
    similarity: number
  }>
  context: string[]
}

export async function performVectorSearch(
  query: string,
  websiteId: string,
  limit: number = 10
): Promise<SearchResult[]> {
  const supabase = createServiceClient()
  
  const queryEmbedding = await generateEmbedding(query)
  
  const { data: chunks, error } = await supabase.rpc('match_chunks', {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: limit,
    website_id: websiteId
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)

  if (error) {
    console.error('Vector search error:', error)
    throw new Error('Failed to perform vector search')
  }

  return (chunks || []).map(chunk => ({
    text: chunk.text,
    source_url: chunk.source_url,
    similarity: chunk.similarity,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata: (chunk.metadata as any) || {}
  }))
}

export async function performHybridSearch(
  query: string,
  websiteId: string,
  limit: number = 10
): Promise<SearchResult[]> {
  const supabase = createServiceClient()
  
  const vectorResults = await performVectorSearch(query, websiteId, Math.ceil(limit * 0.7))
  
  const { data: keywordResults, error } = await supabase
    .from('chunks')
    .select(`
      text,
      metadata,
      content:content_id (
        source_url
      )
    `)
    .eq('content.website_id', websiteId)
    .textSearch('text', query.split(' ').join(' & '))
    .limit(Math.ceil(limit * 0.3))

  if (error) {
    console.error('Keyword search error:', error)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const keywordSearchResults = (keywordResults || []).map((result: any) => ({
    text: result.text,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    source_url: (result.content as any)?.source_url || '',
    similarity: 0.5,
    metadata: result.metadata
  }))

  const combinedResults = [...vectorResults, ...keywordSearchResults]
  const uniqueResults = combinedResults.filter((result, index, self) => 
    index === self.findIndex(r => r.text === result.text)
  )

  return uniqueResults
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
}

export async function generateRAGResponse(
  question: string,
  websiteId: string,
  useHybrid: boolean = true
): Promise<RAGResponse> {
  try {
    console.log('=== RAG ENGINE START ===')
    console.log('Input:', { question: question.substring(0, 100), websiteId, useHybrid })

    console.log('Performing search...')
    const searchResults = useHybrid
      ? await performHybridSearch(question, websiteId, 8)
      : await performVectorSearch(question, websiteId, 8)

    console.log('Search results:', {
      count: searchResults.length,
      results: searchResults.map(r => ({
        similarity: r.similarity,
        textLength: r.text.length,
        url: r.source_url
      }))
    })

    if (searchResults.length === 0) {
      console.log('No search results found - returning default response')
      return {
        answer: "I don't have enough information to answer your question. Please make sure content has been uploaded and processed.",
        confidence: 0,
        sources: [],
        context: []
      }
    }

    const context = searchResults.map(result => result.text)
    console.log('Generating answer with context length:', context.join('').length)

    const { answer, confidence, sources } = await generateAnswer(question, context)
    console.log('Answer generated:', { answerLength: answer.length, confidence })

    const formattedSources = searchResults.map((result, index) => ({
      text: sources[index] || `Source ${index + 1}`,
      url: result.source_url,
      similarity: result.similarity
    }))

    console.log('=== RAG ENGINE SUCCESS ===')
    return {
      answer,
      confidence,
      sources: formattedSources,
      context
    }
  } catch (error) {
    console.error('=== RAG ENGINE ERROR ===')
    console.error('RAG response error:', error)
    console.error('Error type:', typeof error)
    console.error('Error message:', (error as any)?.message)
    console.error('Error stack:', (error as any)?.stack)
    throw new Error(`Failed to generate RAG response: ${(error as any)?.message}`)
  }
}

export function calculateAnswerQuality(
  answer: string,
  context: string[],
  sources: SearchResult[]
): {
  relevance: number
  completeness: number
  confidence: number
} {
  const relevance = sources.length > 0 
    ? Math.min(0.9, sources.reduce((acc, s) => acc + s.similarity, 0) / sources.length)
    : 0.3

  const completeness = context.length > 0
    ? Math.min(0.9, context.join('').length / 5000)
    : 0.2

  const confidence = (relevance * 0.6) + (completeness * 0.4)

  return { relevance, completeness, confidence }
}
