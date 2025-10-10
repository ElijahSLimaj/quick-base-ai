'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, Shield, Loader2 } from 'lucide-react'
import { AssignmentSettings } from '@/components/organizations/AssignmentSettings'
import { createClient } from '@/lib/supabase/client'

interface Organization {
  id: string
  name: string
  slug: string
  plan_name: string
  seat_count: number
  max_seats: number
  hasTicketing: boolean
  userRole: 'owner' | 'admin' | 'member'
  userPermissions: {
    view_tickets: boolean
    create_tickets: boolean
    manage_tickets: boolean
    view_analytics: boolean
    manage_team: boolean
    manage_billing: boolean
  }
}

export default function OrganizationPage() {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrganization()
  }, [])

  const loadOrganization = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      // Get user's current organization
      const { data: membership } = await supabase
        .from('team_members')
        .select(`
          role,
          organization_id,
          organizations (
            id,
            name,
            slug,
            plan_name,
            seat_count,
            max_seats
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (membership?.organizations) {
        const org = membership.organizations as any
        setOrganization({
          id: org.id,
          name: org.name,
          slug: org.slug,
          plan_name: org.plan_name,
          seat_count: org.seat_count,
          max_seats: org.max_seats,
          hasTicketing: org.plan_name === 'enterprise',
          userRole: membership.role as 'owner' | 'admin' | 'member',
          userPermissions: {
            view_tickets: ['owner', 'admin', 'member'].includes(membership.role),
            create_tickets: ['owner', 'admin', 'member'].includes(membership.role),
            manage_tickets: ['owner', 'admin'].includes(membership.role),
            view_analytics: ['owner', 'admin'].includes(membership.role),
            manage_team: ['owner', 'admin'].includes(membership.role),
            manage_billing: membership.role === 'owner'
          }
        })
      }
    } catch (error) {
      console.error('Error loading organization:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading organization settings...
        </div>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="border-0 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto mb-4 w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
              <Settings className="h-8 w-8 text-purple-600" />
            </div>
            <CardTitle className="text-2xl">No Organization Found</CardTitle>
            <CardDescription className="text-base mt-2">
              You need to be part of an organization to access these settings
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Settings className="h-8 w-8 mr-3 text-blue-600" />
          Auto-Assignment Settings
        </h1>
        <p className="text-gray-600 mt-2">
          Configure how tickets are automatically assigned to your team members
        </p>
      </div>

      {organization.hasTicketing ? (
        <AssignmentSettings 
          organizationId={organization.id} 
          userRole={organization.userRole}
        />
      ) : (
        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto mb-4 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Enterprise Feature</CardTitle>
            <CardDescription className="text-base mt-2">
              Auto-assignment settings are available with the Enterprise plan
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button>
              Upgrade to Enterprise
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

