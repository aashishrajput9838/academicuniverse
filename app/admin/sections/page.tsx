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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Edit, Trash2, Users } from 'lucide-react'

export default function AdminSectionsPage() {
  const { backendUser, loading } = useAuth()
  const router = useRouter()
  const [sections, setSections] = useState<any[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSection, setEditingSection] = useState<any>(null)
  const [formData, setFormData] = useState({
    sectionName: '',
    courseId: '',
    capacity: '',
    instructor: ''
  })

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

  // Fetch sections from backend
  useEffect(() => {
    const fetchSections = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}/api/sections`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success) {
          // Map backend fields to frontend table fields
          const mappedSections = data.data.map((s: any) => ({
            id: s._id,
            sectionName: s.name,
            courseId: s.courseId,
            capacity: 50, // This isn't strictly in the schema yet, default to 50
            instructor: 'TBD', // This isn't strictly in the schema yet, default to TBD
            students: 0
          }));
          setSections(mappedSections);
        }
      } catch (err) {
        console.error('Error fetching sections:', err);
      }
    };

    if (backendUser) {
      fetchSections();
    }
  }, [backendUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('authToken');
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
      
      if (editingSection) {
        // Update existing section API call
        const res = await fetch(`${baseUrl}/api/sections/${editingSection.id}`, {
          method: 'PUT',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: formData.sectionName,
            courseId: formData.courseId
          })
        });
        
        const data = await res.json();
        if (data.success) {
          setSections(sections.map(s =>
            s.id === editingSection.id
              ? { ...s, sectionName: formData.sectionName, courseId: formData.courseId }
              : s
          ));
        }
      } else {
        // Create new section API call
        const res = await fetch(`${baseUrl}/api/sections`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: formData.sectionName,
            courseId: formData.courseId
          })
        });
        
        const data = await res.json();
        if (data.success) {
          const s = data.data;
          const newSection = {
            id: s._id,
            sectionName: s.name,
            courseId: s.courseId,
            capacity: 50,
            instructor: 'TBD',
            students: 0
          };
          setSections([...sections, newSection]);
        } else {
          alert('Failed to create: ' + (data.message || 'Error'));
          return;
        }
      }

      // Reset form and close dialog
      setFormData({ sectionName: '', courseId: '', capacity: '', instructor: '' });
      setIsDialogOpen(false);
      setEditingSection(null);
    } catch (err) {
      console.error('Failed to submit section', err);
      alert('An error occurred submitting the section.');
    }
  }

  const handleEdit = (section: any) => {
    setEditingSection(section)
    setFormData({
      sectionName: section.sectionName,
      courseId: section.courseId,
      capacity: section.capacity?.toString() || '50',
      instructor: section.instructor || 'TBD'
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this section?')) return;
    
    try {
      const token = localStorage.getItem('authToken');
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
      
      const res = await fetch(`${baseUrl}/api/sections/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();
      if (data.success) {
        setSections(sections.filter(s => s.id !== id));
      } else {
        alert('Failed to delete section: ' + (data.message || 'Error'));
      }
    } catch (err) {
      console.error('Delete section error:', err);
      alert('Failed to delete section');
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
              <h1 className="text-3xl font-bold text-white mb-2">Section Management</h1>
              <p className="text-slate-400">Create, update, and delete academic sections</p>
            </div>
            <div className="inline-flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
              <span>ADMIN</span>
            </div>
          </div>
        </div>

        <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5" />
              Sections
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setEditingSection(null)
                    setFormData({ sectionName: '', courseId: '', capacity: '', instructor: '' })
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Section
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-white">
                    {editingSection ? 'Edit Section' : 'Create New Section'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="sectionName" className="text-slate-300">Section Name</Label>
                    <Input
                      id="sectionName"
                      value={formData.sectionName}
                      onChange={(e) => setFormData({ ...formData, sectionName: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="courseId" className="text-slate-300">Course ID</Label>
                    <Input
                      id="courseId"
                      value={formData.courseId}
                      onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="capacity" className="text-slate-300">Capacity</Label>
                    <Input
                      id="capacity"
                      type="number"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="instructor" className="text-slate-300">Instructor</Label>
                    <Input
                      id="instructor"
                      value={formData.instructor}
                      onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="border-slate-600 text-slate-300"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                      {editingSection ? 'Update' : 'Create'} Section
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-300">Section</TableHead>
                  <TableHead className="text-slate-300">Course ID</TableHead>
                  <TableHead className="text-slate-300">Capacity</TableHead>
                  <TableHead className="text-slate-300">Enrolled</TableHead>
                  <TableHead className="text-slate-300">Instructor</TableHead>
                  <TableHead className="text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sections.map((section) => (
                  <TableRow key={section.id} className="border-slate-700">
                    <TableCell className="text-white font-medium">{section.sectionName}</TableCell>
                    <TableCell className="text-slate-300">{section.courseId}</TableCell>
                    <TableCell className="text-slate-300">{section.capacity}</TableCell>
                    <TableCell className="text-slate-300">{section.students}</TableCell>
                    <TableCell className="text-slate-300">{section.instructor}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(section)}
                          className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(section.id)}
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
      </div>
    </div>
  )
}