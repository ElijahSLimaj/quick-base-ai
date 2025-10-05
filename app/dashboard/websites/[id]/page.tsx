'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Globe, FileText, MessageCircle, Copy, Check, BarChart3, Palette, User } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useNotification } from '@/contexts/NotificationContext'
import { HelpChatBubble } from '@/components/support/HelpChatBubble'
import { Navbar } from '@/components/Navbar'

interface Website {
  id: string
  name: string
  domain: string
  created_at: string
  settings: Record<string, unknown>
}

export default function WebsitePage() {
  const params = useParams()
  const router = useRouter()
  const websiteId = params.id as string
  const { showSuccess, showError } = useNotification()
  
  const [website, setWebsite] = useState<Website | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadType, setUploadType] = useState<'website' | 'document'>('website')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [embedCode, setEmbedCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [contentSources, setContentSources] = useState<Array<{
    id: string
    source_url: string
    created_at: string | null
    isGrouped?: boolean
    count?: number
  }>>([])
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

  const generateEmbedCode = useCallback(() => {
    const code = `<script src="${window.location.origin}/widget/embed.js" data-website-id="${websiteId}"></script>`
    setEmbedCode(code)
  }, [websiteId])

  const fetchContentSources = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('content')
        .select('id, source_url, created_at')
        .eq('website_id', websiteId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching content sources:', error)
      } else {
        // Group website content by domain to avoid duplicates
        const groupedSources = (data || []).reduce((acc: any[], source) => {
          const isWebsite = source.source_url.startsWith('http')
          
          if (isWebsite) {
            // For website content, group by domain
            const domain = new URL(source.source_url).origin
            const existingDomain = acc.find(item => 
              item.source_url.startsWith(domain)
            )
            
            if (!existingDomain) {
              acc.push({
                ...source,
                source_url: domain,
                isGrouped: true,
                count: 1
              })
            } else {
              existingDomain.count += 1
            }
          } else {
            // For documents, keep as individual entries
            acc.push({
              ...source,
              isGrouped: false,
              count: 1
            })
          }
          
          return acc
        }, [])
        
        setContentSources(groupedSources)
      }
    } catch (error) {
      console.error('Error fetching content sources:', error)
    }
  }, [websiteId, supabase])

  useEffect(() => {
    checkUser()
  }, [checkUser])

  useEffect(() => {
    if (user && websiteId) {
      fetchWebsite()
      generateEmbedCode()
      fetchContentSources()
    }
  }, [user, websiteId, fetchWebsite, generateEmbedCode, fetchContentSources])

  const handleWebsiteCrawl = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!websiteUrl) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('websiteId', websiteId)
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
        fetchContentSources() // Refresh the content list
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
    if (selectedFiles.length === 0) return

    setUploading(true)
    try {
      let totalChunks = 0
      const uploadedFiles: string[] = []

      // Process each file sequentially
      for (const file of selectedFiles) {
        const formData = new FormData()
        formData.append('websiteId', websiteId)
        formData.append('type', 'document')
        formData.append('file', file)

        const response = await fetch('/api/ingest', {
          method: 'POST',
          body: formData
        })

        if (response.ok) {
          const data = await response.json()
          totalChunks += data.chunksProcessed
          uploadedFiles.push(file.name)
        } else {
          const error = await response.json()
          showError(`Failed to upload ${file.name}`, error.error)
        }
      }

      if (uploadedFiles.length > 0) {
        showSuccess(
          `${uploadedFiles.length} document(s) uploaded successfully!`,
          `Processed ${totalChunks} chunks from: ${uploadedFiles.join(', ')}`
        )
        setSelectedFiles([])
        // Reset the file input
        const fileInput = document.getElementById('file') as HTMLInputElement
        if (fileInput) fileInput.value = ''
        fetchContentSources() // Refresh the content list
      }
    } catch (error) {
      console.error('Error uploading files:', error)
      showError('Failed to upload documents', 'An unexpected error occurred')
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
      <Navbar showProfile={true} />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{website.name}</h1>
              <p className="text-gray-600 mt-2">{website.domain}</p>
            </div>
            <div className="flex space-x-2">
              <Link href={`/dashboard/websites/${websiteId}/analytics`}>
                <Button size="sm">
                  Analytics
                </Button>
              </Link>
              <Link href={`/dashboard/websites/${websiteId}/customize`}>
                <Button size="sm">
                  Customize
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <Card className="border-0 bg-white shadow-lg">
              <CardHeader>
                <CardTitle>
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
                      Website
                    </Button>
                    <Button
                      variant={uploadType === 'document' ? 'default' : 'outline'}
                      onClick={() => setUploadType('document')}
                    >
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
                          placeholder="https://example.com/docs"
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
                          Upload Documents
                        </label>
                        <input
                          id="file"
                          type="file"
                          accept=".pdf,.docx,.md,.txt"
                          multiple
                          onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Supported formats: PDF, DOCX, Markdown, TXT • Select multiple files
                        </p>
                        <p className="text-xs text-gray-400 mt-1 italic">
                          For SaaS platforms and e-commerce sites, uploading documentation directly often provides better results than web crawling.
                        </p>
                      </div>
                      <Button type="submit" disabled={uploading || selectedFiles.length === 0}>
                        {uploading ? 'Processing...' : `Upload ${selectedFiles.length} Document${selectedFiles.length !== 1 ? 's' : ''}`}
                      </Button>
                    </form>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white shadow-lg">
              <CardHeader>
                <CardTitle>Content Sources</CardTitle>
                <CardDescription>
                  Manage your website's knowledge base
                </CardDescription>
              </CardHeader>
              <CardContent>
                {contentSources.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No content sources yet</p>
                    <p className="text-sm">Upload documents or crawl your website to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contentSources.map((source) => {
                      const isDocument = !source.source_url.startsWith('http')
                      const icon = isDocument ? FileText : Globe
                      const IconComponent = icon

                      return (
                        <div
                          key={source.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center space-x-3">
                            <IconComponent className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {isDocument
                                  ? source.source_url
                                  : source.source_url.replace(/^https?:\/\//, '')
                                }
                                {source.isGrouped && source.count && source.count > 1 && (
                                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    {source.count} pages
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-gray-500">
                                {isDocument ? 'Document' : 'Website'} • Added {source.created_at ? new Date(source.created_at).toLocaleDateString() : 'Unknown date'}
                              </p>
                            </div>
                          </div>
                          <div className="text-xs text-gray-400">
                            {isDocument ? '📄' : '🌐'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-0 bg-white shadow-lg">
              <CardHeader>
                <CardTitle>
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

            <Card className="border-0 bg-white shadow-lg">
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

      <HelpChatBubble />
    </div>
  )
}