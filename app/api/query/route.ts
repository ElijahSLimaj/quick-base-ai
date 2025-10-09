import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { generateRAGResponse } from '@/lib/ai/rag-engine'
import { checkProjectLimits, incrementQueryUsage } from '@/lib/billing/usage'
import { hasTicketingFeature, canEscalateToHuman, getTicketingUpgradeMessage } from '@/lib/billing/plans'

export async function POST(request: NextRequest) {
  // Handle CORS preflight
  const origin = request.headers.get('origin')

  console.log('=== QUERY API START ===')
  console.log('Request origin:', origin)
  console.log('Request headers:', Object.fromEntries(request.headers.entries()))

  try {
    console.log('Parsing request body...')
    const body = await request.json()
    const { question, websiteId, useHybrid = true } = body

    console.log('Query API: Received request', {
      question: question?.substring(0, 100) + '...',
      websiteId,
      useHybrid,
      fullBody: body
    })
    
    if (!question || !websiteId) {
      console.error('Query API: Missing required fields', { question: !!question, websiteId: !!websiteId })
      return NextResponse.json({ error: 'Question and website ID are required' }, { status: 400 })
    }

    // Use service client to bypass RLS for widget operations
    console.log('Creating Supabase service client...')
    const supabase = createServiceClient()
    console.log('Service client created successfully')

    console.log('Querying website from database...', { websiteId })
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('*, organization_id, plan_name')
      .eq('id', websiteId)
      .single()

    console.log('Database query result:', {
      website: website ? `Found: ${website.name}` : 'Not found',
      error: websiteError ? websiteError.message : 'No error'
    })

    if (websiteError || !website) {
      console.error('Query API: Website not found', { websiteId, error: websiteError })
      return NextResponse.json({ error: 'Website not found' }, { status: 404 })
    }

    console.log('Query API: Website found', { websiteId: website.id, name: website.name })

    // Check website limits before processing query
    console.log('Checking project limits...')
    const limitCheck = await checkProjectLimits(websiteId)
    console.log('Limit check result:', limitCheck)

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

    console.log('Generating RAG response...')
    const ragResponse = await generateRAGResponse(question, websiteId, useHybrid)
    console.log('Query API: RAG response generated', {
      answerLength: ragResponse.answer.length,
      confidence: ragResponse.confidence,
      sourcesCount: ragResponse.sources.length,
      answer: ragResponse.answer.substring(0, 200) + '...'
    })

    // Check if website plan supports ticketing and determine escalation options
    const websitePlan = website.plan_name || 'trial'
    const supportsTicketing = hasTicketingFeature(websitePlan)
    const canEscalate = canEscalateToHuman(websitePlan)
    const confidenceThreshold = 0.7
    const lowConfidence = ragResponse.confidence < confidenceThreshold

    console.log('Escalation analysis:', {
      websitePlan,
      supportsTicketing,
      canEscalate,
      confidence: ragResponse.confidence,
      lowConfidence,
      threshold: confidenceThreshold
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

    // Prepare response with escalation options
    const responseData: any = {
      answer: ragResponse.answer,
      confidence: ragResponse.confidence,
      sources: ragResponse.sources,
      // Escalation flags
      canEscalateToHuman: canEscalate,
      lowConfidence: lowConfidence,
      escalationAvailable: canEscalate && lowConfidence
    }

    // Add upgrade message for non-enterprise plans when confidence is low
    if (!canEscalate && lowConfidence) {
      responseData.upgradeForTicketing = getTicketingUpgradeMessage(websitePlan)
    }

    // Add escalation context for ticket creation
    if (canEscalate) {
      responseData.escalationContext = {
        originalQuery: question,
        aiResponse: ragResponse.answer,
        aiConfidence: ragResponse.confidence,
        websiteId: websiteId,
        escalationReason: lowConfidence ? 'low_confidence' : 'user_request'
      }
    }

    const response = NextResponse.json(responseData)

    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', origin || '*')
    response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')

    console.log('Query API: Response sent successfully')
    return response

  } catch (error) {
    console.error('=== QUERY API ERROR ===')
    console.error('Error type:', typeof error)
    console.error('Error name:', (error as any)?.constructor?.name)
    console.error('Error message:', (error as any)?.message)
    console.error('Full error object:', error)
    console.error('Error stack:', (error as any)?.stack)

    if (error && typeof error === 'object') {
      console.error('Error properties:', Object.keys(error))
      if ('status' in error) {
        console.error('HTTP Status:', (error as any).status)
      }
      if ('code' in error) {
        console.error('Error code:', (error as any).code)
      }
      if ('details' in error) {
        console.error('Error details:', (error as any).details)
      }
    }

    const errorResponse = NextResponse.json(
      {
        error: 'Internal server error',
        debug: {
          message: (error as any)?.message,
          type: (error as any)?.constructor?.name,
          timestamp: new Date().toISOString()
        }
      },
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