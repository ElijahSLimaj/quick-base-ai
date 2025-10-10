'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Building2, Users, Zap } from 'lucide-react'
import { useNotification } from '@/contexts/NotificationContext'

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

interface OrganizationCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOrganizationCreated: (org: Organization) => void
}

export function OrganizationCreateDialog({
  open,
  onOpenChange,
  onOrganizationCreated
}: OrganizationCreateDialogProps) {
  const [step, setStep] = useState<'plan' | 'details' | 'creating'>('plan')
  const [selectedPlan, setSelectedPlan] = useState<string>('')
  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(false)
  const { showSuccess, showError } = useNotification()

  const plans = [
    {
      id: 'pro',
      name: 'Pro',
      price: '$49/month',
      description: 'Perfect for growing businesses',
      features: ['Up to 10 websites', 'Unlimited queries', 'Advanced analytics', 'Priority support'],
      hasTicketing: false,
      recommended: false
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '$99/month',
      description: 'Complete solution with human support',
      features: ['Unlimited websites', 'Unlimited queries', 'Advanced analytics', 'Human ticketing system', 'Up to 5 team seats', '$4.99 per additional seat'],
      hasTicketing: true,
      recommended: true
    }
  ]

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId)
    setStep('details')
  }

  const handleCreateOrganization = async () => {
    if (!orgName.trim()) {
      showError('Organization name is required')
      return
    }

    setLoading(true)
    setStep('creating')

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: orgName.trim(),
          plan_name: selectedPlan
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create organization')
      }

      showSuccess('Organization created successfully!')
      onOrganizationCreated(data.organization)
      onOpenChange(false)

      // Reset form
      setStep('plan')
      setSelectedPlan('')
      setOrgName('')

    } catch (error) {
      console.error('Error creating organization:', error)
      showError(error instanceof Error ? error.message : 'Failed to create organization')
      setStep('details')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (step === 'details') {
      setStep('plan')
    }
  }

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false)
      setStep('plan')
      setSelectedPlan('')
      setOrgName('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        {step === 'plan' && (
          <>
            <DialogHeader>
              <DialogTitle>Create Organization</DialogTitle>
              <DialogDescription>
                Choose a plan for your organization. You can upgrade or downgrade anytime.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    plan.recommended ? 'ring-2 ring-blue-500 border-blue-200' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handlePlanSelect(plan.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      {plan.recommended && (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                          <Zap className="w-3 h-3 mr-1" />
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-2xl font-bold">{plan.price}</span>
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    {plan.hasTicketing && (
                      <div className="mt-3 p-2 bg-blue-50 rounded-md">
                        <div className="flex items-center text-sm text-blue-800">
                          <Users className="w-4 h-4 mr-1" />
                          <span className="font-medium">Human Support Included</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {step === 'details' && (
          <>
            <DialogHeader>
              <DialogTitle>Organization Details</DialogTitle>
              <DialogDescription>
                Set up your {plans.find(p => p.id === selectedPlan)?.name} organization
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  placeholder="Enter organization name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  maxLength={100}
                />
                <p className="text-xs text-gray-500">
                  This will be visible to your team members and customers
                </p>
              </div>

              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Selected Plan</h4>
                      <p className="text-sm text-gray-600">
                        {plans.find(p => p.id === selectedPlan)?.name} - {plans.find(p => p.id === selectedPlan)?.price}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleBack}>
                      Change Plan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button
                onClick={handleCreateOrganization}
                disabled={!orgName.trim() || loading}
              >
                Create Organization
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'creating' && (
          <>
            <DialogHeader>
              <DialogTitle>Creating Organization</DialogTitle>
              <DialogDescription>
                Setting up your organization, please wait...
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
              <div className="text-center space-y-2">
                <p className="font-medium">Creating "{orgName}"</p>
                <p className="text-sm text-gray-600">This will only take a moment</p>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}