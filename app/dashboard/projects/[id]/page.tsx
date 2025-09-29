'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Globe, FileText, MessageCircle, Copy, Check, BarChart3, Palette } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useNotification } from '@/contexts/NotificationContext'

interface Project {
  id: string
  name: string
  domain: string
  created_at: string
  settings: Record<string, unknown>
}

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const { showSuccess, showError } = useNotification()
  
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadType, setUploadType] = useState<'website' | 'document'>('website')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [embedCode, setEmbedCode] = useState('')
  const [copied, setCopied] = useState(false)
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

  const fetchProject = useCallback(async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        const project = data.projects.find((p: Project) => p.id === projectId)
        setProject(project)
      }
    } catch (error) {
      console.error('Error fetching project:', error)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const generateEmbedCode = useCallback(() => {
    const code = `<script src="${window.location.origin}/widget/embed.js" data-project-id="${projectId}"></script>`
    setEmbedCode(code)
  }, [projectId])

  useEffect(() => {
    checkUser()
  }, [checkUser])

  useEffect(() => {
    if (user && projectId) {
      fetchProject()
      generateEmbedCode()
    }
  }, [user, projectId, fetchProject, generateEmbedCode])

  const handleWebsiteCrawl = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!websiteUrl) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('projectId', projectId)
      formData.append('type', 'website')
      formData.append('url', websiteUrl)

      const response = await fetch('/api/ingest', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        showSuccess('Website crawled successfully!', `Processed ${data.chunksProcessed} chunks from ${websiteUrl}`)
        setWebsiteUrl('')
      } else {
        const error = await response.json()
        showError('Failed to crawl website', error.error)
      }
    } catch (error) {
      console.error('Error crawling website:', error)
      showError('Failed to crawl website', 'An unexpected error occurred')
    } finally {
      setUploading(false)
    }
  }

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('projectId', projectId)
      formData.append('type', 'document')
      formData.append('file', selectedFile)

      const response = await fetch('/api/ingest', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        showSuccess('Document uploaded successfully!', `Processed ${data.chunksProcessed} chunks from ${selectedFile.name}`)
        setSelectedFile(null)
      } else {
        const error = await response.json()
        showError('Failed to upload document', error.error)
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      showError('Failed to upload document', 'An unexpected error occurred')
    } finally {
      setUploading(false)
    }
  }

  const copyEmbedCode = async () => {
    try {
      await navigator.clipboard.writeText(embedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
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

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Project not found</h1>
          <p className="text-gray-600">The project you&apos;re looking for doesn&apos;t exist.</p>
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
              <p className="text-gray-600 mt-2">{project.domain}</p>
            </div>
            <div className="flex space-x-2">
              <Link href={`/dashboard/projects/${projectId}/analytics`}>
                <Button variant="outline" size="sm">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </Button>
              </Link>
              <Link href={`/dashboard/projects/${projectId}/customize`}>
                <Button variant="outline" size="sm">
                  <Palette className="w-4 h-4 mr-2" />
                  Customize
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Upload className="w-5 h-5 mr-2" />
                  Add Content
                </CardTitle>
                <CardDescription>
                  Upload documents or crawl your website to train your AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex space-x-2">
                    <Button
                      variant={uploadType === 'website' ? 'default' : 'outline'}
                      onClick={() => setUploadType('website')}
                    >
                      <Globe className="w-4 h-4 mr-2" />
                      Website
                    </Button>
                    <Button
                      variant={uploadType === 'document' ? 'default' : 'outline'}
                      onClick={() => setUploadType('document')}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Document
                    </Button>
                  </div>

                  {uploadType === 'website' ? (
                    <form onSubmit={handleWebsiteCrawl} className="space-y-4">
                      <div>
                        <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                          Website URL
                        </label>
                        <input
                          id="url"
                          type="url"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="https://example.com"
                        />
                      </div>
                      <Button type="submit" disabled={uploading || !websiteUrl}>
                        {uploading ? 'Crawling...' : 'Crawl Website'}
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleFileUpload} className="space-y-4">
                      <div>
                        <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
                          Upload Document
                        </label>
                        <input
                          id="file"
                          type="file"
                          accept=".pdf,.docx,.md,.txt"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Supported formats: PDF, DOCX, Markdown, TXT
                        </p>
                      </div>
                      <Button type="submit" disabled={uploading || !selectedFile}>
                        {uploading ? 'Processing...' : 'Upload Document'}
                      </Button>
                    </form>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Embed Widget
                </CardTitle>
                <CardDescription>
                  Add this code to your website to enable the AI widget
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-gray-100 p-3 rounded-md">
                    <code className="text-sm text-gray-800 break-all">
                      {embedCode}
                    </code>
                  </div>
                  <Button onClick={copyEmbedCode} className="w-full">
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Code
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Widget Preview</CardTitle>
                <CardDescription>
                  See how your widget will look on your website
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-100 p-4 rounded-md text-center">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm text-gray-600">AI Support Widget</p>
                  <p className="text-xs text-gray-500 mt-1">Click to chat with AI</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
