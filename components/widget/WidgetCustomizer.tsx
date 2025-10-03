'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Palette, MessageCircle, Settings, Eye } from 'lucide-react'
import { useNotification } from '@/contexts/NotificationContext'

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

interface WidgetCustomizerProps {
  projectId: string
  onSettingsChange: (settings: WidgetSettings) => void
}

export default function WidgetCustomizer({ projectId, onSettingsChange }: WidgetCustomizerProps) {
  const { showSuccess } = useNotification()
  const [settings, setSettings] = useState<WidgetSettings>({
    primaryColor: '#2563eb',
    secondaryColor: '#ffffff',
    welcomeMessage: 'How can I help you today?',
    position: 'bottom-right',
    showBranding: true,
    language: 'en',
    maxWidth: 350,
    borderRadius: 12
  })

  const [preview, setPreview] = useState(false)

  useEffect(() => {
    onSettingsChange(settings)
  }, [settings, onSettingsChange])

  const handleSettingChange = (key: keyof WidgetSettings, value: string | number | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const generateEmbedCode = () => {
    const settingsJson = JSON.stringify(settings)
    return `<script src="${window.location.origin}/widget/embed.js" data-project-id="${projectId}" data-settings='${settingsJson}' data-api-url="${window.location.origin}/api/query"></script>`
  }

  const copyEmbedCode = async () => {
    try {
      await navigator.clipboard.writeText(generateEmbedCode())
      showSuccess('Embed code copied!', 'The code is now in your clipboard')
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card className="border-0 bg-white shadow-lg">
            <CardHeader>
              <CardTitle>
                Appearance
              </CardTitle>
              <CardDescription>
                Customize the look and feel of your widget
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="primaryColor" className="text-sm font-medium text-gray-700 mb-2 block">Primary Color</Label>
                  <div className="flex items-center space-x-3">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => handleSettingChange('primaryColor', e.target.value)}
                      className="w-12 h-10 p-1 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-colors"
                    />
                    <Input
                      value={settings.primaryColor}
                      onChange={(e) => handleSettingChange('primaryColor', e.target.value)}
                      className="flex-1 h-10 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="#2563eb"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="secondaryColor" className="text-sm font-medium text-gray-700 mb-2 block">Secondary Color</Label>
                  <div className="flex items-center space-x-3">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={settings.secondaryColor}
                      onChange={(e) => handleSettingChange('secondaryColor', e.target.value)}
                      className="w-12 h-10 p-1 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-colors"
                    />
                    <Input
                      value={settings.secondaryColor}
                      onChange={(e) => handleSettingChange('secondaryColor', e.target.value)}
                      className="flex-1 h-10 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="welcomeMessage" className="text-sm font-medium text-gray-700 mb-2 block">Welcome Message</Label>
                <Input
                  id="welcomeMessage"
                  value={settings.welcomeMessage}
                  onChange={(e) => handleSettingChange('welcomeMessage', e.target.value)}
                  placeholder="How can I help you today?"
                  className="h-10 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <Label htmlFor="position" className="text-sm font-medium text-gray-700 mb-2 block">Position</Label>
                <select
                  id="position"
                  value={settings.position}
                  onChange={(e) => handleSettingChange('position', e.target.value)}
                  className="w-full h-10 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                >
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="top-left">Top Left</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxWidth" className="text-sm font-medium text-gray-700 mb-2 block">Max Width (px)</Label>
                  <Input
                    id="maxWidth"
                    type="number"
                    value={settings.maxWidth}
                    onChange={(e) => handleSettingChange('maxWidth', parseInt(e.target.value))}
                    min="300"
                    max="500"
                    className="h-10 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <Label htmlFor="borderRadius" className="text-sm font-medium text-gray-700 mb-2 block">Border Radius (px)</Label>
                  <Input
                    id="borderRadius"
                    type="number"
                    value={settings.borderRadius}
                    onChange={(e) => handleSettingChange('borderRadius', parseInt(e.target.value))}
                    min="0"
                    max="20"
                    className="h-10 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white shadow-lg">
            <CardHeader>
              <CardTitle>
                Settings
              </CardTitle>
              <CardDescription>
                Configure widget behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="showBranding"
                  checked={settings.showBranding}
                  onChange={(e) => handleSettingChange('showBranding', e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <Label htmlFor="showBranding" className="text-sm font-medium text-gray-700">Show QuickBase AI branding</Label>
              </div>

              <div>
                <Label htmlFor="language" className="text-sm font-medium text-gray-700 mb-2 block">Language</Label>
                <select
                  id="language"
                  value={settings.language}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                  className="w-full h-10 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="it">Italian</option>
                  <option value="pt">Portuguese</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-0 bg-white shadow-lg">
            <CardHeader>
              <CardTitle>
                Preview
              </CardTitle>
              <CardDescription>
                See how your widget will look
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative h-96 bg-gray-100 rounded-lg overflow-hidden">
                <div
                  className="absolute bottom-4 right-4 w-12 h-12 rounded-full flex items-center justify-center cursor-pointer shadow-lg"
                  style={{
                    backgroundColor: settings.primaryColor,
                    color: settings.secondaryColor
                  }}
                >
                  <MessageCircle className="h-6 w-6" />
                </div>
                {preview && (
                  <div
                    className="absolute bottom-20 right-4 bg-white rounded-lg shadow-lg p-4"
                    style={{
                      width: `${settings.maxWidth}px`,
                      borderRadius: `${settings.borderRadius}px`
                    }}
                  >
                    <div
                      className="text-sm font-medium mb-2"
                      style={{ color: settings.primaryColor }}
                    >
                      {settings.welcomeMessage}
                    </div>
                    <div className="text-xs text-gray-500">
                      Powered by QuickBase AI
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-4 flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreview(!preview)}
                >
                  {preview ? 'Hide' : 'Show'} Preview
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white shadow-lg">
            <CardHeader>
              <CardTitle>Embed Code</CardTitle>
              <CardDescription>
                Copy this code to your website
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-100 p-3 rounded-md mb-4">
                <code className="text-sm text-gray-800 break-all">
                  {generateEmbedCode()}
                </code>
              </div>
              <Button onClick={copyEmbedCode} className="w-full">
                Copy Embed Code
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
