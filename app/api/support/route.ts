import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message } = await request.json()

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Get user info for context
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Check if Resend API key is available
    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured')
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      )
    }

    // Send email using Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'QuickBase AI Support <elijah@attempttechnologies.io>', // Replace with your domain
        to: ['elijah@attempttechnologies.io'], // Replace with your support email
        subject: `[${subject}] Support Request from ${name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
              Support Request: ${subject}
            </h2>

            <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #374151; margin-top: 0;">Customer Information</h3>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Subject:</strong> ${subject}</p>
              ${user ? `<p><strong>User ID:</strong> ${user.id}</p>` : '<p><strong>User:</strong> Not logged in</p>'}
              ${user?.email ? `<p><strong>Account Email:</strong> ${user.email}</p>` : ''}
            </div>

            <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
              <h3 style="color: #374151; margin-top: 0;">Message</h3>
              <p style="line-height: 1.6; color: #4b5563;">${message.replace(/\n/g, '<br>')}</p>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
              <p>This message was sent from the QuickBase AI dashboard support chat.</p>
              <p>Reply directly to this email to respond to ${name}.</p>
              <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            </div>
          </div>
        `,
        replyTo: email,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Resend API error:', errorData)
      return NextResponse.json(
        { error: 'Failed to send support request' },
        { status: 500 }
      )
    }

    const data = await response.json()

    return NextResponse.json(
      { message: 'Support request sent successfully', id: data.id },
      { status: 200 }
    )

  } catch (error) {
    console.error('Support request error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}