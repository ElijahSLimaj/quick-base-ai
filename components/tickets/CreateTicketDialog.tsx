'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Loader2, X, Globe, AlertCircle, User, Mail } from "lucide-react"
import { useNotification } from '@/contexts/NotificationContext'

interface CreateTicketDialogProps {
  organizationId: string
  onTicketCreated?: (ticket: any) => void
}

export function CreateTicketDialog({ organizationId, onTicketCreated }: CreateTicketDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [websites, setWebsites] = useState<Array<{ id: string; name: string }>>([])
  const [formData, setFormData] = useState({
    website_id: '',
    title: '',
    description: '',
    priority: 'medium',
    category: 'general',
    customer_email: '',
    customer_name: ''
  })
  const { showError, showSuccess } = useNotification()

  const handleOpenChange = async (newOpen: boolean) => {
    setOpen(newOpen)

    if (newOpen && websites.length === 0) {
      // Fetch websites for this organization
      try {
        const response = await fetch(`/api/websites?organization_id=${organizationId}`)
        if (response.ok) {
          const data = await response.json()
          setWebsites(data.websites || [])
        }
      } catch (error) {
        console.error('Failed to fetch websites:', error)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.website_id || !formData.title || !formData.description) {
      showError('Please fill in all required fields')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error('Failed to create ticket')
      }

      const data = await response.json()

      showSuccess('Ticket created successfully')
      setOpen(false)
      setFormData({
        website_id: '',
        title: '',
        description: '',
        priority: 'medium',
        category: 'general',
        customer_email: '',
        customer_name: ''
      })

      onTicketCreated?.(data.ticket)

    } catch (error) {
      console.error('Error creating ticket:', error)
      showError('Failed to create ticket')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
          <Plus className="w-4 h-4 mr-2" />
          New Ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] bg-white p-0">
        <div className="flex flex-col max-h-[90vh]">
          <div className="px-6 py-4 border-b border-gray-100 bg-white">
            <DialogTitle className="text-lg font-semibold text-gray-900">Create New Ticket</DialogTitle>
            <p className="text-sm text-gray-500 mt-1">Create a support ticket on behalf of a customer</p>
          </div>

          <div className="flex-1 overflow-y-auto bg-gray-50 px-6 py-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Website *</label>
                <Select
                  value={formData.website_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, website_id: value }))}
                  required
                >
                  <SelectTrigger className="bg-white border-0 rounded-lg h-10 shadow-sm focus:ring-1 focus:ring-blue-200 focus:ring-opacity-50">
                    <SelectValue placeholder="Select a website" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-0 shadow-lg rounded-lg z-50">
                    {websites.map((website) => (
                      <SelectItem key={website.id} value={website.id} className="bg-white hover:bg-gray-50">
                        {website.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Priority</label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger className="bg-white border-0 rounded-lg h-10 shadow-sm focus:ring-1 focus:ring-blue-200 focus:ring-opacity-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-0 shadow-lg rounded-lg z-50">
                      <SelectItem value="low" className="bg-white hover:bg-gray-50">⚪ Low</SelectItem>
                      <SelectItem value="medium" className="bg-white hover:bg-gray-50">🟡 Medium</SelectItem>
                      <SelectItem value="high" className="bg-white hover:bg-gray-50">🟠 High</SelectItem>
                      <SelectItem value="urgent" className="bg-white hover:bg-gray-50">🔴 Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Category</label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger className="bg-white border-0 rounded-lg h-10 shadow-sm focus:ring-1 focus:ring-blue-200 focus:ring-opacity-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-0 shadow-lg rounded-lg z-50">
                      <SelectItem value="general" className="bg-white hover:bg-gray-50">General</SelectItem>
                      <SelectItem value="technical" className="bg-white hover:bg-gray-50">Technical</SelectItem>
                      <SelectItem value="billing" className="bg-white hover:bg-gray-50">Billing</SelectItem>
                      <SelectItem value="feature_request" className="bg-white hover:bg-gray-50">Feature Request</SelectItem>
                      <SelectItem value="bug_report" className="bg-white hover:bg-gray-50">Bug Report</SelectItem>
                      <SelectItem value="integration" className="bg-white hover:bg-gray-50">Integration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Title *</label>
                <Input
                  placeholder="Brief description of the issue"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="bg-white border-0 rounded-lg h-10 px-3 shadow-sm placeholder:text-gray-400 focus:ring-1 focus:ring-blue-200 focus:ring-opacity-50 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Description *</label>
                <Textarea
                  placeholder="Provide detailed information about the issue or request..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="bg-white border-0 rounded-lg p-3 shadow-sm resize-none placeholder:text-gray-400 focus:ring-1 focus:ring-blue-200 focus:ring-opacity-50 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Customer Information</label>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Customer name"
                    value={formData.customer_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                    className="bg-white border-0 rounded-lg h-10 px-3 shadow-sm placeholder:text-gray-400 focus:ring-1 focus:ring-blue-200 focus:ring-opacity-50 focus:outline-none"
                  />
                  <Input
                    type="email"
                    placeholder="customer@example.com"
                    value={formData.customer_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, customer_email: e.target.value }))}
                    className="bg-white border-0 rounded-lg h-10 px-3 shadow-sm placeholder:text-gray-400 focus:ring-1 focus:ring-blue-200 focus:ring-opacity-50 focus:outline-none"
                  />
                </div>
              </div>
            </form>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="px-4 h-9 rounded-lg border-gray-200 text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                onClick={handleSubmit}
                className="px-4 h-9 bg-blue-600 hover:bg-blue-700 rounded-lg border-0"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Ticket
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}