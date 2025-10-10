'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar'
import { DashboardTopBar } from '@/components/dashboard/DashboardTopBar'
import { HelpChatBubble } from '@/components/support/HelpChatBubble'
import { TrialBanner } from '@/components/billing/TrialBanner'

interface Organization {
  id: string
  name: string
  plan_name: string
  seat_count: number
  max_seats: number
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [unreadTickets, setUnreadTickets] = useState(0)
  const [websiteCount, setWebsiteCount] = useState(0)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)

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
          setOrganization(data.organizations[0])
        }
      }
    } catch (error) {
      console.error('Error fetching organization:', error)
    }
  }, [])

  const fetchUnreadTickets = useCallback(async () => {
    try {
      const response = await fetch('/api/tickets?status=open&unread=true')
      if (response.ok) {
        const data = await response.json()
        setUnreadTickets(data.tickets?.length || 0)
      }
    } catch (error) {
      console.error('Error fetching unread tickets:', error)
    }
  }, [])

  const fetchWebsiteCount = useCallback(async () => {
    try {
      const response = await fetch('/api/websites')
      if (response.ok) {
        const data = await response.json()
        setWebsiteCount(data.websites?.length || 0)
      }
    } catch (error) {
      console.error('Error fetching websites:', error)
    }
  }, [])

  useEffect(() => {
    const initDashboard = async () => {
      await checkUser()
      setLoading(false)
    }
    initDashboard()
  }, [checkUser])

  useEffect(() => {
    if (user) {
      fetchOrganization()
      fetchUnreadTickets()
      fetchWebsiteCount()
    }
  }, [user, fetchOrganization, fetchUnreadTickets, fetchWebsiteCount])

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

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Trial Banner - only for non-enterprise users */}
      {organization?.plan_name !== 'enterprise' && (
        <TrialBanner />
      )}

      {/* Top Bar */}
      <DashboardTopBar
        userEmail={user?.email}
        onMobileMenuToggle={() => setIsMobileSidebarOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <DashboardSidebar
          organization={organization}
          unreadTickets={unreadTickets}
          websiteCount={websiteCount}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="container mx-auto px-6 py-8">
            {children}
          </div>
        </main>
      </div>

      {/* Help Chat Bubble */}
      <HelpChatBubble />
    </div>
  )
}

