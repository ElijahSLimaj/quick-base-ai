'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { User, Construction, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function ProfilePage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <User className="h-8 w-8 mr-3 text-gray-600" />
          Profile Settings
        </h1>
        <p className="text-gray-600 mt-2">
          Manage your personal account settings and preferences
        </p>
      </div>

      <Card className="border-0 bg-gradient-to-br from-gray-50 to-slate-50 shadow-lg">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto mb-4 w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <Construction className="h-8 w-8 text-gray-600" />
          </div>
          <CardTitle className="text-2xl">Coming Soon</CardTitle>
          <CardDescription className="text-base mt-2">
            Personal profile and account management
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white rounded-lg p-6 space-y-3">
            <h3 className="font-semibold text-gray-900">What to Expect:</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <ArrowRight className="h-4 w-4 mr-2 mt-0.5 text-gray-600 flex-shrink-0" />
                <span>Update your profile information and avatar</span>
              </li>
              <li className="flex items-start">
                <ArrowRight className="h-4 w-4 mr-2 mt-0.5 text-gray-600 flex-shrink-0" />
                <span>Change password and security settings</span>
              </li>
              <li className="flex items-start">
                <ArrowRight className="h-4 w-4 mr-2 mt-0.5 text-gray-600 flex-shrink-0" />
                <span>Manage email notifications and preferences</span>
              </li>
              <li className="flex items-start">
                <ArrowRight className="h-4 w-4 mr-2 mt-0.5 text-gray-600 flex-shrink-0" />
                <span>Configure two-factor authentication</span>
              </li>
              <li className="flex items-start">
                <ArrowRight className="h-4 w-4 mr-2 mt-0.5 text-gray-600 flex-shrink-0" />
                <span>View activity log and connected devices</span>
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

