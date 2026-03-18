'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/authContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { UserCheck, Search, CheckCircle, XCircle } from 'lucide-react'

export default function AdminAssignRepresentativePage() {
  const { backendUser, loading: authLoading } = useAuth()
  const router = useRouter()

  const [sections, setSections] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredUsers, setFilteredUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Check if user is admin
  useEffect(() => {
    if (!authLoading && backendUser) {
      const isAdmin = (
        backendUser.role === 'ADMIN' ||
        backendUser.role === 'SUPER_ADMIN' ||
        (backendUser as any).permissions?.includes('MANAGE_USERS')
      );

      if (!isAdmin) {
        router.push('/dashboard/student') // Redirect to student dashboard if not admin
      } else {
        fetchData();
      }
    }
  }, [backendUser, authLoading, router])

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');

      // Fetch sections
      const sectionsRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/api/sections`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const sectionsData = await sectionsRes.json();
      if (sectionsData.success) {
        setSections(sectionsData.data);
      }

      // Fetch users
      const usersRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/api/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const usersData = await usersRes.json();
      if (usersData.success) {
        // Filter only students to be representatives
        const studentsOnly = usersData.data.filter((u: any) => u.roleId?.name === 'STUDENT' || u.roleId?.name === undefined);
        const allUsers = usersData.data; // Keep all users to display their names in the list properly
        setUsers(allUsers);
        setFilteredUsers(allUsers);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search term
  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredUsers(filtered)
    } else {
      setFilteredUsers(users)
    }
  }, [searchTerm, users])

  const handleAssignRepresentative = async (sectionId: string, userId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/api/sections/${sectionId}/representative`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ representativeId: userId })
      });

      const data = await res.json();
      if (data.success) {
        // Update local state
        setSections(sections.map(section =>
          section._id === sectionId
            ? { ...section, representativeId: data.data.representativeId }
            : section
        ));
      }
    } catch (err) {
      console.error('Failed to assign representative', err);
    }
  }

  const handleRemoveRepresentative = async (sectionId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/api/sections/${sectionId}/representative`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ representativeId: null })
      });

      const data = await res.json();
      if (data.success) {
        // Update local state
        setSections(sections.map(section =>
          section._id === sectionId
            ? { ...section, representativeId: null }
            : section
        ));
      }
    } catch (err) {
      console.error('Failed to remove representative', err);
    }
  }

  if (authLoading || loading) {
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
              <h1 className="text-3xl font-bold text-white mb-2">Assign Section Representatives</h1>
              <p className="text-slate-400">Assign students as section representatives</p>
            </div>
            <div className="inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
              <span>ADMIN</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sections List */}
          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Sections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-300">Section</TableHead>
                    <TableHead className="text-slate-300">Course</TableHead>
                    <TableHead className="text-slate-300">Representative</TableHead>
                    <TableHead className="text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sections.length === 0 ? (
                    <TableRow className="border-slate-700">
                      <TableCell colSpan={4} className="h-32 text-center text-slate-400">
                        No sections available. Go to <a href="/admin/sections" className="text-emerald-400 hover:underline">Manage Sections</a> to create one first.
                      </TableCell>
                    </TableRow>
                  ) : sections.map((section) => {
                    // Check if representativeId is populated or just an ID
                    const repId = section.representativeId?._id || section.representativeId;
                    const representative = users.find(u => u._id === repId);

                    return (
                      <TableRow key={section._id} className="border-slate-700">
                        <TableCell className="text-white font-medium">{section.name}</TableCell>
                        <TableCell className="text-slate-300">{section.courseId}</TableCell>
                        <TableCell className="text-slate-300">
                          {representative ? (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              {representative.name}
                            </div>
                          ) : section.representativeId?.name ? (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              {section.representativeId.name}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <XCircle className="h-4 w-4 text-red-500" />
                              <span className="text-red-400">No Rep</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Select
                              onValueChange={(value) => handleAssignRepresentative(section._id, value)}
                              value={repId || undefined}
                            >
                              <SelectTrigger className="w-[180px] bg-slate-700 border-slate-600 text-white">
                                <SelectValue placeholder="Assign Rep" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-700 border-slate-600 text-white">
                                {users.filter(u => u.roleId?.name === 'STUDENT' || !u.roleId || u.roleId?.name === undefined).map(user => (
                                  <SelectItem key={user._id} value={user._id} className="text-white">
                                    {user.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {repId && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveRepresentative(section._id)}
                                className="border-red-600 text-red-400 hover:bg-red-900/20"
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Users List */}
          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Available Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div className="space-y-3">
                {filteredUsers.map(user => (
                  <div
                    key={user._id}
                    className="p-3 bg-slate-700/50 rounded-lg border border-slate-600 flex justify-between items-center"
                  >
                    <div>
                      <h4 className="font-medium text-white">{user.name}</h4>
                      <p className="text-sm text-slate-400">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 bg-slate-600 text-slate-300 rounded-full text-xs">
                        {user.roleId?.name || 'STUDENT'}
                      </span>
                      {(!user.roleId || user.roleId?.name === 'STUDENT') && sections.length > 0 && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white h-7 text-xs px-3">
                              Make Rep
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-slate-800 border-slate-700 text-white sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Assign Representative</DialogTitle>
                              <DialogDescription className="text-slate-400">
                                Select a section to assign {user.name} as a class representative.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <Select
                                onValueChange={(value) => handleAssignRepresentative(value, user._id)}
                              >
                                <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-white">
                                  <SelectValue placeholder="Select a section" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-700 border-slate-600 text-white">
                                  {sections.map(section => (
                                    <SelectItem key={section._id} value={section._id} className="text-white">
                                      {section.name} {section.courseId ? `(${section.courseId})` : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}