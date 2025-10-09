import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ticketId = params.id

    // Verify user has access to this ticket
    const { data: ticket } = await supabase
      .from('tickets')
      .select('id')
      .eq('id', ticketId)
      .single()

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Get attachments (RLS will filter based on permissions)
    const { data: attachments, error } = await supabase
      .from('ticket_attachments')
      .select(`
        id,
        filename,
        original_filename,
        file_path,
        file_size,
        mime_type,
        uploaded_by,
        customer_email,
        is_internal,
        is_public,
        scan_status,
        created_at,
        users:uploaded_by(email, id)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at')

    if (error) {
      console.error('Error fetching attachments:', error)
      return NextResponse.json({ error: 'Failed to fetch attachments' }, { status: 500 })
    }

    return NextResponse.json({ attachments: attachments || [] })

  } catch (error) {
    console.error('Attachments fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ticketId = params.id

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const messageId = formData.get('message_id') as string
    const isInternal = formData.get('is_internal') === 'true'

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    // Verify user has access to this ticket
    const { data: ticket } = await supabase
      .from('tickets')
      .select('id')
      .eq('id', ticketId)
      .single()

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Validate file
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({
        error: 'File size exceeds 50MB limit'
      }, { status: 400 })
    }

    // Generate unique file path
    const fileExtension = file.name.split('.').pop()
    const uniqueId = crypto.randomUUID()
    const year = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, '0')
    const filePath = `tickets/${year}/${month}/${ticketId}/${uniqueId}.${fileExtension}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('ticket-attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading file:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Create attachment record
    const { data: attachment, error: attachmentError } = await supabase
      .from('ticket_attachments')
      .insert({
        ticket_id: ticketId,
        message_id: messageId || null,
        filename: file.name,
        original_filename: file.name,
        file_path: uploadData.path,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
        is_internal: isInternal,
        is_public: !isInternal,
        scan_status: 'pending'
      })
      .select(`
        id,
        filename,
        original_filename,
        file_size,
        mime_type,
        is_internal,
        created_at,
        users:uploaded_by(email, id)
      `)
      .single()

    if (attachmentError) {
      // Clean up uploaded file if database insert fails
      await supabase.storage
        .from('ticket-attachments')
        .remove([uploadData.path])

      console.error('Error creating attachment record:', attachmentError)
      return NextResponse.json({ error: 'Failed to save attachment' }, { status: 500 })
    }

    return NextResponse.json({ attachment }, { status: 201 })

  } catch (error) {
    console.error('Attachment upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}