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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { UserPlus, Mail, MoreHorizontal, Crown, Settings, Users, Trash2, Copy, Check, AlertCircle } from 'lucide-react'
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
        fetch(`/api/organizations/${organization.id}/members`),
        fetch(`/api/organizations/${organization.id}/invites`)
      ])

      if (membersRes.ok) {
        const membersData = await membersRes.json()
        setMembers(membersData.members || [])
      }

      if (invitesRes.ok) {
        const invitesData = await invitesRes.json()
        setInvitations(invitesData.invitations || [])
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
      const response = await fetch(`/api/organizations/${organization.id}/members/${memberId}`, {
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
        return <Settings className="w-4 h-4" />
      default:
        return <Users className="w-4 h-4" />
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
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">Loading team members...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Team Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-xl">Team Members</CardTitle>
            <CardDescription>
              Manage your organization's team members and permissions
            </CardDescription>
          </div>
          <Button
            onClick={() => setShowInviteDialog(true)}
            disabled={availableSeats <= 0}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Member
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>{organization.seat_count} / {organization.max_seats} seats used</span>
            {availableSeats <= 0 && (
              <Badge variant="destructive">No available seats</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Members */}
      <Card>
        <CardHeader>
          <CardTitle>Active Members</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.email}</TableCell>
                  <TableCell>{getRoleBadge(member.role)}</TableCell>
                  <TableCell>
                    <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                      Active
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {member.joined_at ? new Date(member.joined_at).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    {member.role !== 'owner' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white">
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
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[140px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">{invitation.email}</TableCell>
                    <TableCell>{getRoleBadge(invitation.role)}</TableCell>
                    <TableCell>
                      {new Date(invitation.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(invitation.expires_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyInviteLink(invitation)}
                        >
                          {copiedLink === invitation.id ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelInvitation(invitation.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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
                  <SelectItem value="admin">Admin - Can manage team and billing</SelectItem>
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