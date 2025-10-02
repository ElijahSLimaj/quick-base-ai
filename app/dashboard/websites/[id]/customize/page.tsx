'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import WidgetCustomizer from '@/components/widget/WidgetCustomizer'
import { ArrowLeft, Palette } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

interface WidgetSettings {
  primaryColor: string
  secondaryColor: string
  welcomeMessage: string
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  showBranding: boolean
  language: string
  maxWidth: number
  borderRadius: number
}

export default function CustomizePage() {
  const params = useParams()
  const router = useRouter()
  const websiteId = params.id as string
  const [website, setWebsite] = useState<{ id: string; name: string; domain: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const supabase = createClient()

  const checkUser = useCallback(async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        router.push('/login')
        return
      }
      setUser(user)
    } catch (error) {
      console.error('Error checking user:', error)
      router.push('/login')
    }
  }, [router, supabase])
  // Widget settings are managed by the WidgetCustomizer component

  const fetchWebsite = useCallback(async () => {
    try {
      const response = await fetch(`/api/websites/${websiteId}`)
      if (response.ok) {
        const data = await response.json()
        setWebsite(data.website)
      }
    } catch (error) {
      console.error('Error fetching website:', error)
    } finally {
      setLoading(false)
    }
  }, [websiteId])

  useEffect(() => {
    checkUser()
  }, [checkUser])

  useEffect(() => {
    if (user) {
      fetchWebsite()
    }
  }, [user, fetchWebsite])


  const handleSettingsChange = (newSettings: WidgetSettings) => {
    // Settings are managed by the WidgetCustomizer component
    console.log('Settings changed:', newSettings)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!website) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Website not found</h1>
          <p className="text-gray-600">The website you&apos;re looking for doesn&apos;t exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">QB</span>
            </div>
            <span className="text-xl font-bold text-gray-900">QuickBase AI</span>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link href={`/dashboard/websites/${websiteId}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Website
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Palette className="w-8 h-8 mr-3" />
                Customize Widget
              </h1>
              <p className="text-gray-600 mt-2">Personalize your AI support widget</p>
            </div>
          </div>
        </div>

        <WidgetCustomizer 
          projectId={websiteId} 
          onSettingsChange={handleSettingsChange}
        />
      </main>
    </div>
  )
}
