'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Users, 
  Settings, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  BarChart3,
  Clock,
  UserCheck,
  RefreshCw
} from 'lucide-react'
import { useNotification } from '@/contexts/NotificationContext'

interface AssignmentConfig {
  autoAssignmentEnabled: boolean
  primaryMethod: 'load_balancing' | 'round_robin' | 'manual'
  fallbackMethod: 'round_robin' | 'load_balancing' | 'none'
  considerAvailability: boolean
  maxTicketsPerMember: number | null
  assignmentTimeout: number // minutes
}

interface TeamMemberWorkload {
  userId: string
  email: string
  openTicketsCount: number
  lastAssignedAt: string | null
  isOnline: boolean
}

interface AssignmentStats {
  totalAssignments: number
  loadBalancingAssignments: number
  roundRobinAssignments: number
  manualAssignments: number
  averageResponseTime: number
  lastAssignmentAt: string | null
}

interface AssignmentSettingsProps {
  organizationId: string
  userRole: 'owner' | 'admin' | 'member'
}

export function AssignmentSettings({ organizationId, userRole }: AssignmentSettingsProps) {
  const [config, setConfig] = useState<AssignmentConfig>({
    autoAssignmentEnabled: true,
    primaryMethod: 'load_balancing',
    fallbackMethod: 'round_robin',
    considerAvailability: false,
    maxTicketsPerMember: null,
    assignmentTimeout: 5
  })
  
  const [workload, setWorkload] = useState<TeamMemberWorkload[]>([])
  const [stats, setStats] = useState<AssignmentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { showSuccess, showError } = useNotification()

  const canEdit = userRole === 'owner' || userRole === 'admin'

  useEffect(() => {
    loadData()
  }, [organizationId])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load assignment configuration
      const configResponse = await fetch(`/api/assignment?organizationId=${organizationId}&action=config`)
      if (configResponse.ok) {
        const configData = await configResponse.json()
        setConfig(configData.config || config)
      }

      // Load team workload
      const workloadResponse = await fetch(`/api/assignment?organizationId=${organizationId}&action=workload`)
      if (workloadResponse.ok) {
        const workloadData = await workloadResponse.json()
        setWorkload(workloadData.workload || [])
      }

      // Load assignment statistics
      const statsResponse = await fetch(`/api/assignment?organizationId=${organizationId}&action=stats`)
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData.stats)
      }
    } catch (error) {
      console.error('Error loading assignment data:', error)
      showError('Failed to load assignment settings')
    } finally {
      setLoading(false)
    }
  }

  const handleConfigChange = (key: keyof AssignmentConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  const saveConfig = async () => {
    try {
      setSaving(true)
      
      const response = await fetch('/api/assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          action: 'update-config',
          config
        })
      })

      if (response.ok) {
        showSuccess('Assignment settings saved successfully')
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving assignment config:', error)
      showError('Failed to save assignment settings')
    } finally {
      setSaving(false)
    }
  }

  const testAssignment = async () => {
    try {
      const response = await fetch('/api/assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          action: 'test-assignment'
        })
      })

      if (response.ok) {
        showSuccess('Test assignment completed successfully')
        loadData() // Refresh data
      } else {
        throw new Error('Test assignment failed')
      }
    } catch (error) {
      console.error('Error testing assignment:', error)
      showError('Failed to test assignment')
    }
  }

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading assignment settings...
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Assignment Configuration */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Auto-Assignment Configuration
          </CardTitle>
          <CardDescription>
            Configure how tickets are automatically assigned to team members
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Auto-Assignment */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-assignment" className="text-base font-medium">
                Enable Auto-Assignment
              </Label>
              <p className="text-sm text-gray-600">
                Automatically assign tickets when AI escalates to human support
              </p>
            </div>
            <Switch
              id="auto-assignment"
              checked={config.autoAssignmentEnabled}
              onCheckedChange={(checked) => handleConfigChange('autoAssignmentEnabled', checked)}
              disabled={!canEdit}
            />
          </div>

          {config.autoAssignmentEnabled && (
            <>
              <Separator />
              
              {/* Primary Assignment Method */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Primary Assignment Method</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div 
                    className={`p-4 rounded-lg cursor-pointer transition-all shadow-sm hover:shadow-md ${
                      config.primaryMethod === 'load_balancing' 
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md' 
                        : 'bg-white hover:bg-gray-50'
                    }`}
                    onClick={() => canEdit && handleConfigChange('primaryMethod', 'load_balancing')}
                  >
                    <div className="flex items-center space-x-2">
                      <BarChart3 className={`h-5 w-5 ${config.primaryMethod === 'load_balancing' ? 'text-white' : 'text-blue-600'}`} />
                      <span className="font-semibold">Load Balancing</span>
                    </div>
                    <p className={`text-xs mt-2 ${config.primaryMethod === 'load_balancing' ? 'text-blue-100' : 'text-gray-600'}`}>
                      Assign to member with least open tickets
                    </p>
                  </div>
                  
                  <div 
                    className={`p-4 rounded-lg cursor-pointer transition-all shadow-sm hover:shadow-md ${
                      config.primaryMethod === 'round_robin' 
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md' 
                        : 'bg-white hover:bg-gray-50'
                    }`}
                    onClick={() => canEdit && handleConfigChange('primaryMethod', 'round_robin')}
                  >
                    <div className="flex items-center space-x-2">
                      <RefreshCw className={`h-5 w-5 ${config.primaryMethod === 'round_robin' ? 'text-white' : 'text-blue-600'}`} />
                      <span className="font-semibold">Round Robin</span>
                    </div>
                    <p className={`text-xs mt-2 ${config.primaryMethod === 'round_robin' ? 'text-blue-100' : 'text-gray-600'}`}>
                      Assign in rotating order
                    </p>
                  </div>
                  
                  <div 
                    className={`p-4 rounded-lg cursor-pointer transition-all shadow-sm hover:shadow-md ${
                      config.primaryMethod === 'manual' 
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md' 
                        : 'bg-white hover:bg-gray-50'
                    }`}
                    onClick={() => canEdit && handleConfigChange('primaryMethod', 'manual')}
                  >
                    <div className="flex items-center space-x-2">
                      <UserCheck className={`h-5 w-5 ${config.primaryMethod === 'manual' ? 'text-white' : 'text-blue-600'}`} />
                      <span className="font-semibold">Manual Only</span>
                    </div>
                    <p className={`text-xs mt-2 ${config.primaryMethod === 'manual' ? 'text-blue-100' : 'text-gray-600'}`}>
                      No automatic assignment
                    </p>
                  </div>
                </div>
              </div>

              {/* Fallback Method */}
              {config.primaryMethod !== 'manual' && (
                <div className="space-y-3">
                  <Label className="text-base font-medium">Fallback Method</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div 
                      className={`p-4 rounded-lg cursor-pointer transition-all shadow-sm hover:shadow-md ${
                        config.fallbackMethod === 'round_robin' 
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md' 
                          : 'bg-white hover:bg-gray-50'
                      }`}
                      onClick={() => canEdit && handleConfigChange('fallbackMethod', 'round_robin')}
                    >
                      <div className="flex items-center space-x-2">
                        <RefreshCw className={`h-5 w-5 ${config.fallbackMethod === 'round_robin' ? 'text-white' : 'text-blue-600'}`} />
                        <span className="font-semibold">Round Robin</span>
                      </div>
                      <p className={`text-xs mt-2 ${config.fallbackMethod === 'round_robin' ? 'text-blue-100' : 'text-gray-600'}`}>
                        Use when primary method ties
                      </p>
                    </div>
                    
                    <div 
                      className={`p-4 rounded-lg cursor-pointer transition-all shadow-sm hover:shadow-md ${
                        config.fallbackMethod === 'load_balancing' 
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md' 
                          : 'bg-white hover:bg-gray-50'
                      }`}
                      onClick={() => canEdit && handleConfigChange('fallbackMethod', 'load_balancing')}
                    >
                      <div className="flex items-center space-x-2">
                        <BarChart3 className={`h-5 w-5 ${config.fallbackMethod === 'load_balancing' ? 'text-white' : 'text-blue-600'}`} />
                        <span className="font-semibold">Load Balancing</span>
                      </div>
                      <p className={`text-xs mt-2 ${config.fallbackMethod === 'load_balancing' ? 'text-blue-100' : 'text-gray-600'}`}>
                        Use when primary method ties
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Advanced Settings */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Advanced Settings</Label>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="consider-availability" className="text-sm font-medium">
                      Consider Member Availability
                    </Label>
                    <p className="text-xs text-gray-600">
                      Only assign to members who are currently online
                    </p>
                  </div>
                  <Switch
                    id="consider-availability"
                    checked={config.considerAvailability}
                    onCheckedChange={(checked) => handleConfigChange('considerAvailability', checked)}
                    disabled={!canEdit}
                  />
                </div>
              </div>
            </>
          )}

          {canEdit && (
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={loadData}>
                Reset
              </Button>
              <Button onClick={saveConfig} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Settings
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Workload Overview */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Team Workload
          </CardTitle>
          <CardDescription>
            Current ticket distribution across your team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          {workload.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              No team members found
            </div>
          ) : (
            <div className="space-y-3">
              {workload.map((member) => (
                <div key={member.userId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-0 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-sm font-semibold text-white">
                        {member.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{member.email}</p>
                      <p className="text-sm text-gray-600">
                        Last assigned: {member.lastAssignedAt 
                          ? new Date(member.lastAssignedAt).toLocaleDateString()
                          : 'Never'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={member.openTicketsCount === 0 ? 'secondary' : 'default'} className="shadow-sm">
                      {member.openTicketsCount} open tickets
                    </Badge>
                    {member.isOnline && (
                      <Badge variant="outline" className="text-green-600 border-green-600 shadow-sm">
                        Online
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignment Statistics */}
      {stats && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Assignment Statistics
            </CardTitle>
            <CardDescription>
              Performance metrics for your assignment system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-sm">
                <div className="text-3xl font-bold text-blue-600">{stats.totalAssignments}</div>
                <div className="text-sm text-gray-700 mt-1">Total Assignments</div>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg shadow-sm">
                <div className="text-3xl font-bold text-cyan-600">{stats.loadBalancingAssignments}</div>
                <div className="text-sm text-gray-700 mt-1">Load Balancing</div>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-sm">
                <div className="text-3xl font-bold text-green-600">{stats.roundRobinAssignments}</div>
                <div className="text-sm text-gray-700 mt-1">Round Robin</div>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg shadow-sm">
                <div className="text-3xl font-bold text-amber-600">{stats.averageResponseTime}m</div>
                <div className="text-sm text-gray-700 mt-1">Avg Response Time</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Assignment */}
      {canEdit && config.autoAssignmentEnabled && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-blue-600" />
              Test Assignment
            </CardTitle>
            <CardDescription>
              Test the auto-assignment system with a sample ticket
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={testAssignment} className="shadow-md">
              <RefreshCw className="h-4 w-4 mr-2" />
              Run Test Assignment
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
