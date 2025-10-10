'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard'
import { ArrowLeft, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
export default function AnalyticsPage() {
  const params = useParams()
  const router = useRouter()
  const websiteId = params.id as string
  const [website, setWebsite] = useState<{ id: string; name: string; domain: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [timeRange, setTimeRange] = useState('7d')
  const supabase = createClient()

  const checkUser = useCallback(async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        router.push('/login')
        return
      }
      setUser(user)
    } catch (error) {
      console.error('Error checking user:', error)
      router.push('/login')
    }
  }, [router, supabase])

  const fetchWebsite = useCallback(async () => {
    try {
      const response = await fetch(`/api/websites/${websiteId}`)
      if (response.ok) {
        const data = await response.json()
        setWebsite(data.website)
      }
    } catch (error) {
      console.error('Error fetching website:', error)
    } finally {
      setLoading(false)
    }
  }, [websiteId])

  useEffect(() => {
    checkUser()
  }, [checkUser])

  useEffect(() => {
    if (user) {
      fetchWebsite()
    }
  }, [user, fetchWebsite])


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!website) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Website not found</h1>
          <p className="text-gray-600">The website you&apos;re looking for doesn&apos;t exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div>
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link href={`/dashboard/websites/${websiteId}`}>
              <Button size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
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
        </div>

        <AnalyticsDashboard projectId={websiteId} timeRange={timeRange} />
      </div>
    </div>
  )
}
