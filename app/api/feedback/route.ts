import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { queryId, rating, feedback, projectId } = await request.json()
    
    if (!queryId || !projectId || rating === undefined) {
      return NextResponse.json({ error: 'Query ID, project ID, and rating are required' }, { status: 400 })
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('*')
      .eq('id', projectId)
      .eq('owner_id', user.id)
      .single()

    if (websiteError || !website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 })
    }

    const { data: query, error: queryError } = await supabase
      .from('queries')
      .select('*')
      .eq('id', queryId)
      .eq('project_id', projectId)
      .single()

    if (queryError || !query) {
      return NextResponse.json({ error: 'Query not found' }, { status: 404 })
    }

    const { error: feedbackError } = await supabase
      .from('query_feedback')
      .upsert({
        query_id: queryId,
        rating,
        feedback: feedback || null,
        created_at: new Date().toISOString()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)

    if (feedbackError) {
      console.error('Error saving feedback:', feedbackError)
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Feedback error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    const { data: feedback, error } = await supabase
      .from('query_feedback')
      .select(`
        *,
        query:queries (
          question,
          answer,
          confidence
        )
      `)
      .eq('query.project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching feedback:', error)
      return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 })
    }

    return NextResponse.json({ feedback })

  } catch (error) {
    console.error('Feedback GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
