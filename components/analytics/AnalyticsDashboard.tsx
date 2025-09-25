'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, MessageCircle, FileText, ThumbsDown, Clock } from 'lucide-react'

interface AnalyticsData {
  overview: {
    totalQueries: number
    totalContent: number
    avgConfidence: number
    queriesToday: number
    queriesThisWeek: number
  }
  topQueries: Array<{
    question: string
    confidence: number
  }>
  confidenceDistribution: {
    high: number
    medium: number
    low: number
  }
  queryTrends: Array<{
    date: string
    count: number
  }>
  lowConfidenceQueries: Array<{
    question: string
    answer: string
    confidence: number
    createdAt: string
  }>
}

interface AnalyticsDashboardProps {
  projectId: string
}

export default function AnalyticsDashboard({ projectId }: AnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')

  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await fetch(`/api/analytics?projectId=${projectId}&timeRange=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data.analytics)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [projectId, timeRange])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">No analytics data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Analytics</h2>
        <div className="flex space-x-2">
          {['1d', '7d', '30d'].map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range === '1d' ? 'Today' : range === '7d' ? '7 Days' : '30 Days'}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalQueries}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.overview.queriesToday} today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Content Pieces</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalContent}</div>
            <p className="text-xs text-muted-foreground">
              Available for queries
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(analytics.overview.avgConfidence * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Answer quality
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.queriesThisWeek}</div>
            <p className="text-xs text-muted-foreground">
              Queries answered
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Confidence Distribution</CardTitle>
            <CardDescription>
              Quality of AI responses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">High (&gt;80%)</span>
                </div>
                <span className="font-medium">{analytics.confidenceDistribution.high}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm">Medium (50-80%)</span>
                </div>
                <span className="font-medium">{analytics.confidenceDistribution.medium}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm">Low (&lt;50%)</span>
                </div>
                <span className="font-medium">{analytics.confidenceDistribution.low}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Queries</CardTitle>
            <CardDescription>
              Most common questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topQueries.slice(0, 5).map((query, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 truncate flex-1 mr-2">
                    {query.question}
                  </span>
                  <span className="text-xs text-gray-500">
                    {Math.round(query.confidence * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {analytics.lowConfidenceQueries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ThumbsDown className="h-5 w-5 mr-2 text-red-500" />
              Low Confidence Queries
            </CardTitle>
            <CardDescription>
              Questions that need better answers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.lowConfidenceQueries.map((query, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm">{query.question}</h4>
                    <span className="text-xs text-red-500">
                      {Math.round(query.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{query.answer}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(query.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
