'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Globe, 
  MessageCircle, 
  TrendingUp, 
  Users, 
  Ticket, 
  BarChart3, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Organization {
  id: string
  name: string
  plan_name: string
  seat_count: number
  max_seats: number
}

interface AnalyticsData {
  totalWebsites: number
  totalQueries: number
  totalContent: number
  openTickets: number
  teamMembers: number
  queriesThisMonth: number
  queriesLastMonth: number
  avgResponseTime: number
  satisfactionScore: number
  recentActivity: Array<{
    id: string
    type: 'query' | 'ticket' | 'website' | 'content'
    description: string
    timestamp: string
    status: 'success' | 'warning' | 'error'
  }>
}

export default function OverviewPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalWebsites: 0,
    totalQueries: 0,
    totalContent: 0,
    openTickets: 0,
    teamMembers: 0,
    queriesThisMonth: 0,
    queriesLastMonth: 0,
    avgResponseTime: 0,
    satisfactionScore: 0,
    recentActivity: []
  })

  useEffect(() => {
    const loadAnalyticsData = async () => {
      try {
        // Check auth
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
          router.push('/login')
          return
        }

        // Fetch organization
        const orgResponse = await fetch('/api/organizations')
        if (orgResponse.ok) {
          const orgData = await orgResponse.json()
          if (orgData.organizations && orgData.organizations.length > 0) {
            setOrganization(orgData.organizations[0])
          }
        }

        // Fetch websites and calculate analytics
        const websitesResponse = await fetch('/api/websites')
        if (websitesResponse.ok) {
          const websitesData = await websitesResponse.json()
          const websites = websitesData.websites || []
          
          const totalQueries = websites.reduce((sum: number, site: any) => 
            sum + (Array.isArray(site.queries) && site.queries.length > 0 ? site.queries[0].count : 0), 0
          )
          const totalContent = websites.reduce((sum: number, site: any) => 
            sum + (Array.isArray(site.content) && site.content.length > 0 ? site.content[0].count : 0), 0
          )

          setAnalytics(prev => ({
            ...prev,
            totalWebsites: websites.length,
            totalQueries,
            totalContent,
            queriesThisMonth: Math.floor(totalQueries * 0.7), // Mock data
            queriesLastMonth: Math.floor(totalQueries * 0.5),
            avgResponseTime: 2.3,
            satisfactionScore: 4.8,
            recentActivity: [
              {
                id: '1',
                type: 'query',
                description: 'New query from example.com',
                timestamp: '2 minutes ago',
                status: 'success'
              },
              {
                id: '2',
                type: 'ticket',
                description: 'Support ticket #1234 created',
                timestamp: '15 minutes ago',
                status: 'warning'
              },
              {
                id: '3',
                type: 'website',
                description: 'New website added: docs.company.com',
                timestamp: '1 hour ago',
                status: 'success'
              },
              {
                id: '4',
                type: 'content',
                description: 'Content updated for support.com',
                timestamp: '2 hours ago',
                status: 'success'
              }
            ]
          }))
        }

        // Fetch tickets if enterprise
        if (organization?.plan_name === 'enterprise') {
          const ticketsResponse = await fetch('/api/tickets?status=open')
          if (ticketsResponse.ok) {
            const ticketsData = await ticketsResponse.json()
            setAnalytics(prev => ({
              ...prev,
              openTickets: ticketsData.tickets?.length || 0
            }))
          }
        }

      } catch (error) {
        console.error('Error loading analytics data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAnalyticsData()
  }, [router, supabase, organization?.plan_name])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  const isEnterprise = organization?.plan_name === 'enterprise'
  const queryGrowth = analytics.queriesThisMonth - analytics.queriesLastMonth
  const queryGrowthPercent = analytics.queriesLastMonth > 0 ? 
    Math.round((queryGrowth / analytics.queriesLastMonth) * 100) : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-600 mt-2">
          Welcome back! Here's your AI support system performance.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Queries</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.totalQueries.toLocaleString()}</p>
                <div className="flex items-center mt-2">
                  {queryGrowth >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-sm ml-1 ${queryGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(queryGrowthPercent)}%
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs last month</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <MessageCircle className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Websites</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.totalWebsites}</p>
                <p className="text-sm text-gray-500 mt-2">AI widgets deployed</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Globe className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.avgResponseTime}s</p>
                <p className="text-sm text-gray-500 mt-2">AI response speed</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Satisfaction</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.satisfactionScore}/5</p>
                <p className="text-sm text-gray-500 mt-2">User rating</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enterprise Metrics */}
      {isEnterprise && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Open Tickets</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.openTickets}</p>
                  <p className="text-sm text-gray-500 mt-2">Awaiting response</p>
                </div>
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Ticket className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Team Members</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.teamMembers}</p>
                  <p className="text-sm text-gray-500 mt-2">Active users</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Content Pieces</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.totalContent}</p>
                  <p className="text-sm text-gray-500 mt-2">Knowledge base</p>
                </div>
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system events and updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.status === 'success' ? 'bg-green-500' :
                    activity.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500">{activity.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Current operational status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-gray-900">AI Engine</span>
                </div>
                <span className="text-sm text-green-600">Operational</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-gray-900">Database</span>
                </div>
                <span className="text-sm text-green-600">Operational</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-gray-900">API Services</span>
                </div>
                <span className="text-sm text-green-600">Operational</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-gray-900">Support Widgets</span>
                </div>
                <span className="text-sm text-green-600">Operational</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and navigation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/dashboard/websites">
              <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center space-y-2">
                <Globe className="h-6 w-6 text-blue-600" />
                <span className="text-sm font-medium">Manage Websites</span>
              </Button>
            </Link>
            
            {isEnterprise && (
              <Link href="/dashboard/tickets">
                <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center space-y-2">
                  <Ticket className="h-6 w-6 text-orange-600" />
                  <span className="text-sm font-medium">View Tickets</span>
                </Button>
              </Link>
            )}
            
            {isEnterprise && (
              <Link href="/dashboard/organization/team">
                <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center space-y-2">
                  <Users className="h-6 w-6 text-green-600" />
                  <span className="text-sm font-medium">Team Management</span>
                </Button>
              </Link>
            )}
            
            <Link href="/dashboard/billing">
              <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center space-y-2">
                <Activity className="h-6 w-6 text-purple-600" />
                <span className="text-sm font-medium">Billing & Usage</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
