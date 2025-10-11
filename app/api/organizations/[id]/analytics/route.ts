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

    const organizationId = params.id
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '7d'

    // Verify user has access to this organization
    const { data: membership } = await supabase
      .from('team_members')
      .select('id, role, permissions')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const timeFilter = getTimeFilter(timeRange)

    // Fetch all analytics data in parallel
    const [
      ticketsResponse,
      teamMembersResponse,
      websitesResponse,
      queriesResponse,
      recentTicketsResponse
    ] = await Promise.all([
      // Ticket analytics
      supabase
        .from('tickets')
        .select(`
          id,
          status,
          priority,
          created_at,
          resolved_at,
          first_response_at,
          first_response_time_minutes,
          resolution_time_minutes,
          customer_satisfaction_rating,
          assigned_to,
          category,
          sla_breach
        `)
        .eq('organization_id', organizationId)
        .gte('created_at', timeFilter),

      // Team member data
      supabase
        .from('team_members')
        .select(`
          id,
          role,
          status,
          joined_at,
          users:user_id(email)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active'),

      // Website data for query analytics
      supabase
        .from('websites')
        .select('id, name, domain')
        .eq('organization_id', organizationId),

      // Query analytics from websites
      supabase
        .from('queries')
        .select(`
          id,
          question,
          confidence,
          created_at,
          website_id,
          websites:website_id(name)
        `)
        .in('website_id', [])
        .gte('created_at', timeFilter),

      // Recent ticket activity
      supabase
        .from('tickets')
        .select(`
          id,
          title,
          status,
          priority,
          created_at,
          assigned_to,
          assignee:assigned_to(email)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(10)
    ])

    // Get website IDs and fetch queries
    const websites = websitesResponse.data || []
    const websiteIds = websites.map(w => w.id)

    let queries: any[] = []
    if (websiteIds.length > 0) {
      const { data: queriesData } = await supabase
        .from('queries')
        .select(`
          id,
          question,
          confidence,
          created_at,
          website_id,
          websites:website_id(name)
        `)
        .in('website_id', websiteIds)
        .gte('created_at', timeFilter)

      queries = queriesData || []
    }

    const tickets = ticketsResponse.data || []
    const teamMembers = teamMembersResponse.data || []
    const recentTickets = recentTicketsResponse.data || []

    // Calculate comprehensive analytics
    const analytics = {
      overview: {
        totalTickets: tickets.length,
        totalQueries: queries.length,
        totalTeamMembers: teamMembers.length,
        totalWebsites: websites.length,
        avgResponseTime: calculateAverageResponseTime(tickets),
        avgResolutionTime: calculateAverageResolutionTime(tickets),
        customerSatisfaction: calculateCustomerSatisfaction(tickets),
        slaCompliance: calculateSLACompliance(tickets)
      },

      ticketStats: {
        byStatus: getTicketsByStatus(tickets),
        byPriority: getTicketsByPriority(tickets),
        byCategory: getTicketsByCategory(tickets),
        trends: getTicketTrends(tickets, timeRange),
        responseTimeDistribution: getResponseTimeDistribution(tickets),
        resolutionTimeDistribution: getResolutionTimeDistribution(tickets)
      },

      teamPerformance: {
        memberStats: getTeamMemberStats(tickets, teamMembers),
        workloadDistribution: getWorkloadDistribution(tickets, teamMembers),
        averageTicketsPerMember: tickets.length / Math.max(teamMembers.length, 1),
        topPerformers: getTopPerformers(tickets, teamMembers)
      },

      queryAnalytics: {
        totalQueries: queries.length,
        avgConfidence: calculateAverageConfidence(queries),
        confidenceDistribution: getConfidenceDistribution(queries),
        topQueries: getTopQueries(queries),
        lowConfidenceQueries: getLowConfidenceQueries(queries),
        queriesByWebsite: getQueriesByWebsite(queries, websites)
      },

      recentActivity: {
        recentTickets: recentTickets.map(ticket => ({
          id: ticket.id,
          title: ticket.title,
          status: ticket.status,
          priority: ticket.priority,
          createdAt: ticket.created_at,
          assignedTo: ticket.assignee?.email || 'Unassigned'
        })),
        ticketsToday: getTicketsToday(tickets),
        ticketsThisWeek: getTicketsThisWeek(tickets),
        queriesThisWeek: getQueriesThisWeek(queries)
      }
    }

    return NextResponse.json({ analytics })

  } catch (error) {
    console.error('Organization analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Utility functions
function getTimeFilter(timeRange: string): string {
  const now = new Date()
  const days = timeRange === '1d' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 7
  const filterDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000))
  return filterDate.toISOString()
}

function calculateAverageResponseTime(tickets: any[]): number {
  const responseTimes = tickets
    .filter(t => t.first_response_time_minutes != null)
    .map(t => t.first_response_time_minutes)

  if (responseTimes.length === 0) return 0
  return Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length / 60) // Convert to hours
}

function calculateAverageResolutionTime(tickets: any[]): number {
  const resolutionTimes = tickets
    .filter(t => t.resolution_time_minutes != null)
    .map(t => t.resolution_time_minutes)

  if (resolutionTimes.length === 0) return 0
  return Math.round(resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length / 60) // Convert to hours
}

function calculateCustomerSatisfaction(tickets: any[]): number {
  const ratings = tickets
    .filter(t => t.customer_satisfaction_rating != null)
    .map(t => t.customer_satisfaction_rating)

  if (ratings.length === 0) return 0
  return Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10
}

function calculateSLACompliance(tickets: any[]): number {
  if (tickets.length === 0) return 100
  const compliantTickets = tickets.filter(t => !t.sla_breach).length
  return Math.round((compliantTickets / tickets.length) * 100)
}

function getTicketsByStatus(tickets: any[]) {
  return {
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length
  }
}

function getTicketsByPriority(tickets: any[]) {
  return {
    low: tickets.filter(t => t.priority === 'low').length,
    medium: tickets.filter(t => t.priority === 'medium').length,
    high: tickets.filter(t => t.priority === 'high').length,
    urgent: tickets.filter(t => t.priority === 'urgent').length
  }
}

function getTicketsByCategory(tickets: any[]) {
  const categories: Record<string, number> = {}
  tickets.forEach(ticket => {
    const category = ticket.category || 'Uncategorized'
    categories[category] = (categories[category] || 0) + 1
  })
  return categories
}

function getTicketTrends(tickets: any[], timeRange: string) {
  const days = timeRange === '1d' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 7
  const trends = []

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const dateStr = date.toISOString().split('T')[0]
    const count = tickets.filter(t => t.created_at?.startsWith(dateStr)).length
    trends.push({ date: dateStr, count })
  }

  return trends
}

function getResponseTimeDistribution(tickets: any[]) {
  const times = tickets.filter(t => t.first_response_time_minutes != null)
  return {
    under1h: times.filter(t => t.first_response_time_minutes <= 60).length,
    '1-4h': times.filter(t => t.first_response_time_minutes > 60 && t.first_response_time_minutes <= 240).length,
    '4-24h': times.filter(t => t.first_response_time_minutes > 240 && t.first_response_time_minutes <= 1440).length,
    over24h: times.filter(t => t.first_response_time_minutes > 1440).length
  }
}

function getResolutionTimeDistribution(tickets: any[]) {
  const times = tickets.filter(t => t.resolution_time_minutes != null)
  return {
    under4h: times.filter(t => t.resolution_time_minutes <= 240).length,
    '4-24h': times.filter(t => t.resolution_time_minutes > 240 && t.resolution_time_minutes <= 1440).length,
    '1-3days': times.filter(t => t.resolution_time_minutes > 1440 && t.resolution_time_minutes <= 4320).length,
    over3days: times.filter(t => t.resolution_time_minutes > 4320).length
  }
}

function getTeamMemberStats(tickets: any[], teamMembers: any[]) {
  return teamMembers.map(member => {
    const memberTickets = tickets.filter(t => t.assigned_to === member.user_id)
    const resolvedTickets = memberTickets.filter(t => t.status === 'resolved' || t.status === 'closed')

    return {
      id: member.id,
      email: member.users?.email || 'Unknown',
      role: member.role,
      totalAssigned: memberTickets.length,
      resolved: resolvedTickets.length,
      averageResolutionTime: calculateAverageResolutionTime(memberTickets),
      satisfaction: calculateCustomerSatisfaction(memberTickets)
    }
  })
}

function getWorkloadDistribution(tickets: any[], teamMembers: any[]) {
  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress')

  return teamMembers.map(member => ({
    id: member.id,
    email: member.users?.email || 'Unknown',
    openTickets: openTickets.filter(t => t.assigned_to === member.user_id).length
  }))
}

function getTopPerformers(tickets: any[], teamMembers: any[]) {
  const memberStats = getTeamMemberStats(tickets, teamMembers)
  return memberStats
    .filter(member => member.totalAssigned > 0)
    .sort((a, b) => {
      // Sort by resolution rate first, then by satisfaction
      const aRate = a.resolved / a.totalAssigned
      const bRate = b.resolved / b.totalAssigned
      if (aRate !== bRate) return bRate - aRate
      return b.satisfaction - a.satisfaction
    })
    .slice(0, 5)
}

function calculateAverageConfidence(queries: any[]): number {
  if (queries.length === 0) return 0
  const sum = queries.reduce((acc, q) => acc + (q.confidence || 0), 0)
  return Math.round((sum / queries.length) * 100) / 100
}

function getConfidenceDistribution(queries: any[]) {
  return {
    high: queries.filter(q => q.confidence > 0.8).length,
    medium: queries.filter(q => q.confidence >= 0.5 && q.confidence <= 0.8).length,
    low: queries.filter(q => q.confidence < 0.5).length
  }
}

function getTopQueries(queries: any[]) {
  const questionCounts: Record<string, { count: number; avgConfidence: number }> = {}

  queries.forEach(q => {
    if (!questionCounts[q.question]) {
      questionCounts[q.question] = { count: 0, avgConfidence: 0 }
    }
    questionCounts[q.question].count++
    questionCounts[q.question].avgConfidence += q.confidence || 0
  })

  return Object.entries(questionCounts)
    .map(([question, data]) => ({
      question,
      count: data.count,
      avgConfidence: data.avgConfidence / data.count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

function getLowConfidenceQueries(queries: any[]) {
  return queries
    .filter(q => q.confidence < 0.5)
    .sort((a, b) => a.confidence - b.confidence)
    .slice(0, 10)
    .map(q => ({
      question: q.question,
      confidence: q.confidence,
      createdAt: q.created_at,
      website: q.websites?.name || 'Unknown'
    }))
}

function getQueriesByWebsite(queries: any[], websites: any[]) {
  return websites.map(website => ({
    id: website.id,
    name: website.name,
    domain: website.domain,
    queryCount: queries.filter(q => q.website_id === website.id).length,
    avgConfidence: calculateAverageConfidence(queries.filter(q => q.website_id === website.id))
  }))
}

function getTicketsToday(tickets: any[]): number {
  const today = new Date().toDateString()
  return tickets.filter(t => new Date(t.created_at).toDateString() === today).length
}

function getTicketsThisWeek(tickets: any[]): number {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  return tickets.filter(t => new Date(t.created_at) >= weekAgo).length
}

function getQueriesThisWeek(queries: any[]): number {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  return queries.filter(q => new Date(q.created_at) >= weekAgo).length
}