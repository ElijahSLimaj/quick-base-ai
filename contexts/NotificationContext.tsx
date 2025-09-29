'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { NotificationContainer, type Notification } from '@/components/ui/notification'

interface NotificationContextType {
  showNotification: (notification: Omit<Notification, 'id'>) => void
  showSuccess: (title: string, message?: string) => void
  showError: (title: string, message?: string) => void
  showInfo: (title: string, message?: string) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const showNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newNotification = { ...notification, id }
    setNotifications(prev => [...prev, newNotification])
  }, [])

  const showSuccess = useCallback((title: string, message?: string) => {
    showNotification({ type: 'success', title, message })
  }, [showNotification])

  const showError = useCallback((title: string, message?: string) => {
    showNotification({ type: 'error', title, message })
  }, [showNotification])

  const showInfo = useCallback((title: string, message?: string) => {
    showNotification({ type: 'info', title, message })
  }, [showNotification])

  return (
    <NotificationContext.Provider value={{ showNotification, showSuccess, showError, showInfo }}>
      {children}
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}