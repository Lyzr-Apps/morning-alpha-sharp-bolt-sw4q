'use client'

import React, { useState } from 'react'
import { FiHome, FiList, FiSettings, FiMail, FiChevronLeft, FiChevronRight, FiActivity } from 'react-icons/fi'

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: FiHome },
  { id: 'watchlist', label: 'Watchlist', icon: FiList },
  { id: 'emailHistory', label: 'Email History', icon: FiMail },
  { id: 'settings', label: 'Settings', icon: FiSettings },
]

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={`flex flex-col h-screen border-r border-border bg-[hsl(220,24%,8%)] transition-all duration-200 ${collapsed ? 'w-16' : 'w-56'}`}
    >
      <div className="flex items-center gap-2 px-4 py-5 border-b border-border">
        <FiActivity className="w-5 h-5 text-[hsl(220,80%,55%)] flex-shrink-0" />
        {!collapsed && (
          <span className="text-sm font-bold tracking-wide text-foreground truncate">
            Morning Alpha
          </span>
        )}
      </div>

      <nav className="flex-1 py-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors ${isActive ? 'bg-[hsl(220,15%,15%)] text-[hsl(220,80%,55%)] border-r-2 border-[hsl(220,80%,55%)]' : 'text-muted-foreground hover:text-foreground hover:bg-[hsl(220,15%,12%)]'}`}
              title={item.label}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          )
        })}
      </nav>

      <button
        onClick={() => setCollapsed((p) => !p)}
        className="flex items-center justify-center py-3 border-t border-border text-muted-foreground hover:text-foreground transition-colors"
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        {collapsed ? <FiChevronRight className="w-4 h-4" /> : <FiChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  )
}
