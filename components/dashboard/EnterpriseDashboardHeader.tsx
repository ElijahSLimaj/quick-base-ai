'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Building2,
  Users,
  Ticket,
  Globe,
  TrendingUp,
  Crown,
  Star
} from 'lucide-react'
import Link from 'next/link'

interface Organization {
  id: string
  name: string
  plan_name: string
  seat_count: number
  max_seats: number
}

interface DashboardStats {
  totalWebsites: number
  totalTickets: number
  openTickets: number
  teamMembers: number
  monthlyQueries: number
}

interface EnterpriseDashboardHeaderProps {
  organization?: Organization | null
  stats?: DashboardStats
}

export function EnterpriseDashboardHeader({ organization, stats }: EnterpriseDashboardHeaderProps) {
  if (!organization || organization.plan_name !== 'enterprise') {
    return null
  }

  const quickStats = [
    {
      name: 'Websites',
      value: stats?.totalWebsites || 0,
      icon: Globe,
      href: '/dashboard',
      color: 'bg-blue-500'
    },
    {
      name: 'Open Tickets',
      value: stats?.openTickets || 0,
      icon: Ticket,
      href: '/dashboard/tickets',
      color: 'bg-orange-500'
    },
    {
      name: 'Team Members',
      value: stats?.teamMembers || organization.seat_count,
      icon: Users,
      href: '/dashboard/organization/team',
      color: 'bg-green-500'
    },
    {
      name: 'Monthly Queries',
      value: stats?.monthlyQueries || 0,
      icon: TrendingUp,
      href: '/dashboard/analytics',
      color: 'bg-purple-500'
    }
  ]

  return (
    <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
      <div className="container mx-auto px-4 py-6">
        {/* Organization Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{organization.name}</h1>
                <p className="text-slate-300">Enterprise Dashboard</p>
              </div>
            </div>
            <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              <Crown className="h-3 w-3 mr-1" />
              Enterprise Plan
            </Badge>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-sm text-slate-300">
              <span className="text-white font-medium">{organization.seat_count}</span>
              /{organization.max_seats} seats used
            </div>
            <Link href="/dashboard/organization/team/invite">
              <Button variant="secondary" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Invite Team
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Stats - Display Only */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickStats.map((stat) => (
            <Card key={stat.name} className="bg-white/5 border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-300 text-sm">{stat.name}</p>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    <stat.icon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Enterprise Features Highlight */}
        <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Star className="h-5 w-5 text-yellow-400" />
              <div>
                <h3 className="font-medium">Enterprise Features Active</h3>
                <p className="text-sm text-slate-300">
                  Unlimited websites, team collaboration, priority support, and advanced analytics
                </p>
              </div>
            </div>
            <Link href="/dashboard/organization">
              <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
                Manage Organization
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}