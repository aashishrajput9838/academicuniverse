'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Calendar, Clock, FileText, Eye, Download, AlertTriangle, CheckCircle } from 'lucide-react'

export default function AdminTimetableStatusPage() {
  const { backendUser, loading } = useAuth()
  const router = useRouter()
  const [timetables, setTimetables] = useState<any[]>([])
  const [sections, setSections] = useState<any[]>([])

  // Check if user is admin
  useEffect(() => {
    if (!loading && backendUser) {
      const isAdmin = (
        backendUser.role === 'ADMIN' ||
        backendUser.role === 'SUPER_ADMIN' ||
        (backendUser as any).permissions?.includes('MANAGE_USERS')
      );

      if (!isAdmin) {
        router.push('/dashboard/student') // Redirect to student dashboard if not admin
      }
    }
  }, [backendUser, loading, router])

  // Fetch timetables and sections from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('authToken');

        // 1. Fetch available sections
        const sectionsRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/api/sections`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const sectionsData = await sectionsRes.json();
        let loadedSections: any[] = [];

        if (sectionsData.success) {
          loadedSections = sectionsData.data.map((s: any) => ({
            id: s._id,
            sectionName: s.name,
            courseId: s.courseId
          }));
          setSections(loadedSections);
        }

        // 2. Fetch timetable status for each section
        // Note: In an ideal scenario, the backend would have a combined `/api/timetables` route 
        // to return all timetables at once. Given current routes, we fetch per section.
        const timetableList: any[] = [];
        for (const section of loadedSections) {
          const tsRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/api/timetable/status/${section.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const tsData = await tsRes.json();

          if (tsData.success && tsData.data.hasTimetable) {
            timetableList.push({
              id: section.id, // using section ID as key
              sectionId: section.id,
              fileName: tsData.data.fileName,
              uploadedBy: 'N/A', // Needs a populated uploadedBy field in backend
              uploadDate: tsData.data.uploadTime,
              status: 'pending', // Simulated status (needs schema extension for approval workflow)
              fileSize: 'Unknown' // Not tracked in current schema
            });
          }
        }
        setTimetables(timetableList);

      } catch (err) {
        console.error('Error fetching timetable status:', err);
      }
    };

    if (backendUser) {
      fetchData();
    }
  }, [backendUser]);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default'
      case 'pending': return 'secondary'
      case 'rejected': return 'destructive'
      default: return 'outline'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />
      case 'rejected': return <AlertTriangle className="h-4 w-4 text-red-500" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-400 border-opacity-50" />
      </div>
    )
  }

  const isAdmin = backendUser && (
    backendUser.role === 'ADMIN' ||
    backendUser.role === 'SUPER_ADMIN' ||
    (backendUser as any).permissions?.includes('MANAGE_USERS')
  )

  if (!isAdmin) {
    return null // Redirect will happen via useEffect
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Timetable Status Monitor</h1>
              <p className="text-slate-400">View uploaded timetable status and manage approvals</p>
            </div>
            <div className="inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
              <span>ADMIN</span>
            </div>
          </div>
        </div>

        <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Uploaded Timetables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-300">Section</TableHead>
                  <TableHead className="text-slate-300">File Name</TableHead>
                  <TableHead className="text-slate-300">Uploaded By</TableHead>
                  <TableHead className="text-slate-300">Upload Date</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                  <TableHead className="text-slate-300">Size</TableHead>
                  <TableHead className="text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timetables.map((timetable) => {
                  const section = sections.find(s => s.id === timetable.sectionId)
                  const uploadedByUser = { name: 'Unknown' } // In a real app, this would come from user data

                  return (
                    <TableRow key={timetable.id} className="border-slate-700">
                      <TableCell className="text-white font-medium">
                        {section ? section.sectionName : 'Unknown Section'}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-emerald-400" />
                          {timetable.fileName}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {uploadedByUser.name}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {formatDate(timetable.uploadDate)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(timetable.status)}
                          <Badge variant={getStatusVariant(timetable.status)}>
                            {timetable.status.charAt(0).toUpperCase() + timetable.status.slice(1)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {timetable.fileSize}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-emerald-600 text-emerald-400 hover:bg-emerald-900/20"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Total Timetables</p>
                  <p className="text-2xl font-bold text-white">{timetables.length}</p>
                </div>
                <FileText className="h-8 w-8 text-emerald-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Approved</p>
                  <p className="text-2xl font-bold text-white">
                    {timetables.filter(t => t.status === 'approved').length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Pending</p>
                  <p className="text-2xl font-bold text-white">
                    {timetables.filter(t => t.status === 'pending').length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Rejected</p>
                  <p className="text-2xl font-bold text-white">
                    {timetables.filter(t => t.status === 'rejected').length}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}