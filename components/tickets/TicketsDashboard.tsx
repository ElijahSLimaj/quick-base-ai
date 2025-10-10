'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, Filter, Clock, AlertCircle, CheckCircle, MessageSquare, User, Calendar, Download, Circle, Zap, Timer, TrendingUp } from 'lucide-react'
import { useNotification } from '@/contexts/NotificationContext'
import { CreateTicketDialog } from './CreateTicketDialog'

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
  message_count: number
  has_unread_messages: boolean
  assignee?: {
    id: string
    email: string
  } | null
  website?: {
    id: string
    name: string
  }
}

interface TicketStats {
  total: number
  open: number
  in_progress: number
  resolved: number
  closed: number
  avg_response_time: number
  avg_resolution_time: number
}

interface Organization {
  id: string
  name: string
  slug: string
}

interface TicketsDashboardProps {
  organization: Organization
  onTicketClick?: (ticketId: string) => void
}

export function TicketsDashboard({ organization, onTicketClick }: TicketsDashboardProps) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [stats, setStats] = useState<TicketStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTab, setActiveTab] = useState('all')
  const { showError } = useNotification()

  const itemsPerPage = 10

  useEffect(() => {
    fetchTickets()
    fetchStats()
  }, [organization.id, statusFilter, priorityFilter])

  const fetchTickets = async () => {
    try {
      const params = new URLSearchParams({
        organization_id: organization.id,
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      })

      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (priorityFilter !== 'all') {
        params.append('priority', priorityFilter)
      }
      if (searchQuery) {
        params.append('search', searchQuery)
      }

      const response = await fetch(`/api/tickets?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch tickets')
      }

      const data = await response.json()
      setTickets(data.tickets || [])
    } catch (error) {
      console.error('Error fetching tickets:', error)
      showError('Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/tickets/stats?organization_id=${organization.id}`)
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setCurrentPage(1)
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredTickets = tickets.filter(ticket => {
    if (activeTab === 'unread' && !ticket.has_unread_messages) return false
    if (activeTab === 'assigned' && !ticket.assignee_id) return false
    if (activeTab === 'unassigned' && ticket.assignee_id) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Modern Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Support Tickets</h1>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-sm text-gray-500">{organization.name}</span>
              {stats && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="text-sm font-medium text-gray-700">{stats.total} total</span>
                </>
              )}
            </div>
          </div>
        </div>
        <CreateTicketDialog
          organizationId={organization.id}
          onTicketCreated={() => {
            fetchTickets()
            fetchStats()
          }}
        />
      </div>

      {/* Compact Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">{stats.open + stats.in_progress}</p>
              </div>
              <div className="p-2 bg-amber-50 rounded-lg">
                <Circle className="w-4 h-4 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Resolved</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">{stats.resolved}</p>
              </div>
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Avg Response</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">{stats.avg_response_time}h</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Timer className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Resolution</p>
                <p className="text-xl font-semibold text-gray-900 mt-1">{stats.avg_resolution_time}h</p>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg">
                <TrendingUp className="w-4 h-4 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Filters and Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-gray-50">
                <TabsTrigger value="all" className="text-sm">All</TabsTrigger>
                <TabsTrigger value="unread" className="text-sm">
                  Unread
                  {filteredTickets.filter(t => t.has_unread_messages).length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                      {filteredTickets.filter(t => t.has_unread_messages).length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="assigned" className="text-sm">Assigned</TabsTrigger>
                <TabsTrigger value="unassigned" className="text-sm">Unassigned</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search tickets..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 border-gray-200"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 bg-white border-gray-200 hover:bg-gray-50">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-white border-0 shadow-lg rounded-lg z-50">
                  <SelectItem value="all" className="bg-white hover:bg-gray-50">All Status</SelectItem>
                  <SelectItem value="open" className="bg-white hover:bg-gray-50">Open</SelectItem>
                  <SelectItem value="in_progress" className="bg-white hover:bg-gray-50">In Progress</SelectItem>
                  <SelectItem value="resolved" className="bg-white hover:bg-gray-50">Resolved</SelectItem>
                  <SelectItem value="closed" className="bg-white hover:bg-gray-50">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-32 bg-white border-gray-200 hover:bg-gray-50">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent className="bg-white border-0 shadow-lg rounded-lg z-50">
                  <SelectItem value="all" className="bg-white hover:bg-gray-50">All Priority</SelectItem>
                  <SelectItem value="low" className="bg-white hover:bg-gray-50">Low</SelectItem>
                  <SelectItem value="medium" className="bg-white hover:bg-gray-50">Medium</SelectItem>
                  <SelectItem value="high" className="bg-white hover:bg-gray-50">High</SelectItem>
                  <SelectItem value="urgent" className="bg-white hover:bg-gray-50">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Modern Ticket Cards */}
        <div className="px-6 py-4 space-y-3">
          {filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              className={`group cursor-pointer bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-150 ${
                ticket.has_unread_messages ? 'ring-2 ring-blue-100 border-blue-200' : ''
              }`}
              onClick={() => onTicketClick?.(ticket.id)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-mono text-gray-500">#{ticket.ticket_number}</span>
                        {ticket.has_unread_messages && (
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-xs font-medium text-blue-600">New</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(ticket.status)}
                        {getPriorityBadge(ticket.priority)}
                      </div>
                    </div>

                    <h3 className="text-base font-medium text-gray-900 mb-1 truncate pr-4">
                      {ticket.title}
                    </h3>

                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <User className="w-3 h-3" />
                        <span>{ticket.customer_name || 'Anonymous'}</span>
                      </div>

                      {ticket.assignee && (
                        <div className="flex items-center space-x-1">
                          <span>assigned to</span>
                          <span className="font-medium text-gray-700">
                            {ticket.assignee.email.split('@')[0]}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center space-x-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>{ticket.message_count}</span>
                      </div>

                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(ticket.updated_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredTickets.length === 0 && (
            <div className="text-center py-16">
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-base font-medium text-gray-900 mb-1">No tickets found</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                  ? 'Try adjusting your filters or search query to find what you\'re looking for.'
                  : 'Your customers haven\'t created any support tickets yet. They\'ll appear here when they do.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}