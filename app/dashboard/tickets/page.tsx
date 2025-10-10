'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TicketsDashboard } from '@/components/tickets/TicketsDashboard'
import { TicketDetail } from '@/components/tickets/TicketDetail'
import { useNotification } from '@/contexts/NotificationContext'
import { Card, CardContent } from '@/components/ui/card'

interface Organization {
  id: string
  name: string
  plan_name: string
  seat_count: number
  max_seats: number
  userRole?: 'owner' | 'admin' | 'member'
}

export default function TicketsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const { showError } = useNotification()

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
  }, [router, supabase.auth])

  const fetchOrganization = useCallback(async () => {
    try {
      const response = await fetch('/api/organizations')
      if (response.ok) {
        const data = await response.json()
        if (data.organizations && data.organizations.length > 0) {
          const org = data.organizations[0]
          setOrganization({
            ...org,
            userRole: org.userRole || 'member'
          })
        }
      }
    } catch (error) {
      console.error('Error fetching organization:', error)
      showError('Failed to load organization data')
    }
  }, [showError])

  useEffect(() => {
    const initPage = async () => {
      await checkUser()
      setLoading(false)
    }
    initPage()
  }, [checkUser])

  useEffect(() => {
    if (user) {
      fetchOrganization()
    }
  }, [user, fetchOrganization])

  // Check if user has access to ticketing
  const hasTicketingAccess = organization?.plan_name === 'enterprise'

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

  if (!hasTicketingAccess) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="border border-orange-200 bg-orange-50">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎫</span>
            </div>
            <h2 className="text-2xl font-bold text-orange-900 mb-2">Enterprise Feature</h2>
            <p className="text-orange-800 mb-6">
              Support ticketing is available on Enterprise plans only. Upgrade to access advanced ticket management,
              team collaboration, and human escalation features.
            </p>
            <div className="space-y-2 text-sm text-orange-700">
              <p>• AI-powered ticket routing and escalation</p>
              <p>• Team assignment and internal notes</p>
              <p>• SLA tracking and analytics</p>
              <p>• Priority support and faster response times</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (selectedTicketId && organization) {
    return (
      <div>
        <div className="mb-6">
          <button
            onClick={() => setSelectedTicketId(null)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Back to Tickets
          </button>
        </div>
        <TicketDetail
          ticketId={selectedTicketId}
          userRole={organization.userRole || 'member'}
          onTicketUpdated={() => {
            // Refresh the ticket list when a ticket is updated
            setSelectedTicketId(null)
          }}
        />
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">No organization found</h3>
        <p className="text-gray-600">You need to be part of an organization to access tickets.</p>
      </div>
    )
  }

  return (
    <TicketsDashboard
      organization={{
        id: organization.id,
        name: organization.name,
        slug: organization.name.toLowerCase().replace(/\s+/g, '-')
      }}
      onTicketClick={(ticketId) => setSelectedTicketId(ticketId)}
    />
  )
}

