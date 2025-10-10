'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import {
  Send,
  Paperclip,
  Clock,
  AlertCircle,
  CheckCircle,
  User,
  Mail,
  Calendar,
  FileText,
  Download,
  ExternalLink,
  Eye,
  EyeOff
} from 'lucide-react'
import { useNotification } from '@/contexts/NotificationContext'

interface TicketMessage {
  id: string
  message: string
  message_type: 'reply' | 'note' | 'status_change'
  user_id?: string
  customer_email?: string
  customer_name?: string
  author_type: 'team' | 'customer' | 'system'
  is_internal: boolean
  is_first_response: boolean
  created_at: string
  updated_at: string
  users?: {
    id: string
    email: string
  } | null
}

interface TicketAttachment {
  id: string
  filename: string
  original_filename: string
  file_size: number
  mime_type: string
  uploaded_by?: string
  customer_email?: string
  is_internal: boolean
  is_public: boolean
  scan_status: 'pending' | 'safe' | 'blocked'
  created_at: string
  users?: {
    id: string
    email: string
  } | null
}

interface Ticket {
  id: string
  ticket_number: string
  title: string
  description: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  category: string
  customer_email?: string
  customer_name?: string
  assignee_id?: string
  created_at: string
  updated_at: string
  first_response_at?: string
  resolved_at?: string
  original_query?: string
  ai_response?: string
  ai_confidence?: number
  escalation_reason?: string
  assignee?: {
    id: string
    email: string
  } | null
  website?: {
    id: string
    name: string
  }
}

interface TicketDetailProps {
  ticketId: string
  userRole: 'owner' | 'admin' | 'member'
  onTicketUpdated?: (ticket: Ticket) => void
}

export function TicketDetail({ ticketId, userRole, onTicketUpdated }: TicketDetailProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [attachments, setAttachments] = useState<TicketAttachment[]>([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [showInternalMessages, setShowInternalMessages] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { showSuccess, showError } = useNotification()

  useEffect(() => {
    fetchTicketData()
  }, [ticketId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchTicketData = async () => {
    try {
      const [ticketRes, messagesRes, attachmentsRes] = await Promise.all([
        fetch(`/api/tickets/${ticketId}`),
        fetch(`/api/tickets/${ticketId}/messages`),
        fetch(`/api/tickets/${ticketId}/attachments`)
      ])

      if (ticketRes.ok) {
        const ticketData = await ticketRes.json()
        setTicket(ticketData.ticket)
      }

      if (messagesRes.ok) {
        const messagesData = await messagesRes.json()
        setMessages(messagesData.messages || [])
      }

      if (attachmentsRes.ok) {
        const attachmentsData = await attachmentsRes.json()
        setAttachments(attachmentsData.attachments || [])
      }
    } catch (error) {
      console.error('Error fetching ticket data:', error)
      showError('Failed to load ticket data')
    } finally {
      setLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    setSendingMessage(true)

    try {
      const response = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: newMessage.trim(),
          message_type: 'reply',
          is_internal: isInternal
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send message')
      }

      const data = await response.json()
      setMessages(prev => [...prev, data.message])
      setNewMessage('')
      showSuccess('Message sent successfully')

    } catch (error) {
      console.error('Error sending message:', error)
      showError(error instanceof Error ? error.message : 'Failed to send message')
    } finally {
      setSendingMessage(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update status')
      }

      const data = await response.json()
      setTicket(data.ticket)
      showSuccess('Ticket status updated')

      if (onTicketUpdated) {
        onTicketUpdated(data.ticket)
      }

    } catch (error) {
      console.error('Error updating status:', error)
      showError(error instanceof Error ? error.message : 'Failed to update status')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock className="w-4 h-4" />
      case 'in_progress':
        return <AlertCircle className="w-4 h-4" />
      case 'resolved':
      case 'closed':
        return <CheckCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      open: 'bg-blue-100 text-blue-800 border-blue-200',
      in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      resolved: 'bg-green-100 text-green-800 border-green-200',
      closed: 'bg-gray-100 text-gray-800 border-gray-200'
    }

    return (
      <Badge variant="secondary" className={colors[status as keyof typeof colors]}>
        {getStatusIcon(status)}
        <span className="ml-1 capitalize">{status.replace('_', ' ')}</span>
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-700',
      medium: 'bg-blue-100 text-blue-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700'
    }

    return (
      <Badge variant="outline" className={colors[priority as keyof typeof colors]}>
        {priority}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const filteredMessages = messages.filter(message => {
    if (!showInternalMessages && message.is_internal) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Ticket not found</h3>
        <p className="text-gray-600">The ticket you're looking for doesn't exist or you don't have access to it.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Ticket Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold">#{ticket.ticket_number}</h1>
                {getStatusBadge(ticket.status)}
                {getPriorityBadge(ticket.priority)}
              </div>
              <h2 className="text-xl text-gray-900">{ticket.title}</h2>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>Created {formatDate(ticket.created_at)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <User className="w-4 h-4" />
                  <span>{ticket.customer_name || 'Anonymous'}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Mail className="w-4 h-4" />
                  <span>{ticket.customer_email}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInternalMessages(!showInternalMessages)}
              >
                {showInternalMessages ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Hide Internal
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Show Internal
                  </>
                )}
              </Button>
              <Select value={ticket.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* AI Context */}
      {ticket.original_query && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg text-blue-900">AI Escalation Context</CardTitle>
            <CardDescription className="text-blue-700">
              This ticket was escalated from an AI conversation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-blue-900">Original Question</Label>
              <p className="text-sm text-blue-800 mt-1">{ticket.original_query}</p>
            </div>
            {ticket.ai_response && (
              <div>
                <Label className="text-sm font-medium text-blue-900">AI Response</Label>
                <p className="text-sm text-blue-800 mt-1">{ticket.ai_response}</p>
              </div>
            )}
            {ticket.ai_confidence !== undefined && (
              <div className="flex items-center space-x-4">
                <div>
                  <Label className="text-sm font-medium text-blue-900">AI Confidence</Label>
                  <p className="text-sm text-blue-800">{(ticket.ai_confidence * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-blue-900">Escalation Reason</Label>
                  <p className="text-sm text-blue-800 capitalize">{ticket.escalation_reason?.replace('_', ' ')}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {/* Initial Description */}
            <div className="flex space-x-3 pb-4 border-b">
              <Avatar>
                <AvatarFallback>
                  <User className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="font-medium">{ticket.customer_name || 'Customer'}</span>
                  <Badge variant="outline" className="text-xs">Initial Request</Badge>
                  <span className="text-xs text-gray-500">{formatDate(ticket.created_at)}</span>
                </div>
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700">{ticket.description}</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            {filteredMessages.map((message) => (
              <div key={message.id} className="flex space-x-3">
                <Avatar>
                  <AvatarFallback>
                    {message.author_type === 'customer' ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="font-medium">
                      {message.author_type === 'customer'
                        ? (message.customer_name || 'Customer')
                        : (message.users?.email.split('@')[0] || 'Team Member')
                      }
                    </span>
                    {message.is_internal && (
                      <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                        Internal
                      </Badge>
                    )}
                    {message.is_first_response && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                        First Response
                      </Badge>
                    )}
                    <span className="text-xs text-gray-500">{formatDate(message.created_at)}</span>
                  </div>
                  <div className={`prose prose-sm max-w-none ${
                    message.is_internal ? 'bg-yellow-50 border-l-4 border-l-yellow-200 pl-4 py-2' : ''
                  }`}>
                    <p className="text-gray-700">{message.message}</p>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <Separator className="my-6" />

          {/* Message Input */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="internal-toggle" className="text-sm">
                Internal Note
              </Label>
              <input
                id="internal-toggle"
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="rounded"
              />
              {isInternal && (
                <span className="text-xs text-yellow-600">
                  This message will only be visible to team members
                </span>
              )}
            </div>
            <Textarea
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              rows={3}
            />
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm">
                <Paperclip className="w-4 h-4 mr-2" />
                Attach File
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sendingMessage}
              >
                {sendingMessage ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attachments */}
      {attachments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Attachments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{attachment.original_filename}</p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(attachment.file_size)} • {formatDate(attachment.created_at)}
                      </p>
                    </div>
                    {attachment.is_internal && (
                      <Badge variant="secondary" className="text-xs">Internal</Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}