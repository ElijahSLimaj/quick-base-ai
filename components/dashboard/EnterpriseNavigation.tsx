'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2,
  Ticket,
  Users,
  Globe,
  BarChart3,
  Settings,
  Bell,
  ChevronDown,
  Crown
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { NotificationDropdown } from './NotificationDropdown'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Organization {
  id: string
  name: string
  plan_name: string
  seat_count: number
  max_seats: number
}

interface EnterpriseNavigationProps {
  userOrganization?: Organization | null
  unreadTickets?: number
}

export function EnterpriseNavigation({ userOrganization, unreadTickets = 0 }: EnterpriseNavigationProps) {
  const pathname = usePathname()

  const navigationItems = [
    {
      name: 'Websites',
      href: '/dashboard',
      icon: Globe,
      description: 'Manage your AI widgets'
    },
    {
      name: 'Tickets',
      href: '/dashboard/tickets',
      icon: Ticket,
      description: 'Customer support tickets',
      badge: unreadTickets > 0 ? unreadTickets : undefined,
      enterprise: true
    },
    {
      name: 'Organization',
      href: '/dashboard/organization',
      icon: Building2,
      description: 'Team & settings',
      enterprise: true
    },
    {
      name: 'Team',
      href: '/dashboard/organization/team',
      icon: Users,
      description: 'Manage team members',
      enterprise: true
    },
    {
      name: 'Analytics',
      href: '/dashboard/analytics',
      icon: BarChart3,
      description: 'Usage & insights',
      enterprise: true
    }
  ]

  // Filter navigation based on plan
  const availableItems = navigationItems.filter(item =>
    !item.enterprise || userOrganization?.plan_name === 'enterprise'
  )

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Organization Info */}
          {userOrganization && (
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-gray-600" />
                <span className="font-medium text-gray-900">{userOrganization.name}</span>
                {userOrganization.plan_name === 'enterprise' && (
                  <Badge variant="secondary" className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                    <Crown className="h-3 w-3 mr-1" />
                    Enterprise
                  </Badge>
                )}
              </div>
              <div className="text-sm text-gray-500">
                {userOrganization.seat_count}/{userOrganization.max_seats} seats
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex items-center space-x-1">
            {availableItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href))

              return (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant={isActive ? 'default' : 'ghost'}
                    className={`relative h-9 px-3 ${
                      isActive
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.name}
                    {item.badge && (
                      <Badge
                        variant="destructive"
                        className="ml-2 h-5 px-1.5 text-xs"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </Button>
                </Link>
              )
            })}
          </nav>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            {/* Notifications */}
            <NotificationDropdown />
            
            {userOrganization?.plan_name === 'enterprise' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Bell className="h-4 w-4 mr-2" />
                    Quick Actions
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/tickets/new" className="flex items-center">
                      <Ticket className="h-4 w-4 mr-2" />
                      Create Ticket
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/organization/team/invite" className="flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Invite Team Member
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="flex items-center">
                      <Globe className="h-4 w-4 mr-2" />
                      Add Website
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}