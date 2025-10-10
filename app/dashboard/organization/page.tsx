'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, Construction, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function OrganizationPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Settings className="h-8 w-8 mr-3 text-purple-600" />
          Organization Settings
        </h1>
        <p className="text-gray-600 mt-2">
          Manage your organization's settings, billing, and preferences
        </p>
      </div>

      <Card className="border-0 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto mb-4 w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
            <Construction className="h-8 w-8 text-purple-600" />
          </div>
          <CardTitle className="text-2xl">Coming Soon</CardTitle>
          <CardDescription className="text-base mt-2">
            Comprehensive organization management dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white rounded-lg p-6 space-y-3">
            <h3 className="font-semibold text-gray-900">What to Expect:</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <ArrowRight className="h-4 w-4 mr-2 mt-0.5 text-purple-600 flex-shrink-0" />
                <span>Organization profile and branding customization</span>
              </li>
              <li className="flex items-start">
                <ArrowRight className="h-4 w-4 mr-2 mt-0.5 text-purple-600 flex-shrink-0" />
                <span>Seat management and licensing</span>
              </li>
              <li className="flex items-start">
                <ArrowRight className="h-4 w-4 mr-2 mt-0.5 text-purple-600 flex-shrink-0" />
                <span>Billing and subscription management</span>
              </li>
              <li className="flex items-start">
                <ArrowRight className="h-4 w-4 mr-2 mt-0.5 text-purple-600 flex-shrink-0" />
                <span>Security and compliance settings</span>
              </li>
              <li className="flex items-start">
                <ArrowRight className="h-4 w-4 mr-2 mt-0.5 text-purple-600 flex-shrink-0" />
                <span>API keys and webhook configuration</span>
              </li>
            </ul>
          </div>

          <div className="flex justify-center pt-4">
            <Link href="/dashboard">
              <Button variant="outline">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

