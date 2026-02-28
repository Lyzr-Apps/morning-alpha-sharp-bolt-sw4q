'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { FiPlus, FiTrash2, FiAlertCircle } from 'react-icons/fi'

const STORAGE_KEY = 'morningAlpha_watchlist'
const DEFAULT_WATCHLIST = ['AAPL', 'TSLA', 'GOOGL', 'MSFT', 'AMZN']

interface WatchlistItem {
  ticker: string
  addedAt: string
}

export default function WatchlistSection() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWatchlist(parsed)
          return
        }
      }
    } catch {}
    const defaults: WatchlistItem[] = DEFAULT_WATCHLIST.map((t) => ({
      ticker: t,
      addedAt: new Date().toISOString(),
    }))
    setWatchlist(defaults)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults))
  }, [])

  const save = (items: WatchlistItem[]) => {
    setWatchlist(items)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }

  const handleAdd = () => {
    setError('')
    const ticker = input.trim().toUpperCase()
    if (!ticker) return
    if (!/^[A-Z]{1,5}(\.[A-Z]{1,2})?$/.test(ticker)) {
      setError('Invalid format. Use 1-5 letters, optional .XX suffix.')
      return
    }
    if (watchlist.some((w) => w.ticker === ticker)) {
      setError(`${ticker} is already in the watchlist.`)
      return
    }
    save([...watchlist, { ticker, addedAt: new Date().toISOString() }])
    setInput('')
  }

  const handleRemove = (ticker: string) => {
    save(watchlist.filter((w) => w.ticker !== ticker))
  }

  const handleClearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    save([])
    setConfirmClear(false)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-lg font-bold tracking-tight text-foreground">Watchlist Management</h1>
      <p className="text-xs text-muted-foreground leading-snug">
        Add stock tickers to track. The Morning Alpha coordinator analyzes these daily.
      </p>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Add Ticker</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. NVDA"
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(''); setConfirmClear(false) }}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="bg-input border-border text-foreground text-sm"
            />
            <Button onClick={handleAdd} size="sm" className="bg-[hsl(220,80%,55%)] hover:bg-[hsl(220,80%,48%)] text-white">
              <FiPlus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
          {error && (
            <p className="text-xs text-destructive mt-2 flex items-center gap-1">
              <FiAlertCircle className="w-3 h-3" /> {error}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Current Watchlist ({watchlist.length})</CardTitle>
          {watchlist.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className={`text-xs ${confirmClear ? 'text-destructive' : 'text-muted-foreground'}`}
            >
              <FiTrash2 className="w-3 h-3 mr-1" />
              {confirmClear ? 'Confirm Clear All?' : 'Clear All'}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {watchlist.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No tickers in watchlist. Add some above.</p>
          ) : (
            <div className="divide-y divide-border">
              {watchlist.map((item) => (
                <div key={item.ticker} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="bg-secondary text-secondary-foreground text-xs font-mono px-2">
                      {item.ticker}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Added {new Date(item.addedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(item.ticker)}
                    className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
