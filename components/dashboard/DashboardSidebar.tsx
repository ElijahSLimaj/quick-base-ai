'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Globe,
  Ticket,
  Users,
  BarChart3,
  Settings,
  CreditCard,
  User,
  ChevronLeft,
  ChevronRight,
  Crown,
  X
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NavigationItem {
  name: string
  href: string
  icon: any
  badge?: number | null
  enterprise?: boolean
}

interface NavigationSection {
  section: string
  items: NavigationItem[]
  enterprise?: boolean
}

interface DashboardSidebarProps {
  organization?: {
    id: string
    name: string
    plan_name: string
    seat_count: number
    max_seats: number
  } | null
  unreadTickets?: number
  websiteCount?: number
  isMobileOpen?: boolean
  onMobileClose?: () => void
}

export function DashboardSidebar({
  organization,
  unreadTickets = 0,
  websiteCount = 0,
  isMobileOpen = false,
  onMobileClose
}: DashboardSidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const isEnterprise = organization?.plan_name === 'enterprise'

  const navigationSections: NavigationSection[] = [
    {
      section: 'Main',
      items: [
        { name: 'Overview', href: '/dashboard', icon: Home },
        { name: 'Websites', href: '/dashboard/websites', icon: Globe, badge: websiteCount }
      ]
    },
    {
      section: 'Support',
      enterprise: true,
      items: [
        { name: 'Tickets', href: '/dashboard/tickets', icon: Ticket, badge: unreadTickets, enterprise: true }
      ]
    },
    {
      section: 'Organization',
      enterprise: true,
      items: [
        { name: 'Team', href: '/dashboard/organization/team', icon: Users, enterprise: true },
        { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, enterprise: true },
        { name: 'Settings', href: '/dashboard/organization', icon: Settings, enterprise: true }
      ]
    },
    {
      section: 'Account',
      items: [
        { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
        { name: 'Profile', href: '/dashboard/profile', icon: User }
      ]
    }
  ]

  // Filter sections and items based on plan
  const visibleSections = navigationSections
    .filter(section => !section.enterprise || isEnterprise)
    .map(section => ({
      ...section,
      items: section.items.filter(item => !item.enterprise || isEnterprise)
    }))
    .filter(section => section.items.length > 0)

  const isActive = (href: string) => {
    // Exact match for dashboard root
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    
    // For exact matches, return true
    if (pathname === href) {
      return true
    }
    
    // For child routes, only match if this is a direct child
    // This prevents /dashboard/organization from matching when on /dashboard/organization/team
    if (pathname.startsWith(href + '/')) {
      // Check if there's a more specific match in the navigation
      const allHrefs = visibleSections.flatMap(section => section.items.map(item => item.href))
      
      // If there's a longer/more specific href that also matches, don't highlight this one
      const hasMoreSpecificMatch = allHrefs.some(otherHref => 
        otherHref !== href && 
        otherHref.startsWith(href) && 
        (pathname === otherHref || pathname.startsWith(otherHref + '/'))
      )
      
      return !hasMoreSpecificMatch
    }
    
    return false
  }

  const sidebarContent = (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Sidebar Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">QB</span>
            </div>
            <span className="text-lg font-bold text-gray-900">QuickBase</span>
          </div>
        )}
        
        {/* Desktop collapse toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex p-1.5"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>

        {/* Mobile close button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onMobileClose}
          className="lg:hidden p-1.5"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Organization Badge */}
      {!isCollapsed && isEnterprise && organization && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 truncate">{organization.name}</p>
              <div className="flex items-center mt-1">
                <Badge variant="secondary" className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs">
                  <Crown className="h-3 w-3 mr-1" />
                  Enterprise
                </Badge>
              </div>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            {organization.seat_count}/{organization.max_seats} seats used
          </div>
        </div>
      )}

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {visibleSections.map((section) => (
          <div key={section.section}>
            {!isCollapsed && (
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {section.section}
              </h3>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                
                return (
                  <Link key={item.name} href={item.href} onClick={onMobileClose}>
                    <div
                      className={cn(
                        'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                        active
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      )}
                    >
                      <Icon
                        className={cn(
                          'flex-shrink-0 h-5 w-5',
                          active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                        )}
                      />
                      {!isCollapsed && (
                        <>
                          <span className="ml-3 flex-1">{item.name}</span>
                          {item.badge !== null && item.badge !== undefined && item.badge > 0 && (
                            <Badge
                              variant="destructive"
                              className="ml-auto h-5 px-2 text-xs"
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                      {isCollapsed && item.badge !== null && item.badge !== undefined && item.badge > 0 && (
                        <div className="absolute left-8 top-1 w-2 h-2 bg-red-500 rounded-full" />
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Section */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 mb-2">
            Need help? Contact support
          </div>
          <Link href="/dashboard/billing">
            <Button variant="outline" size="sm" className="w-full justify-start text-xs">
              <Crown className="h-3 w-3 mr-2" />
              {isEnterprise ? 'Manage Plan' : 'Upgrade'}
            </Button>
          </Link>
        </div>
      )}
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:block h-full transition-all duration-300 ease-in-out',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
            onClick={onMobileClose}
          />
          
          {/* Sidebar */}
          <aside className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}

