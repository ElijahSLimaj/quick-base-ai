import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { crawlWebsite } from '@/lib/crawler/website-crawler'
import { chunkByParagraphs } from '@/lib/ingestion/chunker'
import { generateEmbedding } from '@/lib/ai/embedder'

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()
    
    // Get all websites that have content to re-crawl
    const { data: websites, error: websitesError } = await supabase
      .from('websites')
      .select(`
        id,
        name,
        domain,
        content!inner(
          id,
          source_url,
          content,
          created_at
        )
      `)

    if (websitesError) {
      console.error('Error fetching websites for re-crawl:', websitesError)
      return NextResponse.json({ error: 'Failed to fetch websites' }, { status: 500 })
    }

    const results = []
    
    for (const website of websites || []) {
      try {
        console.log(`Re-crawling website: ${website.name} (${website.domain})`)
        
        // Get the main domain URL from the first content entry
        const firstContent = website.content[0]
        if (!firstContent) continue
        
        const baseUrl = new URL(firstContent.source_url).origin
        
        // Re-crawl the website
        const crawlResults = await crawlWebsite(baseUrl, 2, 20)
        const validResults = crawlResults.filter(result => 
          !result.error && result.content.trim().length > 0
        )
        
        if (validResults.length === 0) {
          console.log(`No valid content found for ${website.name}`)
          continue
        }
        
        // Clear existing content for this website
        await supabase
          .from('content')
          .delete()
          .eq('website_id', website.id)
        
        // Process new content
        let totalChunks = 0
        
        for (const result of validResults) {
          const chunks = chunkByParagraphs(result.content, result.url, 1000)
          
          // Insert new content record
          const { data: contentRecord, error: contentError } = await supabase
            .from('content')
            .insert({
              website_id: website.id,
              source_url: result.url,
              content: result.content
            })
            .select()
            .single()
          
          if (contentError) {
            console.error(`Error inserting content for ${result.url}:`, contentError)
            continue
          }
          
          // Process chunks
          for (const chunk of chunks) {
            try {
              const embedding = await generateEmbedding(chunk.text)
              
              const { error: chunkError } = await supabase
                .from('chunks')
                .insert({
                  content_id: contentRecord.id,
                  text: chunk.text,
                  embedding: JSON.stringify(embedding),
                  metadata: chunk.metadata
                })
              
              if (chunkError) {
                console.error(`Error inserting chunk:`, chunkError)
              } else {
                totalChunks++
              }
            } catch (embeddingError) {
              console.error(`Error generating embedding for chunk:`, embeddingError)
            }
          }
        }
        
        // Mark content as chunked
        await supabase
          .from('content')
          .update({ chunked_at: new Date().toISOString() })
          .eq('website_id', website.id)
        
        results.push({
          websiteId: website.id,
          websiteName: website.name,
          domain: website.domain,
          pagesCrawled: validResults.length,
          chunksProcessed: totalChunks,
          success: true
        })
        
        console.log(`Successfully re-crawled ${website.name}: ${validResults.length} pages, ${totalChunks} chunks`)
        
      } catch (error) {
        console.error(`Error re-crawling website ${website.name}:`, error)
        results.push({
          websiteId: website.id,
          websiteName: website.name,
          domain: website.domain,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Re-crawled ${results.length} websites`,
      results
    })
    
  } catch (error) {
    console.error('Cron re-crawl error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
