import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the website belongs to the user
    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('id')
      .eq('id', params.id)
      .eq('owner_id', user.id)
      .single()

    if (websiteError || !website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 })
    }

    // Get all content for this website
    const { data: content, error } = await supabase
      .from('content')
      .select('*')
      .eq('website_id', params.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching content:', error)
      return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 })
    }

    return NextResponse.json({ content })

  } catch (error) {
    console.error('Content GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
