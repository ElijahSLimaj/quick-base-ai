'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, Circle, Users, Settings, Zap, ArrowRight } from 'lucide-react'
import { OrganizationSwitcher } from './OrganizationSwitcher'
import { TeamMemberManagement } from './TeamMemberManagement'

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

interface OnboardingStep {
  id: string
  title: string
  description: string
  completed: boolean
  optional?: boolean
}

interface OrganizationOnboardingProps {
  currentOrganization: Organization | null
  onOrganizationChange: (org: Organization | null) => void
  onOnboardingComplete?: () => void
}

export function OrganizationOnboarding({
  currentOrganization,
  onOrganizationChange,
  onOnboardingComplete
}: OrganizationOnboardingProps) {
  const [activeStep, setActiveStep] = useState<string>('organization')
  const [showTeamManagement, setShowTeamManagement] = useState(false)

  const getOnboardingSteps = (): OnboardingStep[] => {
    if (!currentOrganization) {
      return [
        {
          id: 'organization',
          title: 'Create Organization',
          description: 'Set up your organization with the right plan',
          completed: false
        }
      ]
    }

    return [
      {
        id: 'organization',
        title: 'Create Organization',
        description: 'Set up your organization with the right plan',
        completed: true
      },
      {
        id: 'team',
        title: 'Invite Team Members',
        description: 'Add your team members and assign roles',
        completed: currentOrganization.seat_count > 1,
        optional: true
      },
      {
        id: 'configure',
        title: 'Configure Settings',
        description: 'Set up your organization preferences',
        completed: false,
        optional: true
      },
      {
        id: 'complete',
        title: 'Start Using',
        description: 'Begin using your enterprise features',
        completed: false
      }
    ]
  }

  const steps = getOnboardingSteps()
  const completedSteps = steps.filter(step => step.completed).length
  const progress = (completedSteps / steps.length) * 100

  const handleStepClick = (stepId: string) => {
    if (stepId === 'team' && currentOrganization) {
      setShowTeamManagement(true)
      setActiveStep(stepId)
    } else if (stepId === 'complete') {
      handleCompleteOnboarding()
    } else {
      setActiveStep(stepId)
    }
  }

  const handleCompleteOnboarding = () => {
    if (onOnboardingComplete) {
      onOnboardingComplete()
    }
  }

  const handleTeamUpdated = () => {
    // Refresh organization data when team is updated
    if (currentOrganization) {
      // This would normally trigger a refetch of organization data
      onOrganizationChange({ ...currentOrganization, seat_count: currentOrganization.seat_count })
    }
  }

  if (showTeamManagement && currentOrganization) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Team Setup</h1>
            <p className="text-gray-600">Invite team members to your organization</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowTeamManagement(false)}
          >
            Back to Onboarding
          </Button>
        </div>

        <TeamMemberManagement
          organization={currentOrganization}
          userRole={currentOrganization.userRole}
          onSeatsUpdated={handleTeamUpdated}
        />

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setShowTeamManagement(false)}
          >
            Skip for Now
          </Button>
          <Button
            onClick={() => setShowTeamManagement(false)}
          >
            Continue Setup
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold">Welcome to Enterprise</h1>
        <p className="text-gray-600 mt-2">
          Let's get your organization set up with human support and team collaboration
        </p>
      </div>

      {/* Progress */}
      {currentOrganization && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">Setup Progress</h3>
                <p className="text-sm text-gray-600">Complete these steps to get the most out of your enterprise plan</p>
              </div>
              <Badge variant="secondary">
                {completedSteps} of {steps.length} completed
              </Badge>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Organization Switcher */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
              currentOrganization ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              {currentOrganization ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <Circle className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <span>Organization Setup</span>
          </CardTitle>
          <CardDescription>
            Choose your organization or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <OrganizationSwitcher
              currentOrganization={currentOrganization}
              onOrganizationChange={onOrganizationChange}
              showCreateButton={true}
            />

            {currentOrganization && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <h4 className="font-medium text-green-800">Organization Created</h4>
                    <p className="text-sm text-green-700">
                      {currentOrganization.name} is ready with {currentOrganization.plan_name} plan
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Onboarding Steps */}
      {currentOrganization && (
        <div className="space-y-4">
          {steps.slice(1).map((step, index) => (
            <Card
              key={step.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                step.completed ? 'border-green-200 bg-green-50' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleStepClick(step.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step.completed ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      {step.completed ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{step.title}</h3>
                        {step.optional && (
                          <Badge variant="secondary" className="text-xs">Optional</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{step.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {step.id === 'team' && (
                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>{currentOrganization.seat_count} members</span>
                      </div>
                    )}
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Enterprise Features Preview */}
      {currentOrganization && currentOrganization.hasTicketing && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">Enterprise Features Activated</h3>
                <p className="text-sm text-blue-700">
                  Human ticketing system, team collaboration, and advanced analytics are now available
                </p>
              </div>
            </div>
            <div className="mt-4 flex space-x-2">
              <Button
                size="sm"
                onClick={handleCompleteOnboarding}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Start Using Enterprise Features
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}