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
import { UserCheck, Search, CheckCircle, XCircle } from 'lucide-react'

export default function AdminAssignRepresentativePage() {
  const { backendUser, loading } = useAuth()
  const router = useRouter()
  const [sections, setSections] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredUsers, setFilteredUsers] = useState<any[]>([])

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

  // Mock data for sections and users
  useEffect(() => {
    // In a real app, this would come from API calls
    setSections([
      { id: '1', sectionName: 'CS-101-A', courseId: 'CS101', representative: 'user-3' },
      { id: '2', sectionName: 'MATH-201-B', courseId: 'MATH201', representative: 'user-1' },
      { id: '3', sectionName: 'PHYS-102-C', courseId: 'PHYS102', representative: null },
      { id: '4', sectionName: 'ENG-101-D', courseId: 'ENG101', representative: null }
    ])
    
    setUsers([
      { id: '1', name: 'Alice Johnson', email: 'alice.johnson@university.edu', role: 'STUDENT' },
      { id: '2', name: 'Bob Smith', email: 'bob.smith@university.edu', role: 'STUDENT' },
      { id: '3', name: 'Carol Davis', email: 'carol.davis@university.edu', role: 'STUDENT' },
      { id: '4', name: 'David Wilson', email: 'david.wilson@university.edu', role: 'STUDENT' },
      { id: '5', name: 'Emma Brown', email: 'emma.brown@university.edu', role: 'STUDENT' }
    ])
  }, [])

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

  const handleAssignRepresentative = (sectionId: string, userId: string) => {
    setSections(sections.map(section => 
      section.id === sectionId 
        ? { ...section, representative: userId } 
        : section
    ))
  }

  const handleRemoveRepresentative = (sectionId: string) => {
    setSections(sections.map(section => 
      section.id === sectionId 
        ? { ...section, representative: null } 
        : section
    ))
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
                  {sections.map((section) => {
                    const representative = users.find(u => u.id === section.representative)
                    
                    return (
                      <TableRow key={section.id} className="border-slate-700">
                        <TableCell className="text-white font-medium">{section.sectionName}</TableCell>
                        <TableCell className="text-slate-300">{section.courseId}</TableCell>
                        <TableCell className="text-slate-300">
                          {representative ? (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              {representative.name}
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
                              onValueChange={(value) => handleAssignRepresentative(section.id, value)}
                              value={section.representative || undefined}
                            >
                              <SelectTrigger className="w-[180px] bg-slate-700 border-slate-600 text-white">
                                <SelectValue placeholder="Assign Rep" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-700 border-slate-600 text-white">
                                {users.map(user => (
                                  <SelectItem key={user.id} value={user.id} className="text-white">
                                    {user.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {section.representative && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleRemoveRepresentative(section.id)}
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
                    key={user.id} 
                    className="p-3 bg-slate-700/50 rounded-lg border border-slate-600 flex justify-between items-center"
                  >
                    <div>
                      <h4 className="font-medium text-white">{user.name}</h4>
                      <p className="text-sm text-slate-400">{user.email}</p>
                    </div>
                    <span className="px-2 py-1 bg-slate-600 text-slate-300 rounded-full text-xs">
                      {user.role}
                    </span>
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