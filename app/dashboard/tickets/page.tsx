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
      // Don't set loading to false yet - wait for organization data
    }
    initPage()
  }, [checkUser])

  useEffect(() => {
    const loadOrganization = async () => {
      if (user) {
        await fetchOrganization()
        setLoading(false) // Only set loading to false after organization is fetched
      }
    }
    loadOrganization()
  }, [user, fetchOrganization])

  // Check if user has access to ticketing
  const hasTicketingAccess = organization?.plan_name === 'enterprise'

  if (loading || !organization) {
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
      <div className="max-w-2xl mx-auto mt-12">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-3">Support Ticketing</h2>
            <p className="text-gray-600 leading-relaxed">
              Unlock professional support ticketing with advanced features designed for growing teams and enterprise customers.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8 text-left">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-medium text-gray-900 text-sm">AI-Powered Routing</p>
                <p className="text-gray-600 text-xs">Smart ticket assignment</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Team Collaboration</p>
                <p className="text-gray-600 text-xs">Internal notes & assignments</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-medium text-gray-900 text-sm">SLA Tracking</p>
                <p className="text-gray-600 text-xs">Response time analytics</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Priority Support</p>
                <p className="text-gray-600 text-xs">Faster response times</p>
              </div>
            </div>
          </div>

          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors">
            Upgrade to Enterprise
          </button>
        </div>
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

