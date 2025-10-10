interface TicketEmailData {
  ticketNumber: string
  title: string
  description?: string
  customerName?: string
  customerEmail?: string
  assigneeName?: string
  assigneeEmail?: string
  organizationName: string
  websiteName?: string
  status: string
  priority: string
  createdAt: string
  ticketUrl?: string
}

interface MessageEmailData {
  ticketNumber: string
  title: string
  message: string
  senderName: string
  senderEmail?: string
  senderType: 'team' | 'customer'
  organizationName: string
  ticketUrl?: string
  isInternal?: boolean
}

interface TeamMemberEmailData {
  organizationName: string
  inviterName: string
  inviterEmail: string
  inviteToken: string
  role: string
  expiresAt: string
}

export class ResendEmailService {
  private apiKey: string
  private fromEmail: string
  private baseUrl: string

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || ''
    this.fromEmail = 'QuickBase AI <elijah@attempttechnologies.io>' // Replace with your domain
    this.baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
  }

  private async sendEmail(to: string[], subject: string, html: string, replyTo?: string) {
    if (!this.apiKey) {
      throw new Error('RESEND_API_KEY not configured')
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.fromEmail,
        to,
        subject,
        html,
        replyTo
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Resend API error:', errorData)
      throw new Error(`Failed to send email: ${response.status}`)
    }

    return response.json()
  }

  async sendNewTicketNotification(data: TicketEmailData, teamEmails: string[]) {
    const subject = `New Support Ticket #${data.ticketNumber}: ${data.title}`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1f2937; margin: 0; font-size: 24px;">New Support Ticket</h1>
            <div style="height: 3px; background: linear-gradient(90deg, #3b82f6, #1d4ed8); margin: 15px auto; width: 80px; border-radius: 2px;"></div>
          </div>

          <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin-bottom: 25px; border-radius: 0 4px 4px 0;">
            <h2 style="margin: 0 0 10px 0; color: #1e40af; font-size: 18px;">Ticket #${data.ticketNumber}</h2>
            <p style="margin: 0; color: #1e3a8a; font-weight: 500;">${data.title}</p>
          </div>

          <div style="margin-bottom: 25px;">
            <h3 style="color: #374151; margin-bottom: 15px; font-size: 16px;">Customer Information</h3>
            <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px;">
              <p style="margin: 5px 0; color: #4b5563;"><strong>Name:</strong> ${data.customerName || 'Anonymous'}</p>
              <p style="margin: 5px 0; color: #4b5563;"><strong>Email:</strong> ${data.customerEmail || 'Not provided'}</p>
              <p style="margin: 5px 0; color: #4b5563;"><strong>Organization:</strong> ${data.organizationName}</p>
              ${data.websiteName ? `<p style="margin: 5px 0; color: #4b5563;"><strong>Website:</strong> ${data.websiteName}</p>` : ''}
            </div>
          </div>

          <div style="margin-bottom: 25px;">
            <h3 style="color: #374151; margin-bottom: 15px; font-size: 16px;">Ticket Details</h3>
            <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px;">
              <p style="margin: 5px 0; color: #4b5563;"><strong>Priority:</strong>
                <span style="background-color: ${this.getPriorityColor(data.priority)}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; text-transform: uppercase;">${data.priority}</span>
              </p>
              <p style="margin: 5px 0; color: #4b5563;"><strong>Status:</strong>
                <span style="background-color: #3b82f6; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; text-transform: uppercase;">${data.status}</span>
              </p>
              <p style="margin: 5px 0; color: #4b5563;"><strong>Created:</strong> ${new Date(data.createdAt).toLocaleString()}</p>
            </div>
          </div>

          ${data.description ? `
          <div style="margin-bottom: 25px;">
            <h3 style="color: #374151; margin-bottom: 15px; font-size: 16px;">Description</h3>
            <div style="background-color: white; border: 1px solid #e5e7eb; padding: 15px; border-radius: 6px;">
              <p style="margin: 0; color: #4b5563; line-height: 1.6;">${data.description.replace(/\n/g, '<br>')}</p>
            </div>
          </div>
          ` : ''}

          <div style="text-align: center; margin-top: 30px;">
            ${data.ticketUrl ? `
            <a href="${data.ticketUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
              View Ticket
            </a>
            ` : ''}
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; text-align: center;">
            <p style="margin: 0;">This notification was sent by QuickBase AI Ticketing System</p>
          </div>
        </div>
      </div>
    `

    return this.sendEmail(teamEmails, subject, html, data.customerEmail)
  }

  async sendTicketResponseNotification(data: MessageEmailData, recipientEmail: string) {
    const isCustomerNotification = data.senderType === 'team'
    const subject = isCustomerNotification
      ? `Response to your ticket #${data.ticketNumber}`
      : `New message on ticket #${data.ticketNumber}`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1f2937; margin: 0; font-size: 24px;">
              ${isCustomerNotification ? 'Response from Support Team' : 'New Customer Message'}
            </h1>
            <div style="height: 3px; background: linear-gradient(90deg, ${isCustomerNotification ? '#10b981' : '#f59e0b'}, ${isCustomerNotification ? '#059669' : '#d97706'}); margin: 15px auto; width: 80px; border-radius: 2px;"></div>
          </div>

          <div style="background-color: ${isCustomerNotification ? '#d1fae5' : '#fef3c7'}; border-left: 4px solid ${isCustomerNotification ? '#10b981' : '#f59e0b'}; padding: 15px; margin-bottom: 25px; border-radius: 0 4px 4px 0;">
            <h2 style="margin: 0 0 10px 0; color: ${isCustomerNotification ? '#047857' : '#92400e'}; font-size: 18px;">Ticket #${data.ticketNumber}</h2>
            <p style="margin: 0; color: ${isCustomerNotification ? '#065f46' : '#78350f'}; font-weight: 500;">${data.title}</p>
          </div>

          <div style="margin-bottom: 25px;">
            <h3 style="color: #374151; margin-bottom: 15px; font-size: 16px;">
              ${isCustomerNotification ? 'Response from' : 'Message from'} ${data.senderName}
            </h3>
            <div style="background-color: white; border: 1px solid #e5e7eb; padding: 15px; border-radius: 6px;">
              <p style="margin: 0; color: #4b5563; line-height: 1.6;">${data.message.replace(/\n/g, '<br>')}</p>
            </div>
            ${data.isInternal ? `
            <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 10px; border-radius: 6px; margin-top: 10px;">
              <p style="margin: 0; color: #92400e; font-size: 14px;"><strong>Note:</strong> This is an internal message and is not visible to the customer.</p>
            </div>
            ` : ''}
          </div>

          <div style="text-align: center; margin-top: 30px;">
            ${data.ticketUrl ? `
            <a href="${data.ticketUrl}" style="background-color: ${isCustomerNotification ? '#10b981' : '#f59e0b'}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
              ${isCustomerNotification ? 'Reply to Ticket' : 'View Ticket'}
            </a>
            ` : ''}
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; text-align: center;">
            <p style="margin: 0;">This notification was sent by QuickBase AI Ticketing System</p>
            ${isCustomerNotification ? `<p style="margin: 5px 0 0 0;">You can reply directly to this email to add a message to your ticket.</p>` : ''}
          </div>
        </div>
      </div>
    `

    return this.sendEmail([recipientEmail], subject, html)
  }

  async sendTicketStatusChangeNotification(data: TicketEmailData, oldStatus: string, recipientEmails: string[]) {
    const subject = `Ticket #${data.ticketNumber} status changed to ${data.status}`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1f2937; margin: 0; font-size: 24px;">Ticket Status Updated</h1>
            <div style="height: 3px; background: linear-gradient(90deg, #8b5cf6, #7c3aed); margin: 15px auto; width: 80px; border-radius: 2px;"></div>
          </div>

          <div style="background-color: #ede9fe; border-left: 4px solid #8b5cf6; padding: 15px; margin-bottom: 25px; border-radius: 0 4px 4px 0;">
            <h2 style="margin: 0 0 10px 0; color: #6b46c1; font-size: 18px;">Ticket #${data.ticketNumber}</h2>
            <p style="margin: 0; color: #553c9a; font-weight: 500;">${data.title}</p>
          </div>

          <div style="margin-bottom: 25px;">
            <h3 style="color: #374151; margin-bottom: 15px; font-size: 16px;">Status Change</h3>
            <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px;">
              <p style="margin: 5px 0; color: #4b5563;">
                <strong>From:</strong>
                <span style="background-color: #6b7280; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; text-transform: uppercase;">${oldStatus}</span>
              </p>
              <p style="margin: 5px 0; color: #4b5563;">
                <strong>To:</strong>
                <span style="background-color: ${this.getStatusColor(data.status)}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; text-transform: uppercase;">${data.status}</span>
              </p>
              <p style="margin: 5px 0; color: #4b5563;"><strong>Updated:</strong> ${new Date().toLocaleString()}</p>
            </div>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            ${data.ticketUrl ? `
            <a href="${data.ticketUrl}" style="background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
              View Ticket
            </a>
            ` : ''}
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; text-align: center;">
            <p style="margin: 0;">This notification was sent by QuickBase AI Ticketing System</p>
          </div>
        </div>
      </div>
    `

    return this.sendEmail(recipientEmails, subject, html)
  }

  async sendTicketAssignmentNotification(data: TicketEmailData, recipientEmail: string) {
    const subject = `You've been assigned to ticket #${data.ticketNumber}`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1f2937; margin: 0; font-size: 24px;">New Ticket Assignment</h1>
            <div style="height: 3px; background: linear-gradient(90deg, #f59e0b, #d97706); margin: 15px auto; width: 80px; border-radius: 2px;"></div>
          </div>

          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px; border-radius: 0 4px 4px 0;">
            <h2 style="margin: 0 0 10px 0; color: #92400e; font-size: 18px;">Ticket #${data.ticketNumber}</h2>
            <p style="margin: 0; color: #78350f; font-weight: 500;">${data.title}</p>
          </div>

          <div style="margin-bottom: 25px;">
            <h3 style="color: #374151; margin-bottom: 15px; font-size: 16px;">Assignment Details</h3>
            <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px;">
              <p style="margin: 5px 0; color: #4b5563;"><strong>Assigned to:</strong> ${data.assigneeName}</p>
              <p style="margin: 5px 0; color: #4b5563;"><strong>Priority:</strong>
                <span style="background-color: ${this.getPriorityColor(data.priority)}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; text-transform: uppercase;">${data.priority}</span>
              </p>
              <p style="margin: 5px 0; color: #4b5563;"><strong>Customer:</strong> ${data.customerName || 'Anonymous'}</p>
              <p style="margin: 5px 0; color: #4b5563;"><strong>Organization:</strong> ${data.organizationName}</p>
            </div>
          </div>

          ${data.description ? `
          <div style="margin-bottom: 25px;">
            <h3 style="color: #374151; margin-bottom: 15px; font-size: 16px;">Initial Request</h3>
            <div style="background-color: white; border: 1px solid #e5e7eb; padding: 15px; border-radius: 6px;">
              <p style="margin: 0; color: #4b5563; line-height: 1.6;">${data.description.replace(/\n/g, '<br>')}</p>
            </div>
          </div>
          ` : ''}

          <div style="text-align: center; margin-top: 30px;">
            ${data.ticketUrl ? `
            <a href="${data.ticketUrl}" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
              Respond to Ticket
            </a>
            ` : ''}
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; text-align: center;">
            <p style="margin: 0;">This notification was sent by QuickBase AI Ticketing System</p>
          </div>
        </div>
      </div>
    `

    return this.sendEmail([recipientEmail], subject, html)
  }

  async sendTeamInvitation(data: TeamMemberEmailData, inviteeEmail: string) {
    const inviteUrl = `${this.baseUrl}/invite/${data.inviteToken}`
    const subject = `You've been invited to join ${data.organizationName} on QuickBase AI`

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
        <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1f2937; margin: 0; font-size: 24px;">Team Invitation</h1>
            <div style="height: 3px; background: linear-gradient(90deg, #3b82f6, #1d4ed8); margin: 15px auto; width: 80px; border-radius: 2px;"></div>
          </div>

          <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin-bottom: 25px; border-radius: 0 4px 4px 0;">
            <h2 style="margin: 0 0 10px 0; color: #1e40af; font-size: 18px;">Join ${data.organizationName}</h2>
            <p style="margin: 0; color: #1e3a8a; font-weight: 500;">You've been invited as a ${data.role}</p>
          </div>

          <div style="margin-bottom: 25px;">
            <h3 style="color: #374151; margin-bottom: 15px; font-size: 16px;">Invitation Details</h3>
            <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px;">
              <p style="margin: 5px 0; color: #4b5563;"><strong>Organization:</strong> ${data.organizationName}</p>
              <p style="margin: 5px 0; color: #4b5563;"><strong>Role:</strong> ${data.role}</p>
              <p style="margin: 5px 0; color: #4b5563;"><strong>Invited by:</strong> ${data.inviterName} (${data.inviterEmail})</p>
              <p style="margin: 5px 0; color: #4b5563;"><strong>Expires:</strong> ${new Date(data.expiresAt).toLocaleString()}</p>
            </div>
          </div>

          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>What's included:</strong> Access to the QuickBase AI ticketing system, team collaboration tools, and customer support features.
            </p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${inviteUrl}" style="background-color: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block; font-size: 16px;">
              Accept Invitation
            </a>
          </div>

          <div style="margin-top: 20px; text-align: center;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              Or copy and paste this link in your browser:<br>
              <a href="${inviteUrl}" style="color: #3b82f6; word-break: break-all;">${inviteUrl}</a>
            </p>
          </div>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; text-align: center;">
            <p style="margin: 0;">This invitation was sent by QuickBase AI Team Management</p>
            <p style="margin: 5px 0 0 0;">This invitation will expire on ${new Date(data.expiresAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>
    `

    return this.sendEmail([inviteeEmail], subject, html, data.inviterEmail)
  }

  private getPriorityColor(priority: string): string {
    const colors = {
      low: '#6b7280',
      medium: '#3b82f6',
      high: '#f59e0b',
      urgent: '#ef4444'
    }
    return colors[priority as keyof typeof colors] || '#6b7280'
  }

  private getStatusColor(status: string): string {
    const colors = {
      open: '#3b82f6',
      in_progress: '#f59e0b',
      resolved: '#10b981',
      closed: '#6b7280'
    }
    return colors[status as keyof typeof colors] || '#6b7280'
  }
}

export const emailService = new ResendEmailService()