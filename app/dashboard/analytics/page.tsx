'use client'

import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Users, MessageSquare, Clock, Target, ThumbsUp, AlertTriangle, Download, Calendar, Filter, Zap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { useNotification } from '@/contexts/NotificationContext'

interface AnalyticsData {
  overview: {
    totalTickets: number
    totalQueries: number
    totalTeamMembers: number
    totalWebsites: number
    avgResponseTime: number
    avgResolutionTime: number
    customerSatisfaction: number
    slaCompliance: number
  }
  ticketStats: {
    byStatus: Record<string, number>
    byPriority: Record<string, number>
    byCategory: Record<string, number>
    trends: Array<{ date: string; count: number }>
    responseTimeDistribution: Record<string, number>
    resolutionTimeDistribution: Record<string, number>
  }
  teamPerformance: {
    memberStats: Array<{
      id: string
      email: string
      role: string
      totalAssigned: number
      resolved: number
      averageResolutionTime: number
      satisfaction: number
    }>
    workloadDistribution: Array<{
      id: string
      email: string
      openTickets: number
    }>
    averageTicketsPerMember: number
    topPerformers: Array<{
      id: string
      email: string
      totalAssigned: number
      resolved: number
      satisfaction: number
    }>
  }
  queryAnalytics: {
    totalQueries: number
    avgConfidence: number
    confidenceDistribution: Record<string, number>
    topQueries: Array<{
      question: string
      count: number
      avgConfidence: number
    }>
    lowConfidenceQueries: Array<{
      question: string
      confidence: number
      createdAt: string
      website: string
    }>
    queriesByWebsite: Array<{
      id: string
      name: string
      domain: string
      queryCount: number
      avgConfidence: number
    }>
  }
  recentActivity: {
    recentTickets: Array<{
      id: string
      title: string
      status: string
      priority: string
      createdAt: string
      assignedTo: string
    }>
    ticketsToday: number
    ticketsThisWeek: number
    queriesThisWeek: number
  }
}

interface Organization {
  id: string
  name: string
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')
  const [activeTab, setActiveTab] = useState('overview')
  const { showError } = useNotification()

  useEffect(() => {
    loadOrganizationAndAnalytics()
  }, [timeRange])

  const loadOrganizationAndAnalytics = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      // Get user's organization
      const { data: membership } = await supabase
        .from('team_members')
        .select(`
          organization_id,
          organizations:organization_id(id, name)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (!membership?.organizations) {
        showError('No organization found')
        return
      }

      const org = membership.organizations as any
      setOrganization({ id: org.id, name: org.name })

      // Fetch analytics data
      const response = await fetch(`/api/organizations/${org.id}/analytics?timeRange=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data.analytics)
      } else {
        showError('Failed to load analytics data')
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
      showError('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const exportAnalytics = () => {
    if (!analytics || !organization) return

    const csvData = [
      ['Metric', 'Value'],
      ['Total Tickets', analytics.overview.totalTickets],
      ['Total Queries', analytics.overview.totalQueries],
      ['Team Members', analytics.overview.totalTeamMembers],
      ['Avg Response Time (hours)', analytics.overview.avgResponseTime],
      ['Avg Resolution Time (hours)', analytics.overview.avgResolutionTime],
      ['Customer Satisfaction', analytics.overview.customerSatisfaction],
      ['SLA Compliance (%)', analytics.overview.slaCompliance]
    ]

    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${organization.name}-analytics-${timeRange}.csv`
    a.click()
    URL.revokeObjectURL(url)
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading analytics...</span>
        </div>
      </div>
    )
  }

  if (!analytics || !organization) {
    return (
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
            <p className="text-gray-500">Unable to load analytics data for your organization.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Organization Analytics</h1>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-sm text-gray-500">{organization.name}</span>
              <span className="text-gray-300">•</span>
              <span className="text-sm text-gray-500">
                Last {timeRange === '1d' ? '24 hours' : timeRange === '7d' ? '7 days' : timeRange === '30d' ? '30 days' : '90 days'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportAnalytics}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 bg-white shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Tickets</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{analytics.overview.totalTickets}</p>
                <p className="text-xs text-gray-500 mt-1">{analytics.recentActivity.ticketsToday} today</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Avg Response</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{analytics.overview.avgResponseTime}h</p>
                <p className="text-xs text-gray-500 mt-1">Average time</p>
              </div>
              <div className="p-2 bg-green-50 rounded-lg">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Satisfaction</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{analytics.overview.customerSatisfaction}/5</p>
                <p className="text-xs text-gray-500 mt-1">Customer rating</p>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg">
                <ThumbsUp className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">SLA Compliance</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{analytics.overview.slaCompliance}%</p>
                <p className="text-xs text-gray-500 mt-1">On-time resolution</p>
              </div>
              <div className="p-2 bg-orange-50 rounded-lg">
                <Target className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-gray-50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="team">Team Performance</TabsTrigger>
          <TabsTrigger value="queries">AI Queries</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Ticket Status Distribution */}
            <Card className="border-0 bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Ticket Status</CardTitle>
                <CardDescription>Current ticket distribution by status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(analytics.ticketStats.byStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(status)}
                      </div>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Priority Distribution */}
            <Card className="border-0 bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Priority Distribution</CardTitle>
                <CardDescription>Tickets by priority level</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(analytics.ticketStats.byPriority).map(([priority, count]) => (
                    <div key={priority} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getPriorityBadge(priority)}
                      </div>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Query Confidence */}
            <Card className="border-0 bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">AI Query Confidence</CardTitle>
                <CardDescription>Distribution of AI response confidence</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">High (&gt;80%)</span>
                    </div>
                    <span className="font-medium">{analytics.queryAnalytics.confidenceDistribution.high}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm">Medium (50-80%)</span>
                    </div>
                    <span className="font-medium">{analytics.queryAnalytics.confidenceDistribution.medium}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm">Low (&lt;50%)</span>
                    </div>
                    <span className="font-medium">{analytics.queryAnalytics.confidenceDistribution.low}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border-0 bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Recent Tickets</CardTitle>
                <CardDescription>Latest ticket activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.recentActivity.recentTickets.slice(0, 5).map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{ticket.title}</p>
                        <p className="text-xs text-gray-500">
                          {ticket.assignedTo} • {new Date(ticket.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(ticket.status)}
                        {getPriorityBadge(ticket.priority)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Team Performance */}
            <Card className="border-0 bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Team Performance</CardTitle>
                <CardDescription>Individual team member statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.teamPerformance.memberStats.slice(0, 5).map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium text-sm">{member.email}</p>
                        <p className="text-xs text-gray-500">{member.role}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{member.resolved}/{member.totalAssigned}</p>
                        <p className="text-xs text-gray-500">resolved</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Workload Distribution */}
            <Card className="border-0 bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Current Workload</CardTitle>
                <CardDescription>Open tickets per team member</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.teamPerformance.workloadDistribution.map((member) => (
                    <div key={member.id} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{member.email}</span>
                      <Badge variant={member.openTickets > 5 ? 'destructive' : 'default'}>
                        {member.openTickets} open
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="queries" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Top Queries */}
            <Card className="border-0 bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Most Common Questions</CardTitle>
                <CardDescription>Frequently asked questions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.queryAnalytics.topQueries.slice(0, 5).map((query, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                      <span className="text-sm text-gray-600 truncate flex-1 mr-2">
                        {query.question}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">{query.count}x</span>
                        <span className="text-xs text-gray-500">
                          {Math.round(query.avgConfidence * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Low Confidence Queries */}
            <Card className="border-0 bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
                  Needs Improvement
                </CardTitle>
                <CardDescription>Queries with low AI confidence</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.queryAnalytics.lowConfidenceQueries.slice(0, 5).map((query, index) => (
                    <div key={index} className="p-3 rounded-lg border border-orange-200 bg-orange-50">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-medium text-gray-900 flex-1 mr-2">{query.question}</p>
                        <span className="text-xs text-orange-600">
                          {Math.round(query.confidence * 100)}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{query.website}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}