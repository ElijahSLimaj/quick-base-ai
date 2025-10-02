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

    const { data: website, error } = await supabase
      .from('websites')
      .select('*')
      .eq('id', params.id)
      .eq('owner_id', user.id)
      .single()

    if (error || !website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 })
    }

    return NextResponse.json({ website })

  } catch (error) {
    console.error('Website GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the website belongs to the user before deleting
    const { data: website, error: fetchError } = await supabase
      .from('websites')
      .select('id')
      .eq('id', params.id)
      .eq('owner_id', user.id)
      .single()

    if (fetchError || !website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 })
    }

    // Delete associated content and queries first
    await supabase.from('content').delete().eq('website_id', params.id)
    await supabase.from('queries').delete().eq('website_id', params.id)

    // Delete the website
    const { error: deleteError } = await supabase
      .from('websites')
      .delete()
      .eq('id', params.id)
      .eq('owner_id', user.id)

    if (deleteError) {
      console.error('Error deleting website:', deleteError)
      return NextResponse.json({ error: 'Failed to delete website' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Website DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
