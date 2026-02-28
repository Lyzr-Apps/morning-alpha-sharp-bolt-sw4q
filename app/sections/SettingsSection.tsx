'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useScheduler, cronToHuman, updateScheduleMessage } from '@/lib/scheduler'
import { FiMail, FiClock, FiSliders, FiSave, FiPlay, FiCheckCircle, FiAlertCircle } from 'react-icons/fi'

const SCHEDULE_ID_INIT = '69a282de25d4d77f732f15ec'
const WATCHLIST_KEY = 'morningAlpha_watchlist'
const EMAIL_KEY = 'morningAlpha_email'
const PREFS_KEY = 'morningAlpha_preferences'

interface Preferences {
  rsi: boolean
  ma: boolean
  sentiment: boolean
  overboughtThreshold: number
  oversoldThreshold: number
}

const DEFAULT_PREFS: Preferences = {
  rsi: true,
  ma: true,
  sentiment: true,
  overboughtThreshold: 70,
  oversoldThreshold: 30,
}

export default function SettingsSection() {
  const [scheduleId, setScheduleId] = useState(SCHEDULE_ID_INIT)
  const [email, setEmail] = useState('')
  const [emailSaved, setEmailSaved] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS)
  const [prefsSaved, setPrefsSaved] = useState(false)
  const [scheduleStatus, setScheduleStatus] = useState<string>('Loading...')
  const [isActive, setIsActive] = useState(false)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [scheduleMsg, setScheduleMsg] = useState('')
  const [triggerMsg, setTriggerMsg] = useState('')

  const { schedules, loading, fetchSchedules, toggleSchedule, trigger } = useScheduler()

  useEffect(() => {
    try {
      const storedEmail = localStorage.getItem(EMAIL_KEY)
      if (storedEmail) setEmail(storedEmail)
    } catch {}
    try {
      const storedPrefs = localStorage.getItem(PREFS_KEY)
      if (storedPrefs) {
        const parsed = JSON.parse(storedPrefs)
        setPrefs({ ...DEFAULT_PREFS, ...parsed })
      }
    } catch {}
    fetchSchedules()
  }, [])

  useEffect(() => {
    const sched = schedules.find((s) => s.id === scheduleId)
    if (sched) {
      setIsActive(sched.is_active)
      setScheduleStatus(sched.is_active ? 'Active' : 'Paused')
    } else if (schedules.length > 0) {
      const first = schedules[0]
      if (first) {
        setScheduleId(first.id)
        setIsActive(first.is_active)
        setScheduleStatus(first.is_active ? 'Active' : 'Paused')
      }
    }
  }, [schedules, scheduleId])

  const currentSchedule = schedules.find((s) => s.id === scheduleId)

  const handleSaveEmail = async () => {
    setEmailError('')
    setEmailSaved(false)
    const trimmed = email.trim()
    if (!trimmed) { setEmailError('Email is required.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setEmailError('Invalid email format.'); return }
    localStorage.setItem(EMAIL_KEY, trimmed)

    let watchlistTickers: string[] = []
    try {
      const stored = localStorage.getItem(WATCHLIST_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          watchlistTickers = parsed.map((w: { ticker?: string }) => w?.ticker).filter(Boolean) as string[]
        }
      }
    } catch {}
    const tickerStr = watchlistTickers.length > 0 ? watchlistTickers.join(', ') : 'AAPL, TSLA, GOOGL, MSFT, AMZN'
    const newMsg = `Analyze the following tickers: ${tickerStr} and send the report to ${trimmed}`

    setScheduleLoading(true)
    setScheduleMsg('')
    const result = await updateScheduleMessage(scheduleId, newMsg)
    if (result.success && result.newScheduleId) {
      setScheduleId(result.newScheduleId)
      setEmailSaved(true)
      setScheduleMsg('Email synced with schedule.')
      await fetchSchedules()
    } else {
      setScheduleMsg(result.error ?? 'Failed to update schedule.')
    }
    setScheduleLoading(false)
  }

  const handleToggleSchedule = async () => {
    if (!currentSchedule) return
    if (!isActive && !email.trim()) {
      setScheduleMsg('Save a recipient email before activating the schedule.')
      return
    }
    setScheduleLoading(true)
    setScheduleMsg('')
    const result = await toggleSchedule(currentSchedule)
    if (result.success) {
      setScheduleMsg(isActive ? 'Schedule paused.' : 'Schedule activated.')
    } else {
      setScheduleMsg('Failed to toggle schedule.')
    }
    await fetchSchedules()
    setScheduleLoading(false)
  }

  const handleTriggerNow = async () => {
    setTriggerMsg('')
    setScheduleLoading(true)
    const result = await trigger(scheduleId)
    setTriggerMsg(result.success ? 'Triggered successfully. Check Email History.' : (result.error ?? 'Trigger failed.'))
    setScheduleLoading(false)
  }

  const handleSavePrefs = () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
    setPrefsSaved(true)
    setTimeout(() => setPrefsSaved(false), 2000)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-lg font-bold tracking-tight text-foreground">Settings</h1>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><FiMail className="w-4 h-4" /> Email Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Recipient Email</Label>
            <div className="flex gap-2 mt-1">
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailSaved(false); setEmailError('') }}
                className="bg-input border-border text-foreground text-sm"
              />
              <Button onClick={handleSaveEmail} size="sm" disabled={scheduleLoading} className="bg-[hsl(220,80%,55%)] hover:bg-[hsl(220,80%,48%)] text-white">
                <FiSave className="w-3.5 h-3.5 mr-1" /> Save
              </Button>
            </div>
            {emailError && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><FiAlertCircle className="w-3 h-3" /> {emailError}</p>}
            {emailSaved && <p className="text-xs text-[hsl(160,70%,45%)] mt-1 flex items-center gap-1"><FiCheckCircle className="w-3 h-3" /> Email saved and synced.</p>}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><FiClock className="w-4 h-4" /> Schedule Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-foreground">Daily Report Schedule</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {currentSchedule?.cron_expression ? cronToHuman(currentSchedule.cron_expression) : 'Every day at 8:00'} (America/New_York)
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={isActive ? 'default' : 'secondary'} className={`text-[10px] ${isActive ? 'bg-[hsl(160,70%,45%)] text-white' : 'bg-secondary text-muted-foreground'}`}>
                {isActive ? 'Active' : 'Paused'}
              </Badge>
              <Switch
                checked={isActive}
                onCheckedChange={handleToggleSchedule}
                disabled={scheduleLoading || loading}
              />
            </div>
          </div>

          {!isActive && !email.trim() && (
            <div className="bg-[hsl(35,85%,55%)]/10 border border-[hsl(35,85%,55%)]/30 px-3 py-2 rounded">
              <p className="text-xs text-[hsl(35,85%,55%)]">Save a recipient email above before activating the schedule.</p>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {currentSchedule?.next_run_time && (
              <span>Next run: {new Date(currentSchedule.next_run_time).toLocaleString()}</span>
            )}
          </div>

          <Button onClick={handleTriggerNow} variant="outline" size="sm" disabled={scheduleLoading} className="border-border text-foreground text-xs">
            <FiPlay className="w-3 h-3 mr-1" /> Trigger Now
          </Button>
          {scheduleMsg && <p className="text-xs text-muted-foreground">{scheduleMsg}</p>}
          {triggerMsg && <p className="text-xs text-muted-foreground">{triggerMsg}</p>}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><FiSliders className="w-4 h-4" /> Analysis Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Show RSI Analysis</Label>
            <Switch checked={prefs.rsi} onCheckedChange={(v) => setPrefs((p) => ({ ...p, rsi: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Show Moving Averages</Label>
            <Switch checked={prefs.ma} onCheckedChange={(v) => setPrefs((p) => ({ ...p, ma: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Show Sentiment Analysis</Label>
            <Switch checked={prefs.sentiment} onCheckedChange={(v) => setPrefs((p) => ({ ...p, sentiment: v }))} />
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <Label className="text-xs text-muted-foreground">RSI Overbought Threshold</Label>
              <Input
                type="number"
                value={prefs.overboughtThreshold}
                onChange={(e) => setPrefs((p) => ({ ...p, overboughtThreshold: Number(e.target.value) || 70 }))}
                className="bg-input border-border text-foreground text-sm mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">RSI Oversold Threshold</Label>
              <Input
                type="number"
                value={prefs.oversoldThreshold}
                onChange={(e) => setPrefs((p) => ({ ...p, oversoldThreshold: Number(e.target.value) || 30 }))}
                className="bg-input border-border text-foreground text-sm mt-1"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSavePrefs} size="sm" className="bg-[hsl(220,80%,55%)] hover:bg-[hsl(220,80%,48%)] text-white">
              <FiSave className="w-3.5 h-3.5 mr-1" /> Save Preferences
            </Button>
            {prefsSaved && <span className="text-xs text-[hsl(160,70%,45%)]">Saved</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
