import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { generateRAGResponse } from '@/lib/ai/rag-engine'
import { checkProjectLimits, incrementQueryUsage } from '@/lib/billing/usage'

export async function POST(request: NextRequest) {
  // Handle CORS preflight
  const origin = request.headers.get('origin')

  try {
    const { question, websiteId, useHybrid = true } = await request.json()
    
    console.log('Query API: Received request', { question: question?.substring(0, 50) + '...', websiteId, useHybrid })
    
    if (!question || !websiteId) {
      console.error('Query API: Missing required fields', { question: !!question, websiteId: !!websiteId })
      return NextResponse.json({ error: 'Question and website ID are required' }, { status: 400 })
    }

    // Use service client to bypass RLS for widget operations
    const supabase = createServiceClient()

    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('*')
      .eq('id', websiteId)
      .single()

    if (websiteError || !website) {
      console.error('Query API: Website not found', { websiteId, error: websiteError })
      return NextResponse.json({ error: 'Website not found' }, { status: 404 })
    }

    console.log('Query API: Website found', { websiteId: website.id, name: website.name })

    // Check website limits before processing query
    const limitCheck = await checkProjectLimits(websiteId)
    if (!limitCheck.allowed) {
      console.log('Query API: Website limits exceeded', { 
        reason: limitCheck.reason, 
        limit: limitCheck.limit,
        usage: limitCheck.usage 
      })
      
      const errorResponse = NextResponse.json({
        error: 'Usage limit exceeded',
        reason: limitCheck.reason,
        limit: limitCheck.limit,
        usage: limitCheck.usage,
        upgradeRequired: true
      }, { status: 429 })
      
      // Add CORS headers
      errorResponse.headers.set('Access-Control-Allow-Origin', origin || '*')
      errorResponse.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
      errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type')
      
      return errorResponse
    }

    const ragResponse = await generateRAGResponse(question, websiteId, useHybrid)
    console.log('Query API: RAG response generated', {
      answerLength: ragResponse.answer.length,
      confidence: ragResponse.confidence,
      sourcesCount: ragResponse.sources.length
    })

    const { error: queryError } = await supabase
      .from('queries')
      .insert({
        website_id: websiteId,
        question,
        answer: ragResponse.answer,
        confidence: ragResponse.confidence
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)

    if (queryError) {
      console.error('Query API: Error saving query:', queryError)
    }

    // Increment usage count after successful query
    await incrementQueryUsage(websiteId)

    const response = NextResponse.json({
      answer: ragResponse.answer,
      confidence: ragResponse.confidence,
      sources: ragResponse.sources
    })

    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', origin || '*')
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')

    console.log('Query API: Response sent successfully')
    return response

  } catch (error) {
    console.error('Query API: Error occurred:', error)
    const errorResponse = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )

    // Add CORS headers to error response
    errorResponse.headers.set('Access-Control-Allow-Origin', origin || '*')
    errorResponse.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type')

    return errorResponse
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  })
}