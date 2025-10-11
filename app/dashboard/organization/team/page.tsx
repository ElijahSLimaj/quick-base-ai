'use client'

import { useState, useEffect } from 'react'
import { Users, AlertCircle, Loader2 } from 'lucide-react'
import { TeamMemberManagement } from '@/components/organizations/TeamMemberManagement'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { useNotification } from '@/contexts/NotificationContext'

interface Organization {
  id: string
  name: string
  slug: string
  seat_count: number
  max_seats: number
  plan_name: string
}

interface UserMembership {
  role: 'owner' | 'admin' | 'member'
  permissions: {
    manage_team?: boolean
    [key: string]: any
  }
}

export default function TeamPage() {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member' | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { showError } = useNotification()

  useEffect(() => {
    fetchOrganizationData()
  }, [])

  const fetchOrganizationData = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('Please log in to view team management')
        return
      }

      // Get user's current organization membership
      const { data: membership, error: membershipError } = await supabase
        .from('team_members')
        .select(`
          role,
          permissions,
          organization_id,
          organizations:organization_id(
            id,
            name,
            slug,
            seat_count,
            max_seats,
            plan_name
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (membershipError) {
        console.error('Error fetching organization:', membershipError)
        setError('No organization found. Please contact your administrator.')
        return
      }

      if (!membership || !membership.organizations) {
        setError('You are not a member of any organization')
        return
      }

      const org = membership.organizations as any
      setOrganization({
        id: org.id,
        name: org.name,
        slug: org.slug,
        seat_count: org.seat_count || 0,
        max_seats: org.max_seats || 1,
        plan_name: org.plan_name || 'enterprise'
      })
      setUserRole(membership.role as 'owner' | 'admin' | 'member')

    } catch (error) {
      console.error('Error fetching organization data:', error)
      setError('Failed to load organization data')
      showError('Failed to load team data')
    } finally {
      setLoading(false)
    }
  }

  const handleSeatsUpdated = () => {
    // Refresh organization data when seats are updated
    fetchOrganizationData()
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Users className="h-8 w-8 mr-3 text-blue-600" />
            Team Management
          </h1>
          <p className="text-gray-600 mt-2">
            Invite and manage your team members
          </p>
        </div>

        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-lg text-gray-600">Loading team data...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !organization || !userRole) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Users className="h-8 w-8 mr-3 text-blue-600" />
            Team Management
          </h1>
          <p className="text-gray-600 mt-2">
            Invite and manage your team members
          </p>
        </div>

        <Card>
          <CardContent className="p-8">
            <div className="flex items-center space-x-3 text-red-600">
              <AlertCircle className="h-6 w-6" />
              <span className="text-lg">{error || 'Unable to load team data'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Users className="h-8 w-8 mr-3 text-blue-600" />
          Team Management
        </h1>
        <p className="text-gray-600 mt-2">
          Invite and manage your team members for {organization.name}
        </p>
      </div>

      <TeamMemberManagement
        organization={organization}
        userRole={userRole}
        onSeatsUpdated={handleSeatsUpdated}
      />
    </div>
  )
}

