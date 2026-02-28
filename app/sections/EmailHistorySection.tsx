'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getScheduleLogs, type ExecutionLog } from '@/lib/scheduler'
import { FiRefreshCw, FiChevronDown, FiChevronUp, FiCheckCircle, FiXCircle } from 'react-icons/fi'

const SCHEDULE_ID = '69a282de25d4d77f732f15ec'

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-1.5">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-xs mt-2 mb-0.5">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-sm mt-2 mb-0.5">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-sm mt-3 mb-1">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-xs">{line.slice(2)}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-xs">{line.replace(/^\d+\.\s/, '')}</li>
        if (!line.trim()) return <div key={i} className="h-0.5" />
        return <p key={i} className="text-xs">{line}</p>
      })}
    </div>
  )
}

export default function EmailHistorySection() {
  const [logs, setLogs] = useState<ExecutionLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchLogs = async (isInitial = false) => {
    setLoading(true)
    if (!isInitial) setError('')
    try {
      const result = await getScheduleLogs(SCHEDULE_ID, { limit: 50 })
      if (result && result.success) {
        setLogs(Array.isArray(result.executions) ? result.executions : [])
        setError('')
      } else if (result && result.error) {
        // Only show error on manual refresh, not initial load
        if (!isInitial) {
          setError(result.error)
        }
      }
    } catch (e: any) {
      // On initial load, silently fail — schedule may just be new with no logs
      if (!isInitial) {
        setError('Unable to load logs. Click Refresh to retry.')
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    // Defer initial fetch to avoid hydration/timing issues with fetchWrapper
    const timer = setTimeout(() => {
      fetchLogs(true)
    }, 800)
    return () => clearTimeout(timer)
  }, [])

  const parseOutput = (output: string): string => {
    if (!output) return ''
    try {
      const parsed = JSON.parse(output)
      return parsed?.report_summary ?? parsed?.message ?? JSON.stringify(parsed, null, 2)
    } catch {
      return output
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">Email History</h1>
          <p className="text-xs text-muted-foreground mt-1">Scheduled execution logs for the Morning Alpha report.</p>
        </div>
        <Button onClick={() => fetchLogs(false)} disabled={loading} variant="outline" size="sm" className="border-border text-foreground text-xs">
          <FiRefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {error && (
        <Card className="bg-card border-destructive">
          <CardContent className="py-3">
            <p className="text-xs text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Execution Logs ({logs.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && logs.length === 0 ? (
            <div className="py-8 text-center">
              <FiRefreshCw className="w-5 h-5 animate-spin mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Loading logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">No execution logs found.</p>
          ) : (
            <ScrollArea className="max-h-[calc(100vh-220px)]">
              <div className="divide-y divide-border">
                {logs.map((log) => {
                  const isExpanded = expandedId === log.id
                  return (
                    <div key={log.id}>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        className="flex items-center justify-between w-full px-4 py-3 hover:bg-secondary/30 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          {log.success ? (
                            <FiCheckCircle className="w-4 h-4 text-[hsl(160,70%,45%)] flex-shrink-0" />
                          ) : (
                            <FiXCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                          )}
                          <div>
                            <p className="text-xs font-medium text-foreground">
                              Morning Alpha Report
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(log.executed_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={log.success ? 'secondary' : 'destructive'} className="text-[10px] px-1.5 py-0">
                            {log.success ? 'Sent' : 'Failed'}
                          </Badge>
                          {isExpanded ? <FiChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <FiChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 bg-secondary/20">
                          <div className="text-xs text-muted-foreground space-y-1 mb-2">
                            <p>Attempt: {log.attempt ?? 1} / {log.max_attempts ?? 1}</p>
                            {log.error_message && <p className="text-destructive">Error: {log.error_message}</p>}
                          </div>
                          <div className="bg-card border border-border p-3 rounded text-foreground">
                            {renderMarkdown(parseOutput(log.response_output))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
