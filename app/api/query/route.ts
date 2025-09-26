import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateRAGResponse } from '@/lib/ai/rag-engine'

export async function POST(request: NextRequest) {
  // Handle CORS preflight
  const origin = request.headers.get('origin')

  try {
    const { question, projectId, useHybrid = true } = await request.json()
    
    console.log('Query API: Received request', { question: question?.substring(0, 50) + '...', projectId, useHybrid })
    
    if (!question || !projectId) {
      console.error('Query API: Missing required fields', { question: !!question, projectId: !!projectId })
      return NextResponse.json({ error: 'Question and project ID are required' }, { status: 400 })
    }

    const supabase = await createClient()
    
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      console.error('Query API: Project not found', { projectId, error: projectError })
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    console.log('Query API: Project found', { projectId: project.id, name: project.name })

    const ragResponse = await generateRAGResponse(question, projectId, useHybrid)
    console.log('Query API: RAG response generated', { 
      answerLength: ragResponse.answer.length, 
      confidence: ragResponse.confidence,
      sourcesCount: ragResponse.sources.length 
    })

    const { error: queryError } = await supabase
      .from('queries')
      .insert({
        project_id: projectId,
        question,
        answer: ragResponse.answer,
        confidence: ragResponse.confidence
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)

    if (queryError) {
      console.error('Query API: Error saving query:', queryError)
    }

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