'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserPlus, Mail, MoreHorizontal, Crown, Settings, Users, Trash2, Copy, Check, AlertCircle, Search, Download, UserCheck, Clock, Activity, Shield, User } from 'lucide-react'
import { useNotification } from '@/contexts/NotificationContext'

interface TeamMember {
  id: string
  user_id?: string
  email: string
  role: 'owner' | 'admin' | 'member'
  status: 'active' | 'invited' | 'inactive'
  invited_at?: string
  joined_at?: string
  users?: {
    id: string
    email: string
  } | null
}

interface Invitation {
  id: string
  email: string
  role: 'admin' | 'member'
  status: 'pending' | 'accepted' | 'expired'
  token: string
  expires_at: string
  created_at: string
}

interface Organization {
  id: string
  name: string
  slug: string
  seat_count: number
  max_seats: number
  plan_name: string
}

interface TeamMemberManagementProps {
  organization: Organization
  userRole: 'owner' | 'admin' | 'member'
  onSeatsUpdated?: () => void
}

export function TeamMemberManagement({
  organization,
  userRole,
  onSeatsUpdated
}: TeamMemberManagementProps) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const { showSuccess, showError } = useNotification()

  const canManageTeam = userRole === 'owner' || userRole === 'admin'
  const availableSeats = organization.max_seats - organization.seat_count

  useEffect(() => {
    if (canManageTeam) {
      fetchTeamData()
    }
  }, [organization.id, canManageTeam])

  const fetchTeamData = async () => {
    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetch(`/api/organizations/${organization.id}/team`),
        fetch(`/api/organizations/${organization.id}/invites`)
      ])

      if (membersRes.ok) {
        const membersData = await membersRes.json()
        setMembers(membersData.teamMembers || [])
      }

      if (invitesRes.ok) {
        const invitesData = await invitesRes.json()
        setInvitations(invitesData.invites || [])
      }
    } catch (error) {
      console.error('Error fetching team data:', error)
      showError('Failed to load team data')
    } finally {
      setLoading(false)
    }
  }

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      showError('Email address is required')
      return
    }

    if (availableSeats <= 0) {
      showError('No available seats. Upgrade your plan to add more team members.')
      return
    }

    setInviteLoading(true)

    try {
      const response = await fetch(`/api/organizations/${organization.id}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation')
      }

      showSuccess('Invitation sent successfully!')
      setInvitations(prev => [...prev, data.invitation])
      setShowInviteDialog(false)
      setInviteEmail('')
      setInviteRole('member')

      if (onSeatsUpdated) {
        onSeatsUpdated()
      }

    } catch (error) {
      console.error('Error sending invitation:', error)
      showError(error instanceof Error ? error.message : 'Failed to send invitation')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleCopyInviteLink = async (invitation: Invitation) => {
    const inviteUrl = `${window.location.origin}/invite/${invitation.token}`

    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopiedLink(invitation.id)
      showSuccess('Invite link copied to clipboard')

      setTimeout(() => {
        setCopiedLink(null)
      }, 2000)
    } catch (error) {
      showError('Failed to copy invite link')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('Are you sure you want to remove this team member?')) {
      return
    }

    try {
      const response = await fetch(`/api/organizations/${organization.id}/team/${memberId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to remove member')
      }

      setMembers(prev => prev.filter(m => m.id !== memberId))
      showSuccess('Team member removed successfully')

      if (onSeatsUpdated) {
        onSeatsUpdated()
      }

    } catch (error) {
      console.error('Error removing member:', error)
      showError(error instanceof Error ? error.message : 'Failed to remove member')
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/organizations/${organization.id}/invites/${invitationId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to cancel invitation')
      }

      setInvitations(prev => prev.filter(i => i.id !== invitationId))
      showSuccess('Invitation cancelled')

    } catch (error) {
      console.error('Error cancelling invitation:', error)
      showError(error instanceof Error ? error.message : 'Failed to cancel invitation')
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4" />
      case 'admin':
        return <Shield className="w-4 h-4" />
      default:
        return <User className="w-4 h-4" />
    }
  }

  const getRoleBadge = (role: string) => {
    const colors = {
      owner: 'bg-purple-50 text-purple-700 border-purple-200',
      admin: 'bg-blue-50 text-blue-700 border-blue-200',
      member: 'bg-gray-50 text-gray-700 border-gray-200'
    }

    return (
      <div className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${colors[role as keyof typeof colors]}`}>
        {getRoleIcon(role)}
        <span className="ml-1 capitalize">{role}</span>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const config = {
      active: { color: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-400' },
      pending: { color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
      inactive: { color: 'bg-gray-50 text-gray-700 border-gray-200', dot: 'bg-gray-400' }
    }

    const statusConfig = config[status as keyof typeof config] || config.active

    return (
      <div className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${statusConfig.color}`}>
        <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${statusConfig.dot}`}></div>
        <span className="capitalize">{status}</span>
      </div>
    )
  }

  // Filter functionality
  const filteredMembers = members.filter(member => {
    const matchesSearch = !searchTerm ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.users?.email || '').toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRole = roleFilter === 'all' || member.role === roleFilter

    return matchesSearch && matchesRole
  })

  const filteredInvitations = invitations.filter(invite => {
    const matchesSearch = !searchTerm ||
      invite.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRole = roleFilter === 'all' || invite.role === roleFilter

    return matchesSearch && matchesRole
  })

  const exportTeamData = () => {
    const csvData = members.map(member => ({
      email: member.email || member.users?.email || '',
      role: member.role,
      status: member.status,
      joinedAt: member.joined_at ? new Date(member.joined_at).toLocaleDateString() : 'Pending'
    }))

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${organization.name}-team-members.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!canManageTeam) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-gray-500">
            <AlertCircle className="w-5 h-5" />
            <span>You don't have permission to manage team members</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading team members...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Team Members</h2>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-sm text-gray-500">{organization.name}</span>
              <span className="text-gray-300">•</span>
              <span className="text-sm font-medium text-gray-700">
                {organization.seat_count}/{organization.max_seats} seats used
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportTeamData}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={() => setShowInviteDialog(true)}
            disabled={availableSeats <= 0}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Member
          </Button>
        </div>
      </div>

      {/* Compact Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Members</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">{members.length}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">
                {members.filter(m => m.status === 'active').length}
              </p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg">
              <UserCheck className="w-4 h-4 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pending</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">{invitations.length}</p>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Available Seats</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">{availableSeats}</p>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg">
              <Settings className="w-4 h-4 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table with Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <Tabs defaultValue="members">
              <TabsList className="bg-gray-50">
                <TabsTrigger value="members" className="text-sm">
                  Active Members ({filteredMembers.length})
                </TabsTrigger>
                <TabsTrigger value="invitations" className="text-sm">
                  Pending Invitations ({filteredInvitations.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-gray-200"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-32 bg-white border-gray-200 hover:bg-gray-50">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent className="bg-white border-0 shadow-lg rounded-lg">
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Tabs defaultValue="members">
          <TabsContent value="members" className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-100">
                  <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">Member</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">Role</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">Joined</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow key={member.id} className="hover:bg-gray-50 border-gray-100">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {(member.email || member.users?.email || '').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {member.email || member.users?.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(member.role)}</TableCell>
                    <TableCell>{getStatusBadge(member.status)}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      {member.role !== 'owner' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white">
                            <DropdownMenuItem>
                              <Settings className="w-4 h-4 mr-2" />
                              Edit Role
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleRemoveMember(member.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredMembers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="text-gray-500">No team members found</div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="invitations" className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-100">
                  <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">Role</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sent</TableHead>
                  <TableHead className="text-xs font-medium text-gray-500 uppercase tracking-wide">Expires</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvitations.map((invitation) => {
                  const isExpired = new Date(invitation.expires_at) < new Date()
                  return (
                    <TableRow key={invitation.id} className="hover:bg-gray-50 border-gray-100">
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-amber-600">
                              {invitation.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="font-medium text-gray-900">{invitation.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(invitation.role)}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(invitation.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        <span className={isExpired ? 'text-red-600' : ''}>
                          {new Date(invitation.expires_at).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyInviteLink(invitation)}
                            className="h-8 w-8 p-0"
                          >
                            {copiedLink === invitation.id ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelInvitation(invitation.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filteredInvitations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="text-gray-500">No pending invitations</div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </div>

      {/* Invite Member Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your organization
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={inviteRole} onValueChange={(value: 'admin' | 'member') => setInviteRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member - Can view and respond to tickets</SelectItem>
                  <SelectItem value="admin">Admin - Can manage team and settings</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-sm text-blue-800">
                Available seats: {availableSeats} / {organization.max_seats}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInviteDialog(false)}
              disabled={inviteLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInviteMember}
              disabled={inviteLoading || availableSeats <= 0}
            >
              {inviteLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}