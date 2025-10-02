import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const websiteId = searchParams.get('projectId') // Keep same param name for compatibility
    const timeRange = searchParams.get('timeRange') || '7d'

    if (!websiteId) {
      return NextResponse.json({ error: 'Website ID is required' }, { status: 400 })
    }

    const { data: website, error: websiteError } = await supabase
      .from('websites')
      .select('*')
      .eq('id', websiteId)
      .eq('owner_id', user.id)
      .single()

    if (websiteError || !website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 })
    }

    const timeFilter = getTimeFilter(timeRange)
    
    const [
      { data: queries, error: queriesError },
      { data: contentStats, error: contentError },
      { data: topQueries, error: topQueriesError },
      { data: confidenceStats, error: confidenceError }
    ] = await Promise.all([
      supabase
        .from('queries')
        .select('*')
        .eq('website_id', websiteId)
        .gte('created_at', timeFilter)
        .order('created_at', { ascending: false }),
      
      supabase
        .from('content')
        .select('id, created_at')
        .eq('website_id', websiteId),
      
      supabase
        .from('queries')
        .select('question, confidence')
        .eq('website_id', websiteId)
        .gte('created_at', timeFilter)
        .order('confidence', { ascending: false })
        .limit(10),
      
      supabase
        .from('queries')
        .select('confidence')
        .eq('website_id', websiteId)
        .gte('created_at', timeFilter)
    ])

    if (queriesError || contentError || topQueriesError || confidenceError) {
      console.error('Analytics query errors:', { queriesError, contentError, topQueriesError, confidenceError })
      return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
    }

    const analytics = {
      overview: {
        totalQueries: queries?.length || 0,
        totalContent: contentStats?.length || 0,
        avgConfidence: calculateAverageConfidence(confidenceStats || []),
        queriesToday: getQueriesToday((queries || []).filter(q => q.created_at) as { created_at: string }[]),
        queriesThisWeek: getQueriesThisWeek((queries || []).filter(q => q.created_at) as { created_at: string }[])
      },
      topQueries: (topQueries || []).map((q: { question: string; confidence: number }) => ({
        question: q.question,
        confidence: q.confidence
      })),
      confidenceDistribution: getConfidenceDistribution(confidenceStats || []),
      queryTrends: getQueryTrends((queries || []).filter(q => q.created_at) as { created_at: string }[], timeRange),
      lowConfidenceQueries: (queries || [])
        .filter((q: { confidence: number }) => q.confidence < 0.5)
        .slice(0, 5)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((q: any) => ({
          question: q.question,
          answer: q.answer,
          confidence: q.confidence,
          createdAt: q.created_at
        }))
    }

    return NextResponse.json({ analytics })

  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getTimeFilter(timeRange: string): string {
  const now = new Date()
  const days = timeRange === '1d' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 7
  const filterDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000))
  return filterDate.toISOString()
}

function calculateAverageConfidence(queries: Array<{ confidence: number }>): number {
  if (queries.length === 0) return 0
  const sum = queries.reduce((acc, q) => acc + q.confidence, 0)
  return Math.round((sum / queries.length) * 100) / 100
}

function getQueriesToday(queries: Array<{ created_at: string }>): number {
  const today = new Date().toDateString()
  return queries.filter(q => new Date(q.created_at).toDateString() === today).length
}

function getQueriesThisWeek(queries: Array<{ created_at: string }>): number {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  return queries.filter(q => new Date(q.created_at) >= weekAgo).length
}

function getConfidenceDistribution(queries: Array<{ confidence: number }>): Record<string, number> {
  const distribution = {
    high: 0,    // > 0.8
    medium: 0,  // 0.5 - 0.8
    low: 0      // < 0.5
  }

  queries.forEach(q => {
    if (q.confidence > 0.8) distribution.high++
    else if (q.confidence >= 0.5) distribution.medium++
    else distribution.low++
  })

  return distribution
}

function getQueryTrends(queries: Array<{ created_at: string }>, timeRange: string): Array<{ date: string; count: number }> {
  const days = timeRange === '1d' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 7
  const trends: Array<{ date: string; count: number }> = []
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const dateStr = date.toISOString().split('T')[0]
    const count = queries.filter(q => q.created_at.startsWith(dateStr)).length
    trends.push({ date: dateStr, count })
  }
  
  return trends
}
