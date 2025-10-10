'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BarChart3, 
  Users, 
  Clock, 
  TrendingUp, 
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
  Activity
} from 'lucide-react'
import { useNotification } from '@/contexts/NotificationContext'

interface AssignmentStats {
  totalAssignments: number
  loadBalancingAssignments: number
  roundRobinAssignments: number
  manualAssignments: number
  averageResponseTime: number
  lastAssignmentAt: string | null
  isAutoAssignmentEnabled: boolean
  totalTeamMembers: number
  activeTeamMembers: number
}

interface AssignmentAnalyticsProps {
  organizationId: string
  userRole: 'owner' | 'admin' | 'member'
}

export function AssignmentAnalytics({ organizationId, userRole }: AssignmentAnalyticsProps) {
  const [stats, setStats] = useState<AssignmentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { showNotification } = useNotification()

  const canViewAnalytics = userRole === 'owner' || userRole === 'admin'

  useEffect(() => {
    if (canViewAnalytics) {
      loadStats()
    }
  }, [organizationId, canViewAnalytics])

  const loadStats = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/assignment?organizationId=${organizationId}&action=stats`)
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      } else {
        throw new Error('Failed to load assignment stats')
      }
    } catch (error) {
      console.error('Error loading assignment stats:', error)
      showNotification('Failed to load assignment analytics', 'error')
    } finally {
      setLoading(false)
    }
  }

  const refreshStats = async () => {
    try {
      setRefreshing(true)
      await loadStats()
      showNotification('Analytics refreshed', 'success')
    } catch (error) {
      showNotification('Failed to refresh analytics', 'error')
    } finally {
      setRefreshing(false)
    }
  }

  if (!canViewAnalytics) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <AlertCircle className="h-6 w-6 mr-2 text-amber-500" />
          <span className="text-gray-600">You don't have permission to view assignment analytics</span>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading assignment analytics...</span>
        </CardContent>
      </Card>
    )
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <AlertCircle className="h-6 w-6 mr-2 text-red-500" />
          <span className="text-gray-600">Failed to load assignment analytics</span>
        </CardContent>
      </Card>
    )
  }

  const loadBalancingPercentage = stats.totalAssignments > 0 
    ? Math.round((stats.loadBalancingAssignments / stats.totalAssignments) * 100)
    : 0

  const roundRobinPercentage = stats.totalAssignments > 0 
    ? Math.round((stats.roundRobinAssignments / stats.totalAssignments) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Assignment Analytics</h2>
          <p className="text-gray-600">Monitor your team's ticket assignment performance</p>
        </div>
        <Button onClick={refreshStats} variant="outline" disabled={refreshing}>
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Assignments</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalAssignments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Load Balancing</p>
                <p className="text-2xl font-bold text-gray-900">{stats.loadBalancingAssignments}</p>
                <p className="text-xs text-gray-500">{loadBalancingPercentage}% of total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <RefreshCw className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Round Robin</p>
                <p className="text-2xl font-bold text-gray-900">{stats.roundRobinAssignments}</p>
                <p className="text-xs text-gray-500">{roundRobinPercentage}% of total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageResponseTime}m</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Team Overview
            </CardTitle>
            <CardDescription>
              Current team composition and assignment status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Total Team Members</span>
              <Badge variant="outline">{stats.totalTeamMembers}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Active Members</span>
              <Badge variant="default">{stats.activeTeamMembers}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Auto-Assignment</span>
              <Badge variant={stats.isAutoAssignmentEnabled ? "default" : "secondary"}>
                {stats.isAutoAssignmentEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Assignment Distribution
            </CardTitle>
            <CardDescription>
              How assignments are distributed across methods
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Load Balancing</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${loadBalancingPercentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-500 w-8">{loadBalancingPercentage}%</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Round Robin</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${roundRobinPercentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-500 w-8">{roundRobinPercentage}%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Latest assignment activity and system status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium text-gray-900">Last Assignment</p>
                  <p className="text-sm text-gray-600">
                    {stats.lastAssignmentAt 
                      ? new Date(stats.lastAssignmentAt).toLocaleString()
                      : 'No recent assignments'
                    }
                  </p>
                </div>
              </div>
              <Badge variant="outline">
                {stats.lastAssignmentAt ? 'Recent' : 'None'}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Activity className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium text-gray-900">System Status</p>
                  <p className="text-sm text-gray-600">
                    Auto-assignment is {stats.isAutoAssignmentEnabled ? 'active' : 'disabled'}
                  </p>
                </div>
              </div>
              <Badge variant={stats.isAutoAssignmentEnabled ? "default" : "secondary"}>
                {stats.isAutoAssignmentEnabled ? 'Active' : 'Disabled'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
