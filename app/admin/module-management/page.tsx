'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useModuleVisibility, ModuleConfig } from '@/lib/moduleVisibility'
import { Shield, Save, RefreshCw } from 'lucide-react'

export default function ModuleManagementPage() {
  const { backendUser, loading } = useAuth()
  const router = useRouter()
  const { modules, loading: modulesLoading, refresh, isModuleVisible } = useModuleVisibility()
  const [saving, setSaving] = useState(false)
  const [localState, setLocalState] = useState<Map<string, { isEnabled: boolean; isVisible: boolean }>>(new Map())
  const [hasChanges, setHasChanges] = useState(false)

  const isSuperAdmin = backendUser && (
    backendUser.role === 'SUPER_ADMIN' ||
    (backendUser as any).isSuperAdmin === true ||
    (backendUser as any).permissions?.includes('MANAGE_MODULES')
  )

  useEffect(() => {
    if (!loading && !isSuperAdmin) {
      router.push('/dashboard/student')
    }
  }, [backendUser, loading, isSuperAdmin, router])

  useEffect(() => {
    if (modules.size > 0 && localState.size === 0) {
      const state = new Map<string, { isEnabled: boolean; isVisible: boolean }>()
      modules.forEach((config, key) => {
        state.set(key, { isEnabled: config.isEnabled, isVisible: config.isVisible })
      })
      setLocalState(state)
    }
  }, [modules, localState.size])

  const handleToggle = (key: string, field: 'isEnabled' | 'isVisible', value: boolean) => {
    setLocalState(prev => {
      const next = new Map(prev)
      const current = next.get(key) || { isEnabled: true, isVisible: true }
      next.set(key, { ...current, [field]: value })
      return next
    })
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('backendToken')
      const updates = Array.from(localState.entries()).map(([key, state]) => ({
        key,
        ...state,
      }))

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5003';
      const res = await fetch(`${API_BASE_URL}/api/module-visibility/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ updates }),
      })

      if (res.ok) {
        await refresh()
        setHasChanges(false)
      }
    } catch (error) {
      console.error('Failed to save module visibility:', error)
    } finally {
      setSaving(false)
    }
  }

  const categories = Array.from(new Set(Array.from(modules.values()).map(m => m.category))).sort()

  if (loading || modulesLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-400 border-opacity-50" />
      </div>
    )
  }

  if (!isSuperAdmin) {
    return null
  }

  const sortedModules = Array.from(modules.values()).sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <Shield className="h-8 w-8 text-emerald-400" />
                Module Management
              </h1>
              <p className="text-slate-400">Enable, disable, and control visibility of platform modules</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>

        {hasChanges && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-sm">
            You have unsaved changes. Click "Save Changes" to apply them immediately.
          </div>
        )}

        {categories.map(category => (
          <Card key={category} className="bg-slate-800/50 backdrop-blur-sm border-slate-700 mb-6">
            <CardHeader>
              <CardTitle className="text-white capitalize">{category}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sortedModules
                  .filter(m => m.category === category)
                  .map(module => {
                    const local = localState.get(module.key) || { isEnabled: module.isEnabled, isVisible: module.isVisible }
                    const isChanged = local.isEnabled !== module.isEnabled || local.isVisible !== module.isVisible

                    return (
                      <div
                        key={module.key}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          isChanged ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-slate-700/30 border-slate-700/50'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-white font-medium">{module.name}</span>
                            <Badge variant="outline" className="text-slate-400 border-slate-600 font-mono text-xs">
                              {module.key}
                            </Badge>
                            {isChanged && (
                              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                                Modified
                              </Badge>
                            )}
                          </div>
                          {module.description && (
                            <p className="text-slate-400 text-sm mt-1">{module.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-6 ml-4">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-sm">Visible</span>
                            <Switch
                              checked={local.isVisible}
                              onCheckedChange={(checked) => handleToggle(module.key, 'isVisible', checked)}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-sm">Enabled</span>
                            <Switch
                              checked={local.isEnabled}
                              onCheckedChange={(checked) => handleToggle(module.key, 'isEnabled', checked)}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
