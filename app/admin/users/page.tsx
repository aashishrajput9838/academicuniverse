'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/authContext'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import { Badge } from '@/components/ui/badge'
import { Search, User, Mail, GraduationCap, Briefcase, Edit, Trash2, Eye } from 'lucide-react'

export default function AdminUsersPage() {
  const { backendUser, loading } = useAuth()
  const router = useRouter()
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

  // Fetch users from backend
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/api/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success) {
          // Transform backend user data slightly if needed to match the frontend shape
          const transformedUsers = data.data.map((u: any) => ({
            id: u._id,
            name: u.name,
            email: u.email,
            role: u.roleId?.name || 'STUDENT',
            organization: 'Sharda University', // We can get this from orgId later if needed
            status: u.isActive ? 'active' : 'inactive',
            lastLogin: null // Or whatever field tracks login in the future
          }));
          setUsers(transformedUsers);
          setFilteredUsers(transformedUsers);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };

    if (backendUser) {
      fetchUsers();
    }
  }, [backendUser]);

  // Filter users based on search term
  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredUsers(filtered)
    } else {
      setFilteredUsers(users)
    }
  }, [searchTerm, users])

  const handleRoleChange = (userId: string, newRole: string) => {
    setUsers(users.map(user =>
      user.id === userId ? { ...user, role: newRole } : user
    ))
  }

  const handleStatusChange = (userId: string, newStatus: string) => {
    setUsers(users.map(user =>
      user.id === userId ? { ...user, status: newStatus } : user
    ))
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'inactive': return 'bg-red-500'
      case 'pending': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
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
              <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
              <p className="text-slate-400">View and manage system users</p>
            </div>
            <div className="inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
              <span>ADMIN</span>
            </div>
          </div>
        </div>

        <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <User className="h-5 w-5" />
              System Users
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-300">User</TableHead>
                  <TableHead className="text-slate-300">Email</TableHead>
                  <TableHead className="text-slate-300">Role</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                  <TableHead className="text-slate-300">Last Login</TableHead>
                  <TableHead className="text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="border-slate-700">
                    <TableCell className="text-white font-medium">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center">
                            <User className="h-5 w-5 text-emerald-400" />
                          </div>
                          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-800 ${getStatusColor(user.status)}`}></div>
                        </div>
                        <div>
                          <div>{user.name}</div>
                          <div className="text-sm text-slate-400">{user.organization}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-300">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-500" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(value) => handleRoleChange(user.id, value)}
                      >
                        <SelectTrigger className="w-[120px] bg-slate-700 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600 text-white">
                          <SelectItem value="STUDENT" className="text-white">
                            <div className="flex items-center gap-2">
                              <GraduationCap className="h-4 w-4" />
                              Student
                            </div>
                          </SelectItem>
                          <SelectItem value="FACULTY" className="text-white">
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4" />
                              Faculty
                            </div>
                          </SelectItem>
                          <SelectItem value="ADMIN" className="text-white">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Admin
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(user.status)}`}></div>
                        <span className="capitalize">{user.status}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-600 text-red-400 hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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
                  <p className="text-slate-400 text-sm">Total Users</p>
                  <p className="text-2xl font-bold text-white">{users.length}</p>
                </div>
                <User className="h-8 w-8 text-emerald-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Active</p>
                  <p className="text-2xl font-bold text-white">
                    {users.filter(u => u.status === 'active').length}
                  </p>
                </div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Students</p>
                  <p className="text-2xl font-bold text-white">
                    {users.filter(u => u.role === 'STUDENT').length}
                  </p>
                </div>
                <GraduationCap className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Faculty</p>
                  <p className="text-2xl font-bold text-white">
                    {users.filter(u => u.role === 'FACULTY').length}
                  </p>
                </div>
                <Briefcase className="h-8 w-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}