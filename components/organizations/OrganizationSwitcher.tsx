'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Building2, Users, Crown, Settings } from 'lucide-react'
import { useNotification } from '@/contexts/NotificationContext'
import { OrganizationCreateDialog } from './OrganizationCreateDialog'

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

interface OrganizationSwitcherProps {
  currentOrganization?: Organization | null
  onOrganizationChange: (org: Organization | null) => void
  showCreateButton?: boolean
}

export function OrganizationSwitcher({
  currentOrganization,
  onOrganizationChange,
  showCreateButton = true
}: OrganizationSwitcherProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showSwitchDialog, setShowSwitchDialog] = useState(false)
  const { showSuccess, showError } = useNotification()

  useEffect(() => {
    fetchOrganizations()
  }, [])

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/organizations')
      if (response.ok) {
        const data = await response.json()
        setOrganizations(data.organizations || [])

        // If no current organization is selected, select the first one
        if (!currentOrganization && data.organizations.length > 0) {
          onOrganizationChange(data.organizations[0])
        }
      } else {
        console.error('Error fetching organizations:', response.statusText)
      }
    } catch (error) {
      console.error('Error fetching organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOrganizationSelect = (org: Organization) => {
    onOrganizationChange(org)
    setShowSwitchDialog(false)
    showSuccess('Organization switched', `Now viewing ${org.name}`)
  }

  const handleCreateClick = () => {
    setShowCreateDialog(true)
  }

  const handleOrganizationCreated = (org: Organization) => {
    setOrganizations(prev => [...prev, org])
    onOrganizationChange(org)
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-3 h-3" />
      case 'admin':
        return <Settings className="w-3 h-3" />
      default:
        return <Users className="w-3 h-3" />
    }
  }

  const getRoleBadge = (role: string) => {
    const colors = {
      owner: 'bg-purple-100 text-purple-800 border-purple-200',
      admin: 'bg-blue-100 text-blue-800 border-blue-200',
      member: 'bg-gray-100 text-gray-800 border-gray-200'
    }

    return (
      <Badge variant="secondary" className={colors[role as keyof typeof colors]}>
        {getRoleIcon(role)}
        <span className="ml-1 capitalize">{role}</span>
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-600">Loading...</span>
      </div>
    )
  }

  // Show individual mode if no organizations
  if (organizations.length === 0) {
    return (
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <Building2 className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">Individual Account</span>
        </div>
        {showCreateButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateClick}
            className="text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Create Organization
          </Button>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center space-x-3">
        {currentOrganization && (
          <Button
            variant="ghost"
            onClick={() => setShowSwitchDialog(true)}
            className="flex items-center space-x-2 hover:bg-gray-100"
          >
            <Building2 className="w-4 h-4" />
            <span>{currentOrganization.name}</span>
            {getRoleIcon(currentOrganization.userRole)}
          </Button>
        )}

        {showCreateButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateClick}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Organization
          </Button>
        )}
      </div>

      {/* Organization Switcher Dialog */}
      <Dialog open={showSwitchDialog} onOpenChange={setShowSwitchDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Switch Organization</DialogTitle>
            <DialogDescription>
              Select an organization to manage
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {/* Individual Account Option */}
            <Card
              className="cursor-pointer hover:bg-gray-50 transition-colors border-gray-200"
              onClick={() => {
                onOrganizationChange(null)
                setShowSwitchDialog(false)
                showSuccess('Switched to individual account')
              }}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">Individual Account</span>
                  </div>
                  <Badge variant="secondary">Personal</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Organization Options */}
            {organizations.map((org) => (
              <Card
                key={org.id}
                className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                  currentOrganization?.id === org.id ? 'ring-2 ring-blue-500 border-blue-200' : 'border-gray-200'
                }`}
                onClick={() => handleOrganizationSelect(org)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4" />
                        <span className="font-medium">{org.name}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>{org.seat_count}/{org.max_seats} seats</span>
                        {org.hasTicketing && (
                          <Badge variant="secondary" className="text-xs">
                            Ticketing
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      {getRoleBadge(org.userRole)}
                      <Badge
                        variant="outline"
                        className="text-xs capitalize"
                      >
                        {org.plan_name}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Organization Dialog */}
      <OrganizationCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onOrganizationCreated={handleOrganizationCreated}
      />
    </>
  )
}