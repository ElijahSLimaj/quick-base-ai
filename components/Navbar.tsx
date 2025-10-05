'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { User, Menu, X, LogOut } from 'lucide-react'

interface NavbarProps {
  showSignOut?: boolean
  showProfile?: boolean
  onSignOut?: () => void
}

export function Navbar({ showSignOut = false, showProfile = false, onSignOut }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  return (
    <nav className="bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link 
            href="/dashboard" 
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
            onClick={closeMenu}
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">QB</span>
            </div>
            <span className="text-xl font-bold text-gray-900 hidden sm:block">QuickBase AI</span>
            <span className="text-xl font-bold text-gray-900 sm:hidden">QB</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {showProfile && (
              <Link href="/dashboard/profile">
                <Button variant="outline" size="sm">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Button>
              </Link>
            )}
            {showSignOut && onSignOut && (
              <Button onClick={onSignOut} size="sm">
                Sign Out
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMenu}
              className="p-2"
            >
              {isMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200">
            <div className="py-4 space-y-2">
              {showProfile && (
                <Link href="/dashboard/profile" onClick={closeMenu}>
                  <Button variant="outline" className="w-full justify-start">
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </Button>
                </Link>
              )}
              {showSignOut && onSignOut && (
                <Button 
                  onClick={() => {
                    onSignOut()
                    closeMenu()
                  }} 
                  className="w-full justify-start"
                  variant="destructive"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
