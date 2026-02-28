'use client'

import React, { useState } from 'react'
import Sidebar from './sections/Sidebar'
import DashboardSection from './sections/DashboardSection'
import WatchlistSection from './sections/WatchlistSection'
import EmailHistorySection from './sections/EmailHistorySection'
import SettingsSection from './sections/SettingsSection'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function Page() {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <ErrorBoundary>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && <DashboardSection />}
          {activeTab === 'watchlist' && <WatchlistSection />}
          {activeTab === 'emailHistory' && <EmailHistorySection />}
          {activeTab === 'settings' && <SettingsSection />}
        </main>
      </div>
    </ErrorBoundary>
  )
}
