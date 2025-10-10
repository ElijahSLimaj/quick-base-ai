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
    const config = {
      open: { color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-400' },
      in_progress: { color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
      resolved: { color: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-400' },
      closed: { color: 'bg-gray-50 text-gray-700 border-gray-200', dot: 'bg-gray-400' }
    }

    const statusConfig = config[status as keyof typeof config] || config.open

    return (
      <div className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${statusConfig.color}`}>
        <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${statusConfig.dot}`}></div>
        <span className="capitalize">{status.replace('_', ' ')}</span>
      </div>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const config = {
      low: { color: 'text-gray-600', icon: '⚪' },
      medium: { color: 'text-blue-600', icon: '🟡' },
      high: { color: 'text-orange-600', icon: '🟠' },
      urgent: { color: 'text-red-600', icon: '🔴' }
    }

    const priorityConfig = config[priority as keyof typeof config] || config.medium

    return (
      <div className={`inline-flex items-center text-xs font-medium ${priorityConfig.color}`}>
        <span className="mr-1 text-[10px]">{priorityConfig.icon}</span>
        <span className="capitalize">{priority}</span>
      </div>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-mono text-gray-500">#{ticket.ticket_number}</span>
              <div className="flex items-center space-x-2">
                {getStatusBadge(ticket.status)}
                {getPriorityBadge(ticket.priority)}
              </div>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">{ticket.title}</h1>
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>{ticket.customer_name || 'Anonymous'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>{ticket.customer_email}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(ticket.created_at)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
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
              <SelectTrigger className="w-40 bg-white border-gray-200 hover:bg-gray-50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-0 shadow-lg rounded-lg z-50">
                <SelectItem value="open" className="bg-white hover:bg-gray-50">Open</SelectItem>
                <SelectItem value="in_progress" className="bg-white hover:bg-gray-50">In Progress</SelectItem>
                <SelectItem value="resolved" className="bg-white hover:bg-gray-50">Resolved</SelectItem>
                <SelectItem value="closed" className="bg-white hover:bg-gray-50">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* AI Context */}
      {ticket.original_query && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-blue-700">AI</span>
            </div>
            <h3 className="text-sm font-medium text-blue-900">AI Escalation Context</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-blue-700 mb-1">Original Question</p>
              <p className="text-sm text-blue-800">{ticket.original_query}</p>
            </div>
            {ticket.ai_response && (
              <div>
                <p className="text-xs font-medium text-blue-700 mb-1">AI Response</p>
                <p className="text-sm text-blue-800">{ticket.ai_response}</p>
              </div>
            )}
            {ticket.ai_confidence !== undefined && (
              <div className="flex items-center space-x-6 text-xs">
                <div>
                  <span className="font-medium text-blue-700">Confidence: </span>
                  <span className="text-blue-800">{(ticket.ai_confidence * 100).toFixed(1)}%</span>
                </div>
                {ticket.escalation_reason && (
                  <div>
                    <span className="font-medium text-blue-700">Reason: </span>
                    <span className="text-blue-800 capitalize">{ticket.escalation_reason.replace('_', ' ')}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conversation */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-medium text-gray-900">Conversation</h3>
        </div>

        {/* Messages */}
        <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
          {/* Initial Description */}
          <div className="flex space-x-3 pb-4 border-b border-gray-100">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-sm font-medium text-gray-900">{ticket.customer_name || 'Customer'}</span>
                <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">Initial Request</span>
                <span className="text-xs text-gray-500">{formatDate(ticket.created_at)}</span>
              </div>
              <p className="text-sm text-gray-700">{ticket.description}</p>
            </div>
          </div>

          {/* Messages */}
          {filteredMessages.map((message) => (
            <div key={message.id} className="flex space-x-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.author_type === 'customer'
                  ? 'bg-blue-100'
                  : message.is_internal
                    ? 'bg-yellow-100'
                    : 'bg-green-100'
              }`}>
                <User className={`w-4 h-4 ${
                  message.author_type === 'customer'
                    ? 'text-blue-600'
                    : message.is_internal
                      ? 'text-yellow-600'
                      : 'text-green-600'
                }`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    {message.author_type === 'customer'
                      ? (message.customer_name || 'Customer')
                      : (message.users?.email.split('@')[0] || 'Team Member')
                    }
                  </span>
                  {message.is_internal && (
                    <span className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 rounded-full font-medium">
                      Internal
                    </span>
                  )}
                  {message.is_first_response && (
                    <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full font-medium">
                      First Response
                    </span>
                  )}
                  <span className="text-xs text-gray-500">{formatDate(message.created_at)}</span>
                </div>
                <div className={`p-3 rounded-lg ${
                  message.is_internal
                    ? 'bg-yellow-50 border-l-4 border-l-yellow-300'
                    : 'bg-gray-50'
                }`}>
                  <p className="text-sm text-gray-700">{message.message}</p>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="border-t border-gray-100 p-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Internal Note</span>
              </label>
              {isInternal && (
                <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
                  Only visible to team members
                </span>
              )}
            </div>
            <Textarea
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              rows={3}
              className="resize-none"
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
        </div>
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Attachments</h3>
          <div className="space-y-3">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{attachment.original_filename}</p>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <span>{formatFileSize(attachment.file_size)}</span>
                      <span>•</span>
                      <span>{formatDate(attachment.created_at)}</span>
                      {attachment.is_internal && (
                        <>
                          <span>•</span>
                          <span className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 rounded-full font-medium">
                            Internal
                          </span>
                        </>
                      )}
                    </div>
                  </div>
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
        </div>
      )}
    </div>
  )
}