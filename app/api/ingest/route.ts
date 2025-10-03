import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { crawlWebsite } from '@/lib/crawler/website-crawler'
import { processDocument } from '@/lib/ingestion/document-processor'
import { chunkByParagraphs } from '@/lib/ingestion/chunker'
import { generateEmbedding } from '@/lib/ai/embedder'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const websiteId = formData.get('websiteId') as string
    const type = formData.get('type') as string
    
    if (!websiteId) {
      return NextResponse.json({ error: 'Website ID is required' }, { status: 400 })
    }

    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('*')
      .eq('id', websiteId)
      .eq('owner_id', user.id)
      .single()

    if (websiteError || !website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 })
    }

    let contentEntries: Array<{ url: string; content: string; title: string }> = []

    if (type === 'website') {
      const url = formData.get('url') as string
      if (!url) {
        return NextResponse.json({ error: 'URL is required for website crawling' }, { status: 400 })
      }

      const crawlResults = await crawlWebsite(url, 2, 20)
      
      // Combine ALL crawled content into ONE entry with the main URL
      const allContent = crawlResults
        .filter(result => !result.error && result.content.trim().length > 0)
        .map(result => result.content)
        .join('\n\n--- PAGE BREAK ---\n\n')
      
      // Get the main domain URL (normalized)
      const mainUrl = new URL(url)
      mainUrl.hash = ''
      mainUrl.pathname = '/'
      const mainDomainUrl = mainUrl.toString().replace(/\/$/, '')
      
      // Create ONE entry with all content combined
      contentEntries = [{
        url: mainDomainUrl,
        content: allContent,
        title: 'Website Content'
      }]
    } else if (type === 'document') {
      const file = formData.get('file') as File
      if (!file) {
        return NextResponse.json({ error: 'File is required for document upload' }, { status: 400 })
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const processed = await processDocument(file, buffer)
      
      contentEntries = [{
        url: file.name,
        content: processed.content,
        title: file.name
      }]
    } else {
      return NextResponse.json({ error: 'Invalid type. Must be "website" or "document"' }, { status: 400 })
    }

    if (contentEntries.length === 0) {
      return NextResponse.json({ error: 'No content found to process' }, { status: 400 })
    }

    // Only clear existing content for website crawls, not documents
    if (type === 'website') {
      console.log(`Clearing existing website content for website ${websiteId}`)

      // Get all website content IDs (not documents)
      const { data: existingContent } = await supabase
        .from('content')
        .select('id')
        .eq('website_id', websiteId)
        .like('source_url', 'http%') // Only web URLs, not file names

      if (existingContent && existingContent.length > 0) {
        const contentIds = existingContent.map(c => c.id)

        // Delete chunks first (foreign key constraint)
        await supabase.from('chunks').delete().in('content_id', contentIds)

        // Then delete content
        await supabase.from('content').delete().in('id', contentIds)
      }
    }

    const processedChunks = []
    
    for (const entry of contentEntries) {
      const chunks = chunkByParagraphs(entry.content, entry.url, 1000)
      
      for (const chunk of chunks) {
        const embedding = await generateEmbedding(chunk.text)
        
        // For documents, check if this exact filename already exists
        if (type === 'document') {
          const { data: existingRecord } = await supabase
            .from('content')
            .select('id')
            .eq('website_id', websiteId)
            .eq('source_url', entry.url)
            .single()

          if (existingRecord) {
            console.log(`Document ${entry.url} already exists, skipping`)
            continue
          }
        }

        const { data: contentRecord, error: contentError } = await supabase
          .from('content')
          .insert({
            website_id: websiteId,
            source_url: entry.url,
            content: entry.content
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any)
          .select()
          .single()

        if (contentError) {
          console.error('Error inserting content:', contentError)
          continue
        }

        const { error: chunkError } = await supabase
          .from('chunks')
          .insert({
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            content_id: (contentRecord as any).id,
            text: chunk.text,
            embedding: JSON.stringify(embedding),
            metadata: chunk.metadata
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any)

        if (chunkError) {
          console.error('Error inserting chunk:', chunkError)
        } else {
          processedChunks.push({
            text: chunk.text,
            source: entry.url,
            title: entry.title
          })
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('content')
      .update({ chunked_at: new Date().toISOString() })
      .eq('website_id', websiteId)

    return NextResponse.json({
      success: true,
      chunksProcessed: processedChunks.length,
      message: `Successfully processed ${processedChunks.length} chunks`
    })

  } catch (error) {
    console.error('Ingestion error:', error)

    // Provide specific error messages based on the error type
    if (error instanceof Error) {
      if (error.message.includes('OpenAI quota exceeded')) {
        return NextResponse.json(
          { error: 'OpenAI quota exceeded. Please check your billing and usage limits at https://platform.openai.com/usage' },
          { status: 402 }
        )
      } else if (error.message.includes('Invalid OpenAI API key')) {
        return NextResponse.json(
          { error: 'Invalid OpenAI API key. Please check your API key configuration in environment variables.' },
          { status: 401 }
        )
      } else if (error.message.includes('Failed to generate embedding')) {
        return NextResponse.json(
          { error: `Content processing failed: ${error.message}` },
          { status: 503 }
        )
      } else {
        return NextResponse.json(
          { error: `Content processing failed: ${error.message}` },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred during content processing' },
      { status: 500 }
    )
  }
}
