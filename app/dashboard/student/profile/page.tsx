'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/utils/api';

interface ProfileData {
  id: string;
  name: string;
  email: string;
  githubUsername: string;
  role: string;
  admissionYear: number | null;
}

export default function StudentProfilePage() {
  const { user, backendUser, backendToken, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [admissionYear, setAdmissionYear] = useState<string>('');

  const [errors, setErrors] = useState<{ admissionYear?: string; general?: string }>({});

  useEffect(() => {
    if (!backendToken) return;
    fetchProfile();
  }, [backendToken]);

  const fetchProfile = async () => {
    setIsLoading(true);
    setErrors({});
    try {
      const response = await apiRequest('/api/profile', {
        headers: {
          Authorization: `Bearer ${backendToken}`,
        },
      });
      const data = response.data as ProfileData;
      setProfile(data);
      setName(data.name || '');
      setGithubUsername(data.githubUsername || '');
      setAdmissionYear(data.admissionYear ? String(data.admissionYear) : '');
    } catch (err: any) {
      setErrors({ general: err.message || 'Failed to load profile' });
    } finally {
      setIsLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!admissionYear.trim()) {
      newErrors.admissionYear = 'Admission year is required';
    } else {
      const year = Number(admissionYear);
      if (!/^\d{4}$/.test(admissionYear.trim())) {
        newErrors.admissionYear = 'Admission year must be a four-digit year';
      } else if (isNaN(year) || year < 1900 || year > new Date().getFullYear()) {
        newErrors.admissionYear = 'Admission year cannot be in the future and must be valid';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    setErrors({});
    try {
      const response = await apiRequest('/api/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${backendToken}`,
        },
        body: JSON.stringify({
          name,
          githubUsername,
          admissionYear: Number(admissionYear),
        }),
      });

      const updated = response.data as ProfileData;
      setProfile(updated);
      setName(updated.name || '');
      setGithubUsername(updated.githubUsername || '');
      setAdmissionYear(updated.admissionYear ? String(updated.admissionYear) : '');

      toast({
        title: 'Profile updated',
        description: 'Your profile has been saved successfully.',
      });
    } catch (err: any) {
      const message = err.message || 'Failed to update profile';
      setErrors({ general: message });
      toast({
        title: 'Update failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-emerald-400 border-opacity-50" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-8 text-center">
        <p className="text-slate-400">Failed to load profile. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 text-transparent bg-clip-text flex items-center gap-3">
            <span className="text-4xl">👤</span>
            Student Profile
          </h1>
          <p className="text-slate-400 mt-2">
            Manage your academic identity fields such as Admission Year.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6 space-y-6">
        {errors.general && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">
            {errors.general}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              placeholder="Your full name"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">Email</label>
            <input
              type="email"
              value={profile.email}
              readOnly
              className="w-full rounded-lg border border-slate-700 bg-slate-900/30 px-4 py-2.5 text-slate-400 cursor-not-allowed"
            />
            <p className="text-xs text-slate-500">Email cannot be changed here.</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">GitHub Username</label>
            <input
              type="text"
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              placeholder="e.g. johndoe"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">Admission Year</label>
            <input
              type="text"
              inputMode="numeric"
              value={admissionYear}
              onChange={(e) => setAdmissionYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className={`w-full rounded-lg border px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none ${errors.admissionYear ? 'border-red-500 bg-slate-900/50 focus:border-red-500' : 'border-slate-700 bg-slate-900/50 focus:border-emerald-500'}`}
              placeholder="e.g. 2023"
            />
            {errors.admissionYear && (
              <p className="text-xs text-red-400">{errors.admissionYear}</p>
            )}
            <p className="text-xs text-slate-500">Used to derive your overall semester number from marksheets.</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-700">
          <div className="text-xs text-slate-500">
            Role: <span className="text-slate-300">{profile.role}</span>
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-lg font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
