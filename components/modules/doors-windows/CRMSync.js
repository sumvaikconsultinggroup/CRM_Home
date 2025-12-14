'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Cloud, RefreshCw, CheckCircle2, Clock, AlertTriangle,
  Link2, Users, Building2, Loader2, ArrowUpRight, Calendar,
  FileText, FolderKanban
} from 'lucide-react'
import { toast } from 'sonner'

const API_BASE = '/api/modules/doors-windows'

export function CRMSync({ crmSyncStatus, syncing, onSync, projects, headers, glassStyles }) {
  const [selectedItems, setSelectedItems] = useState([])

  const lastSyncTime = crmSyncStatus?.lastSync 
    ? new Date(crmSyncStatus.lastSync).toLocaleString()
    : 'Never'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">CRM Synchronization</h2>
          <p className="text-slate-500">Sync projects and leads with your CRM system</p>
        </div>
        <Button
          onClick={onSync}
          disabled={syncing}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
        >
          {syncing ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Syncing...</>
          ) : (
            <><Cloud className="h-4 w-4 mr-2" /> Sync Now</>
          )}
        </Button>
      </div>

      {/* Sync Status Card */}
      <Card className={glassStyles?.card}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-indigo-600" />
            Sync Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-slate-500">Last Sync</span>
              </div>
              <p className="font-semibold text-slate-800">{lastSyncTime}</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-sm text-emerald-600">Synced Items</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600">
                {crmSyncStatus?.syncedCount || 0}
              </p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-amber-600">Pending Sync</span>
              </div>
              <p className="text-2xl font-bold text-amber-600">
                {crmSyncStatus?.pendingCount || projects?.filter(p => !p.crmSynced)?.length || 0}
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FolderKanban className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-600">Total Projects</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {projects?.length || 0}
              </p>
            </div>
          </div>

          {syncing && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Sync in progress...</span>
                <span className="text-sm text-slate-500">Please wait</span>
              </div>
              <Progress value={66} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Projects Sync Status */}
      <Card className={glassStyles?.card}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-purple-600" />
            Projects Sync Status
          </CardTitle>
          <CardDescription>View and manage CRM sync for individual projects</CardDescription>
        </CardHeader>
        <CardContent>
          {projects?.length === 0 ? (
            <div className="text-center py-8">
              <FolderKanban className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No projects to sync</p>
            </div>
          ) : (
            <div className="space-y-3">
              {projects?.map(project => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${
                      project.crmSynced ? 'bg-emerald-100' : 'bg-amber-100'
                    }`}>
                      {project.crmSynced ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <Clock className="h-5 w-5 text-amber-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-800">
                        {project.name || project.siteName}
                      </h4>
                      <p className="text-sm text-slate-500">
                        {project.contactPerson || 'No contact'} • {project.buildingType || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={project.crmSynced ? 'default' : 'secondary'}>
                      {project.crmSynced ? 'Synced' : 'Pending'}
                    </Badge>
                    {project.crmSyncedAt && (
                      <span className="text-xs text-slate-400">
                        {new Date(project.crmSyncedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CRM Integration Info */}
      <Card className={`${glassStyles?.card} border-dashed`}>
        <CardContent className="py-8">
          <div className="text-center">
            <div className="p-4 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 w-fit mx-auto mb-4">
              <Cloud className="h-10 w-10 text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">CRM Integration</h3>
            <p className="text-slate-500 max-w-md mx-auto mb-4">
              Automatically sync your projects, leads, and quotations with your existing CRM system. 
              Keep all your customer data in one place.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Badge variant="outline" className="py-1">
                <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-500" /> Auto-sync enabled
              </Badge>
              <Badge variant="outline" className="py-1">
                <RefreshCw className="h-3 w-3 mr-1 text-blue-500" /> Real-time updates
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
