'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { callAIAgent } from '@/lib/aiAgent'
import { FiPlay, FiSend, FiRefreshCw, FiMessageSquare, FiBarChart2 } from 'react-icons/fi'

const COORDINATOR_ID = '69a282d9e558069e826f0464'
const QA_AGENT_ID = '69a282b5e558069e826f0462'
const WATCHLIST_KEY = 'morningAlpha_watchlist'
const EMAIL_KEY = 'morningAlpha_email'
const RESULTS_KEY = 'morningAlpha_analysisResults'

interface TechnicalData {
  ticker?: string
  close_price?: number
  previous_close?: number
  delta?: number
  delta_percent?: number
  volume?: number
  fifty_two_week_high?: number
  fifty_two_week_low?: number
  rsi_value?: number
  rsi_signal?: string
  ma_50?: number
  ma_200?: number
  ma_crossover?: string
  support_level?: number
  resistance_level?: number
  summary?: string
}

interface SentimentData {
  ticker?: string
  sentiment?: string
  sentiment_score?: number
  catalysts?: string[]
  headlines?: { title?: string; source?: string }[]
  vibe_check?: string
}

interface StockAnalysis {
  technical?: TechnicalData
  sentiment?: SentimentData
}

interface CoordinatorResult {
  report_date?: string
  tickers_analyzed?: string[]
  overall_market_mood?: string
  email_sent?: boolean
  email_recipient?: string
  report_summary?: string
  analyses?: StockAnalysis[]
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  data_points?: { metric?: string; value?: string; context?: string }[]
  stocks_mentioned?: string[]
  recommendation?: string
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-1">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-xs mt-2 mb-0.5">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-sm mt-2 mb-0.5">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-sm mt-3 mb-1">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) {
          const parts = line.slice(2).split(/\*\*(.*?)\*\*/g)
          return (
            <li key={i} className="ml-4 list-disc text-xs">
              {parts.length === 1 ? line.slice(2) : parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="font-semibold">{p}</strong> : p)}
            </li>
          )
        }
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-xs">{line.replace(/^\d+\.\s/, '')}</li>
        if (!line.trim()) return <div key={i} className="h-0.5" />
        const parts = line.split(/\*\*(.*?)\*\*/g)
        return (
          <p key={i} className="text-xs">
            {parts.length === 1 ? line : parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="font-semibold">{p}</strong> : p)}
          </p>
        )
      })}
    </div>
  )
}

function getSentimentColor(sentiment?: string): string {
  if (!sentiment) return 'text-[hsl(35,85%,55%)]'
  const s = sentiment.toLowerCase()
  if (s.includes('bullish') || s.includes('positive')) return 'text-[hsl(160,70%,45%)]'
  if (s.includes('bearish') || s.includes('negative')) return 'text-destructive'
  return 'text-[hsl(35,85%,55%)]'
}

function getSentimentBg(sentiment?: string): string {
  if (!sentiment) return 'bg-[hsl(35,85%,55%)]/15 text-[hsl(35,85%,55%)]'
  const s = sentiment.toLowerCase()
  if (s.includes('bullish') || s.includes('positive')) return 'bg-[hsl(160,70%,45%)]/15 text-[hsl(160,70%,45%)]'
  if (s.includes('bearish') || s.includes('negative')) return 'bg-destructive/15 text-destructive'
  return 'bg-[hsl(35,85%,55%)]/15 text-[hsl(35,85%,55%)]'
}

function getRsiColor(val?: number): string {
  if (val == null) return 'text-muted-foreground'
  if (val < 30) return 'text-[hsl(160,70%,45%)]'
  if (val > 70) return 'text-destructive'
  return 'text-[hsl(35,85%,55%)]'
}

// Sample data for demonstration
const SAMPLE_ANALYSES: StockAnalysis[] = [
  {
    technical: { ticker: 'AAPL', close_price: 185.50, previous_close: 184.20, delta: 1.30, delta_percent: 0.71, volume: 52000000, fifty_two_week_high: 199.62, fifty_two_week_low: 124.17, rsi_value: 58.3, rsi_signal: 'Neutral', ma_50: 180.25, ma_200: 172.40, ma_crossover: 'Golden Cross', support_level: 182.00, resistance_level: 190.00, summary: 'AAPL showing steady upward momentum with Golden Cross confirmation. RSI is neutral at 58.3, suggesting room for further upside.' },
    sentiment: { ticker: 'AAPL', sentiment: 'Bullish', sentiment_score: 7, catalysts: ['Strong Q4 earnings beat', 'AI features launch'], headlines: [{ title: 'Apple Reports Record Revenue', source: 'Reuters' }, { title: 'Apple AI Strategy Gains Traction', source: 'Bloomberg' }], vibe_check: 'Market enthusiasm high following strong earnings and AI product announcements.' },
  },
  {
    technical: { ticker: 'TSLA', close_price: 248.42, previous_close: 252.10, delta: -3.68, delta_percent: -1.46, volume: 78000000, fifty_two_week_high: 299.29, fifty_two_week_low: 138.80, rsi_value: 42.1, rsi_signal: 'Neutral', ma_50: 255.30, ma_200: 220.15, ma_crossover: 'None', support_level: 240.00, resistance_level: 260.00, summary: 'TSLA trading below 50-day MA with slight bearish pressure. Volume elevated suggesting active selling.' },
    sentiment: { ticker: 'TSLA', sentiment: 'Neutral', sentiment_score: 5, catalysts: ['Cybertruck deliveries ramp', 'Competition intensifying'], headlines: [{ title: 'Tesla Faces Margin Pressure', source: 'CNBC' }, { title: 'Cybertruck Production Hits Record', source: 'Electrek' }], vibe_check: 'Mixed signals as production milestones offset by margin concerns.' },
  },
  {
    technical: { ticker: 'GOOGL', close_price: 141.80, previous_close: 139.50, delta: 2.30, delta_percent: 1.65, volume: 28000000, fifty_two_week_high: 153.78, fifty_two_week_low: 115.83, rsi_value: 65.7, rsi_signal: 'Neutral', ma_50: 138.20, ma_200: 131.50, ma_crossover: 'Golden Cross', support_level: 138.00, resistance_level: 145.00, summary: 'GOOGL showing strength with 1.65% gain. RSI approaching overbought territory but Golden Cross intact.' },
    sentiment: { ticker: 'GOOGL', sentiment: 'Bullish', sentiment_score: 8, catalysts: ['Gemini AI momentum', 'Cloud revenue growth'], headlines: [{ title: 'Google Cloud Hits New Revenue Record', source: 'Reuters' }, { title: 'Gemini 2.0 Launch Gets Positive Reviews', source: 'TechCrunch' }], vibe_check: 'Strong bullish sentiment driven by AI leadership and cloud growth.' },
  },
  {
    technical: { ticker: 'MSFT', close_price: 415.30, previous_close: 413.80, delta: 1.50, delta_percent: 0.36, volume: 22000000, fifty_two_week_high: 430.82, fifty_two_week_low: 309.45, rsi_value: 55.2, rsi_signal: 'Neutral', ma_50: 410.50, ma_200: 385.70, ma_crossover: 'Golden Cross', support_level: 408.00, resistance_level: 425.00, summary: 'MSFT maintaining steady uptrend near all-time highs. Low volatility with healthy RSI.' },
    sentiment: { ticker: 'MSFT', sentiment: 'Bullish', sentiment_score: 7, catalysts: ['Azure AI adoption surge', 'Copilot monetization'], headlines: [{ title: 'Microsoft Azure Revenue Jumps 30%', source: 'Bloomberg' }, { title: 'Copilot Subscriptions Exceed Expectations', source: 'WSJ' }], vibe_check: 'Consistently positive outlook backed by enterprise AI adoption.' },
  },
  {
    technical: { ticker: 'AMZN', close_price: 186.50, previous_close: 188.20, delta: -1.70, delta_percent: -0.90, volume: 45000000, fifty_two_week_high: 201.20, fifty_two_week_low: 118.35, rsi_value: 48.9, rsi_signal: 'Neutral', ma_50: 185.80, ma_200: 168.40, ma_crossover: 'Golden Cross', support_level: 183.00, resistance_level: 192.00, summary: 'AMZN pulled back slightly but holding above 50-day MA. RSI near neutral at 48.9.' },
    sentiment: { ticker: 'AMZN', sentiment: 'Neutral', sentiment_score: 6, catalysts: ['AWS growth acceleration', 'Holiday season results pending'], headlines: [{ title: 'Amazon AWS Powers AI Workloads', source: 'Reuters' }, { title: 'Amazon Expands Same-Day Delivery', source: 'CNBC' }], vibe_check: 'Cautiously optimistic with focus on cloud margins and retail efficiency.' },
  },
]

const SAMPLE_COORDINATOR: CoordinatorResult = {
  report_date: new Date().toISOString().split('T')[0],
  tickers_analyzed: ['AAPL', 'TSLA', 'GOOGL', 'MSFT', 'AMZN'],
  overall_market_mood: 'Cautiously Bullish',
  email_sent: true,
  email_recipient: 'user@example.com',
  report_summary: 'Market shows mixed signals today. Tech leaders AAPL, GOOGL, and MSFT demonstrate bullish momentum with Golden Cross patterns. TSLA and AMZN face near-term headwinds but hold key support levels.',
  analyses: SAMPLE_ANALYSES,
}

export default function DashboardSection() {
  const [useSample, setUseSample] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<CoordinatorResult | null>(null)
  const [analyses, setAnalyses] = useState<StockAnalysis[]>([])
  const [runLoading, setRunLoading] = useState(false)
  const [runError, setRunError] = useState('')
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  // Q&A chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RESULTS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed?.analyses) {
          setAnalyses(Array.isArray(parsed.analyses) ? parsed.analyses : [])
          setAnalysisResult(parsed)
          setLastUpdated(parsed?.report_date ?? null)
        }
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (useSample) {
      setAnalyses(SAMPLE_ANALYSES)
      setAnalysisResult(SAMPLE_COORDINATOR)
      setLastUpdated(SAMPLE_COORDINATOR.report_date ?? null)
    } else {
      try {
        const stored = localStorage.getItem(RESULTS_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          setAnalyses(Array.isArray(parsed?.analyses) ? parsed.analyses : [])
          setAnalysisResult(parsed)
          setLastUpdated(parsed?.report_date ?? null)
        } else {
          setAnalyses([])
          setAnalysisResult(null)
          setLastUpdated(null)
        }
      } catch {
        setAnalyses([])
        setAnalysisResult(null)
      }
    }
  }, [useSample])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const getWatchlist = (): string[] => {
    try {
      const stored = localStorage.getItem(WATCHLIST_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) return parsed.map((w: { ticker?: string }) => w?.ticker).filter(Boolean) as string[]
      }
    } catch {}
    return ['AAPL', 'TSLA', 'GOOGL', 'MSFT', 'AMZN']
  }

  const handleRunNow = async () => {
    setRunLoading(true)
    setRunError('')
    setActiveAgentId(COORDINATOR_ID)
    const tickers = getWatchlist()
    const emailVal = localStorage.getItem(EMAIL_KEY) ?? ''
    const msg = emailVal
      ? `Analyze the following tickers: ${tickers.join(', ')} and send the report to ${emailVal}`
      : `Analyze the following tickers: ${tickers.join(', ')}`

    try {
      const result = await callAIAgent(msg, COORDINATOR_ID)
      if (result.success) {
        let data = result?.response?.result
        if (typeof data === 'string') { try { data = JSON.parse(data) } catch {} }
        const coordResult: CoordinatorResult = {
          report_date: data?.report_date ?? new Date().toISOString().split('T')[0],
          tickers_analyzed: Array.isArray(data?.tickers_analyzed) ? data.tickers_analyzed : tickers,
          overall_market_mood: data?.overall_market_mood ?? '',
          email_sent: data?.email_sent ?? false,
          email_recipient: data?.email_recipient ?? '',
          report_summary: data?.report_summary ?? '',
          analyses: Array.isArray(data?.analyses) ? data.analyses : [],
        }
        setAnalysisResult(coordResult)
        setAnalyses(Array.isArray(coordResult.analyses) ? coordResult.analyses : [])
        setLastUpdated(coordResult.report_date ?? null)
        localStorage.setItem(RESULTS_KEY, JSON.stringify(coordResult))
      } else {
        setRunError(result?.error ?? 'Analysis failed.')
      }
    } catch (e) {
      setRunError('Network error running analysis.')
    }
    setActiveAgentId(null)
    setRunLoading(false)
  }

  const handleChatSend = async () => {
    const msg = chatInput.trim()
    if (!msg) return
    setChatInput('')
    setChatMessages((prev) => [...prev, { role: 'user', content: msg }])
    setChatLoading(true)
    setActiveAgentId(QA_AGENT_ID)

    try {
      const result = await callAIAgent(msg, QA_AGENT_ID)
      if (result.success) {
        let data = result?.response?.result
        if (typeof data === 'string') { try { data = JSON.parse(data) } catch {} }
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data?.answer ?? data?.text ?? result?.response?.message ?? 'No response.',
            data_points: Array.isArray(data?.data_points) ? data.data_points : [],
            stocks_mentioned: Array.isArray(data?.stocks_mentioned) ? data.stocks_mentioned : [],
            recommendation: data?.recommendation ?? '',
          },
        ])
      } else {
        setChatMessages((prev) => [...prev, { role: 'assistant', content: result?.error ?? 'Error getting response.' }])
      }
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: 'Network error.' }])
    }
    setActiveAgentId(null)
    setChatLoading(false)
  }

  const displayAnalyses = analyses

  return (
    <div className="flex h-full">
      {/* Left column: analysis */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Header bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight text-foreground">Morning Alpha</h1>
            {lastUpdated && (
              <Badge variant="secondary" className="bg-secondary text-muted-foreground text-[10px]">
                Updated: {lastUpdated}
              </Badge>
            )}
            {analysisResult?.overall_market_mood && (
              <Badge className={`text-[10px] ${getSentimentBg(analysisResult.overall_market_mood)}`}>
                {analysisResult.overall_market_mood}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Sample Data</Label>
              <Switch checked={useSample} onCheckedChange={setUseSample} />
            </div>
            <Button onClick={handleRunNow} disabled={runLoading} size="sm" className="bg-[hsl(220,80%,55%)] hover:bg-[hsl(220,80%,48%)] text-white text-xs">
              {runLoading ? <FiRefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <FiPlay className="w-3.5 h-3.5 mr-1.5" />}
              {runLoading ? 'Analyzing...' : 'Run Now'}
            </Button>
          </div>
        </div>

        {runError && (
          <div className="bg-destructive/10 border border-destructive/30 px-3 py-2 rounded text-xs text-destructive">{runError}</div>
        )}

        {analysisResult?.report_summary && (
          <Card className="bg-card border-border">
            <CardContent className="py-3 px-4">
              <p className="text-xs text-muted-foreground mb-1 font-medium">Report Summary</p>
              <div className="text-xs text-foreground leading-relaxed">{renderMarkdown(analysisResult.report_summary)}</div>
            </CardContent>
          </Card>
        )}

        {displayAnalyses.length === 0 && !runLoading ? (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <FiBarChart2 className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No analysis data yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Click "Run Now" or toggle Sample Data to see results.</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="cards" className="w-full">
            <TabsList className="bg-secondary border border-border h-8">
              <TabsTrigger value="cards" className="text-xs h-6 data-[state=active]:bg-card">Cards</TabsTrigger>
              <TabsTrigger value="table" className="text-xs h-6 data-[state=active]:bg-card">Table</TabsTrigger>
            </TabsList>

            <TabsContent value="cards" className="mt-3">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {displayAnalyses.map((a, idx) => {
                  const t = a?.technical
                  const s = a?.sentiment
                  const ticker = t?.ticker ?? s?.ticker ?? `Stock ${idx + 1}`
                  const deltaPositive = (t?.delta ?? 0) >= 0
                  return (
                    <Card key={ticker} className="bg-card border-border">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-foreground">{ticker}</span>
                            {s?.sentiment && (
                              <Badge className={`text-[10px] px-1.5 py-0 ${getSentimentBg(s.sentiment)}`}>{s.sentiment}</Badge>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-foreground">${t?.close_price?.toFixed(2) ?? '--'}</span>
                            <span className={`text-xs ml-2 ${deltaPositive ? 'text-[hsl(160,70%,45%)]' : 'text-destructive'}`}>
                              {deltaPositive ? '+' : ''}{t?.delta?.toFixed(2) ?? '0.00'} ({deltaPositive ? '+' : ''}{t?.delta_percent?.toFixed(2) ?? '0.00'}%)
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-secondary/50 rounded px-2 py-1.5">
                            <p className="text-[10px] text-muted-foreground">RSI</p>
                            <p className={`text-xs font-bold ${getRsiColor(t?.rsi_value)}`}>{t?.rsi_value?.toFixed(1) ?? '--'}</p>
                            <p className="text-[9px] text-muted-foreground">{t?.rsi_signal ?? ''}</p>
                          </div>
                          <div className="bg-secondary/50 rounded px-2 py-1.5">
                            <p className="text-[10px] text-muted-foreground">MA Cross</p>
                            <p className={`text-xs font-bold ${t?.ma_crossover === 'Golden Cross' ? 'text-[hsl(160,70%,45%)]' : t?.ma_crossover === 'Death Cross' ? 'text-destructive' : 'text-muted-foreground'}`}>
                              {t?.ma_crossover ?? 'None'}
                            </p>
                          </div>
                          <div className="bg-secondary/50 rounded px-2 py-1.5">
                            <p className="text-[10px] text-muted-foreground">Volume</p>
                            <p className="text-xs font-bold text-foreground">
                              {t?.volume ? `${(t.volume / 1000000).toFixed(1)}M` : '--'}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <div className="flex justify-between"><span className="text-muted-foreground">52W High</span><span className="text-foreground">${t?.fifty_two_week_high?.toFixed(2) ?? '--'}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">52W Low</span><span className="text-foreground">${t?.fifty_two_week_low?.toFixed(2) ?? '--'}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">MA 50</span><span className="text-foreground">${t?.ma_50?.toFixed(2) ?? '--'}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">MA 200</span><span className="text-foreground">${t?.ma_200?.toFixed(2) ?? '--'}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Support</span><span className="text-[hsl(160,70%,45%)]">${t?.support_level?.toFixed(2) ?? '--'}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Resistance</span><span className="text-destructive">${t?.resistance_level?.toFixed(2) ?? '--'}</span></div>
                        </div>

                        {t?.summary && (
                          <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-2">{t.summary}</p>
                        )}

                        {Array.isArray(s?.catalysts) && s.catalysts.length > 0 && (
                          <div className="border-t border-border pt-2">
                            <p className="text-[10px] text-muted-foreground mb-1 font-medium">Catalysts</p>
                            <div className="flex flex-wrap gap-1">
                              {s.catalysts.map((c, ci) => (
                                <Badge key={ci} variant="secondary" className="text-[9px] bg-secondary text-secondary-foreground">{c}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {Array.isArray(s?.headlines) && s.headlines.length > 0 && (
                          <div className="border-t border-border pt-2">
                            <p className="text-[10px] text-muted-foreground mb-1 font-medium">Headlines</p>
                            {s.headlines.map((h, hi) => (
                              <p key={hi} className="text-[10px] text-foreground">{h?.title ?? ''} <span className="text-muted-foreground">- {h?.source ?? ''}</span></p>
                            ))}
                          </div>
                        )}

                        {s?.vibe_check && (
                          <p className={`text-[10px] italic border-t border-border pt-2 ${getSentimentColor(s.sentiment)}`}>{s.vibe_check}</p>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>

            <TabsContent value="table" className="mt-3">
              <Card className="bg-card border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-secondary/40">
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium">Ticker</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">Price</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">Change %</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">RSI</th>
                        <th className="text-center py-2 px-3 text-muted-foreground font-medium">Sentiment</th>
                        <th className="text-center py-2 px-3 text-muted-foreground font-medium">MA Cross</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium">Volume</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayAnalyses.map((a, idx) => {
                        const t = a?.technical
                        const s = a?.sentiment
                        const ticker = t?.ticker ?? s?.ticker ?? `Stock ${idx + 1}`
                        const dp = (t?.delta_percent ?? 0)
                        return (
                          <tr key={ticker} className="border-b border-border hover:bg-secondary/20 transition-colors">
                            <td className="py-2 px-3 font-bold text-foreground">{ticker}</td>
                            <td className="py-2 px-3 text-right text-foreground">${t?.close_price?.toFixed(2) ?? '--'}</td>
                            <td className={`py-2 px-3 text-right font-medium ${dp >= 0 ? 'text-[hsl(160,70%,45%)]' : 'text-destructive'}`}>
                              {dp >= 0 ? '+' : ''}{dp.toFixed(2)}%
                            </td>
                            <td className={`py-2 px-3 text-right font-medium ${getRsiColor(t?.rsi_value)}`}>{t?.rsi_value?.toFixed(1) ?? '--'}</td>
                            <td className="py-2 px-3 text-center">
                              <Badge className={`text-[9px] px-1 py-0 ${getSentimentBg(s?.sentiment)}`}>{s?.sentiment ?? '--'}</Badge>
                            </td>
                            <td className={`py-2 px-3 text-center ${t?.ma_crossover === 'Golden Cross' ? 'text-[hsl(160,70%,45%)]' : t?.ma_crossover === 'Death Cross' ? 'text-destructive' : 'text-muted-foreground'}`}>
                              {t?.ma_crossover ?? 'None'}
                            </td>
                            <td className="py-2 px-3 text-right text-foreground">{t?.volume ? `${(t.volume / 1000000).toFixed(1)}M` : '--'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Agent status */}
        <Card className="bg-card border-border">
          <CardContent className="py-2.5 px-4">
            <p className="text-[10px] text-muted-foreground font-medium mb-1.5">Agent Status</p>
            <div className="flex flex-wrap gap-3 text-[10px]">
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${activeAgentId === COORDINATOR_ID ? 'bg-[hsl(160,70%,45%)] animate-pulse' : 'bg-muted-foreground'}`} />
                <span className="text-muted-foreground">Coordinator</span>
              </span>
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${activeAgentId === COORDINATOR_ID ? 'bg-[hsl(35,85%,55%)] animate-pulse' : 'bg-muted-foreground'}`} />
                <span className="text-muted-foreground">Technical</span>
              </span>
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${activeAgentId === COORDINATOR_ID ? 'bg-[hsl(35,85%,55%)] animate-pulse' : 'bg-muted-foreground'}`} />
                <span className="text-muted-foreground">Sentiment</span>
              </span>
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${activeAgentId === QA_AGENT_ID ? 'bg-[hsl(160,70%,45%)] animate-pulse' : 'bg-muted-foreground'}`} />
                <span className="text-muted-foreground">Q&A</span>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right column: Q&A chat */}
      <div className="w-[340px] border-l border-border flex flex-col bg-card h-full">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <FiMessageSquare className="w-3.5 h-3.5 text-[hsl(220,80%,55%)]" /> Dashboard Q&A
          </h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">Ask anything about your watchlist</p>
        </div>

        <ScrollArea className="flex-1 px-4 py-3">
          <div className="space-y-3">
            {chatMessages.length === 0 && (
              <div className="text-center py-6">
                <FiMessageSquare className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">Ask a question about stocks in your watchlist.</p>
                <div className="mt-3 space-y-1.5">
                  {['Which stock has the best momentum?', 'Compare AAPL vs MSFT', 'What are the top catalysts today?'].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setChatInput(q) }}
                      className="block w-full text-left text-[10px] text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded px-2.5 py-1.5 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatMessages.map((m, i) => (
              <div key={i} className={`${m.role === 'user' ? 'text-right' : ''}`}>
                <div className={`inline-block max-w-[90%] text-left rounded px-3 py-2 ${m.role === 'user' ? 'bg-[hsl(220,80%,55%)] text-white' : 'bg-secondary text-foreground'}`}>
                  <div className="text-xs leading-relaxed">{renderMarkdown(m.content)}</div>
                  {Array.isArray(m.data_points) && m.data_points.length > 0 && (
                    <div className="mt-2 border-t border-border/30 pt-1.5 space-y-1">
                      {m.data_points.map((dp, di) => (
                        <div key={di} className="text-[10px]">
                          <span className="font-medium">{dp?.metric ?? ''}: </span>
                          <span>{dp?.value ?? ''}</span>
                          {dp?.context && <span className="text-muted-foreground"> ({dp.context})</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {m.recommendation && (
                    <div className="mt-1.5 border-t border-border/30 pt-1.5">
                      <p className="text-[10px] font-medium text-[hsl(160,70%,45%)]">{m.recommendation}</p>
                    </div>
                  )}
                  {Array.isArray(m.stocks_mentioned) && m.stocks_mentioned.length > 0 && (
                    <div className="mt-1 flex gap-1 flex-wrap">
                      {m.stocks_mentioned.map((s, si) => (
                        <Badge key={si} variant="secondary" className="text-[8px] bg-secondary/60 text-muted-foreground px-1 py-0">{s}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FiRefreshCw className="w-3 h-3 animate-spin" /> Thinking...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-border">
          <div className="flex gap-2">
            <Input
              placeholder="Ask about your stocks..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !chatLoading && handleChatSend()}
              className="bg-input border-border text-foreground text-xs"
              disabled={chatLoading}
            />
            <Button onClick={handleChatSend} disabled={chatLoading || !chatInput.trim()} size="sm" className="bg-[hsl(220,80%,55%)] hover:bg-[hsl(220,80%,48%)] text-white px-3">
              <FiSend className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
