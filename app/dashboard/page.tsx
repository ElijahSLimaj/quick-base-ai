'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Plus, FileText, MessageCircle, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useNotification } from '@/contexts/NotificationContext'
import { PlanLimitBanner } from '@/components/billing/PlanLimitBanner'

interface Website {
  id: string
  name: string
  domain: string
  created_at: string
  content?: Array<{ count: number }>
  queries?: Array<{ count: number }>
}

export default function DashboardPage() {
  const [websites, setWebsites] = useState<Website[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newWebsite, setNewWebsite] = useState({ name: '', domain: '' })
  const [creating, setCreating] = useState(false)
  const [deletingWebsite, setDeletingWebsite] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const { showSuccess, showError } = useNotification()

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
  }, [router, supabase.auth])

  const fetchWebsites = useCallback(async () => {
    try {
      const response = await fetch('/api/websites')
      if (response.ok) {
        const data = await response.json()
        setWebsites(data.websites || [])
      } else if (response.status === 401) {
        // If unauthorized, redirect to login
        router.push('/login')
        return
      } else {
        console.error('Error fetching websites:', response.statusText)
      }
    } catch (error) {
      console.error('Error fetching websites:', error)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    checkUser()
  }, [checkUser])

  useEffect(() => {
    if (user) {
      fetchWebsites()
    }
  }, [user, fetchWebsites])

  const handleCreateWebsite = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      const response = await fetch('/api/websites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWebsite)
      })

      if (response.ok) {
        const data = await response.json()
        setWebsites([data.website, ...websites])
        setNewWebsite({ name: '', domain: '' })
        setShowCreateForm(false)
        showSuccess('Website created successfully!', `${data.website.name} is ready to use`)
      } else if (response.status === 401) {
        // If unauthorized, redirect to login
        router.push('/login')
        return
      } else {
        const error = await response.json()
        showError('Failed to create website', error.error)
      }
    } catch (error) {
      console.error('Error creating website:', error)
      showError('Failed to create website', 'An unexpected error occurred')
    } finally {
      setCreating(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleDeleteWebsite = async (websiteId: string) => {
    setDeletingWebsite(websiteId)

    try {
      const response = await fetch('/api/websites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteId })
      })

      if (response.ok) {
        setWebsites(websites.filter(w => w.id !== websiteId))
        setShowDeleteConfirm(null)
        showSuccess('Website deleted successfully')
      } else if (response.status === 401) {
        router.push('/login')
        return
      } else {
        const error = await response.json()
        showError('Failed to delete website', error.error)
      }
    } catch (error) {
      console.error('Error deleting website:', error)
      showError('Failed to delete website', 'An unexpected error occurred')
    } finally {
      setDeletingWebsite(null)
    }
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

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">QB</span>
            </div>
            <span className="text-xl font-bold text-gray-900">QuickBase AI</span>
          </Link>
          <div className="flex items-center space-x-4">
            <Button onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </nav>

      <PlanLimitBanner action="create_website" />

      <main className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Your Websites</h1>
                <p className="text-gray-600 mt-2">Manage your AI support widgets</p>
              </div>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Website
              </Button>
            </div>

        {showCreateForm && (
          <Card className="mb-8 border-0 bg-white shadow-lg">
            <CardHeader>
              <CardTitle>Create New Website</CardTitle>
              <CardDescription>
                Set up a new AI support widget for your website
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateWebsite} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Website Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={newWebsite.name}
                    onChange={(e) => setNewWebsite({ ...newWebsite, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="My Website Support"
                  />
                </div>
                <div>
                  <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-1">
                    Website Domain
                  </label>
                  <input
                    id="domain"
                    type="url"
                    value={newWebsite.domain}
                    onChange={(e) => setNewWebsite({ ...newWebsite, domain: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button type="submit" disabled={creating}>
                    {creating ? 'Creating...' : 'Create Website'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Dialog open={!!showDeleteConfirm} onOpenChange={() => setShowDeleteConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Website</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this website? This action cannot be undone and will permanently remove all associated data.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteConfirm(null)}
                disabled={deletingWebsite === showDeleteConfirm}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteWebsite(showDeleteConfirm!)}
                disabled={deletingWebsite === showDeleteConfirm}
              >
                {deletingWebsite === showDeleteConfirm ? 'Deleting...' : 'Delete Website'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {websites.length === 0 ? (
          <Card className="border-0 bg-white shadow-lg">
            <CardContent className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No websites yet</h3>
              <p className="text-gray-600 mb-4">Create your first website to get started</p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Website
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {websites.map((website) => (
              <Card key={website.id} className="border-0 bg-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{website.name}</CardTitle>
                    <div className="flex space-x-1">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setShowDeleteConfirm(website.id)
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>{website.domain}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-600">
                      <FileText className="w-4 h-4 mr-2" />
                      {Array.isArray(website.content) && website.content.length > 0 ? website.content[0].count : 0} content pieces
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      {Array.isArray(website.queries) && website.queries.length > 0 ? website.queries[0].count : 0} queries answered
                    </div>
                    <div className="text-xs text-gray-500">
                      Created {new Date(website.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="mt-4 flex space-x-2">
                    <Link href={`/dashboard/websites/${website.id}`}>
                      <Button size="sm" className="flex-1">
                        Manage
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
