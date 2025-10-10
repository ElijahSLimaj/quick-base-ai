'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Construction, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function TeamPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Users className="h-8 w-8 mr-3 text-green-600" />
          Team Management
        </h1>
        <p className="text-gray-600 mt-2">
          Invite and manage your team members
        </p>
      </div>

      <Card className="border-0 bg-gradient-to-br from-green-50 to-teal-50 shadow-lg">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <Construction className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Coming Soon</CardTitle>
          <CardDescription className="text-base mt-2">
            Complete team collaboration and management tools
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white rounded-lg p-6 space-y-3">
            <h3 className="font-semibold text-gray-900">What to Expect:</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <ArrowRight className="h-4 w-4 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                <span>Invite team members via email with role-based access</span>
              </li>
              <li className="flex items-start">
                <ArrowRight className="h-4 w-4 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                <span>Manage support agent seats and permissions</span>
              </li>
              <li className="flex items-start">
                <ArrowRight className="h-4 w-4 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                <span>Track team member activity and performance</span>
              </li>
              <li className="flex items-start">
                <ArrowRight className="h-4 w-4 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                <span>Set up ticket routing and assignment rules</span>
              </li>
              <li className="flex items-start">
                <ArrowRight className="h-4 w-4 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                <span>Configure on-call schedules and availability</span>
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

