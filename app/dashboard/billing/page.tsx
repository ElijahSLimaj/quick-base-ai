'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { clientSubscriptionService } from '@/lib/billing/subscription-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PricingCards } from '@/components/billing/PricingCards'
import { UsageDisplay } from '@/components/billing/UsageDisplay'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { type PlanKey } from '@/lib/billing/plans'

export default function BillingPage() {
  const [currentPlan, setCurrentPlan] = useState<PlanKey>('starter')
  const [websites, setWebsites] = useState<any[]>([])
  const [selectedWebsite, setSelectedWebsite] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadBillingData()
  }, [])

  const loadBillingData = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Fetch user's websites
      const response = await fetch('/api/websites')
      if (response.ok) {
        const data = await response.json()
        setWebsites(data.websites || [])

        if (data.websites && data.websites.length > 0) {
          setSelectedWebsite(data.websites[0].id)
        }
      }

      // Fetch current plan
      const plan = await clientSubscriptionService.getUserPlan(user.id)
      setCurrentPlan(plan)

    } catch (error) {
      console.error('Error loading billing data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleManageBilling = async () => {
    if (!selectedWebsite) return

    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteId: selectedWebsite })
      })

      if (response.ok) {
        const { portal_url } = await response.json()
        window.open(portal_url, '_blank')
      } else {
        throw new Error('Failed to open billing portal')
      }
    } catch (error) {
      console.error('Portal error:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading billing information...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/dashboard"
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing & Plans</h1>
              <p className="text-gray-600">Manage your subscription and billing settings</p>
            </div>

            {/* Current Plan Status */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Current Plan Status</CardTitle>
                <CardDescription>
                  Your current plan and billing information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Current Plan</p>
                    <p className="text-2xl font-bold capitalize">{currentPlan}</p>
                  </div>
                  <Button onClick={handleManageBilling} variant="secondary">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Manage Billing
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Website Selection */}
            {websites.length > 1 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Select Website</CardTitle>
                  <CardDescription>
                    Choose which website to upgrade
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <select
                    value={selectedWebsite}
                    onChange={(e) => setSelectedWebsite(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {websites.map((website) => (
                      <option key={website.id} value={website.id}>
                        {website.name} ({website.domain})
                      </option>
                    ))}
                  </select>
                </CardContent>
              </Card>
            )}

            {/* Pricing Cards */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose Your Plan</h2>
              <PricingCards
                currentPlan={currentPlan}
                websiteId={selectedWebsite}
              />
            </div>
          </div>

          {/* Sidebar with Usage Display */}
          <div className="lg:col-span-1">
            <UsageDisplay className="sticky top-8" />
          </div>
        </div>
      </main>
    </div>
  )
}