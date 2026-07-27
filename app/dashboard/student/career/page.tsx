'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { apiRequest } from '@/utils/api';

interface UserProfileData {
  id?: string;
  name?: string;
  email?: string;
  githubUsername?: string;
  role?: string;
  admissionYear?: number | null;
}

interface ResumeDraftData {
  filledData?: Record<string, any>;
  generatedDocxUrl?: string;
  templateId?: string;
  updatedAt?: string;
  createdAt?: string;
}

interface GithubStatus {
  connected: boolean;
  username?: string;
  publicRepos?: number;
}

interface SkillItem {
  id?: string;
  name: string;
  category?: string;
  proficiency?: string;
  source?: string;
}

interface CertItem {
  name: string;
  issuer?: string;
  issueDate?: string;
  expiryDate?: string;
  status: 'Verified' | 'Uploaded' | 'In Progress';
}

export default function StudentCareerProfile() {
  const { user, backendUser, backendToken, loading: authLoading } = useAuth();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [resumeData, setResumeData] = useState<ResumeDraftData | null>(null);
  const [githubStatus, setGithubStatus] = useState<GithubStatus>({ connected: false });
  const [skillsList, setSkillsList] = useState<SkillItem[]>([]);
  const [certifications, setCertifications] = useState<CertItem[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && (!user || !backendUser)) {
      router.push('/login');
    } else if (!authLoading && backendUser && backendUser.role !== 'STUDENT' && backendUser.role !== 'FACULTY') {
      router.push('/');
    }
  }, [user, backendUser, authLoading, router]);

  // Fetch real dynamic data from all connected backend endpoints
  useEffect(() => {
    if (!backendToken || !backendUser) return;
    loadCareerProfileData();
  }, [backendToken, backendUser]);

  const loadCareerProfileData = async () => {
    setIsLoading(true);
    setFetchError(null);

    const headers = { Authorization: `Bearer ${backendToken}` };

    try {
      // 1. Fetch User Profile
      let prof: UserProfileData | null = null;
      try {
        const res = await apiRequest('/api/profile', { headers });
        prof = res.data || res;
        setProfileData(prof);
      } catch (err) {
        console.warn('Profile fetch warning:', err);
      }

      // 2. Fetch Latest Resume Data
      let resData: ResumeDraftData | null = null;
      try {
        const res = await apiRequest('/api/resume/draft', { headers });
        resData = res.data || res;
        setResumeData(resData);
      } catch (err) {
        console.warn('Resume draft fetch warning:', err);
      }

      // 3. Fetch GitHub Connection Status
      let ghStatus: GithubStatus = { connected: false };
      try {
        const res = await apiRequest('/api/github/connection-status', { headers });
        const data = res.data || res;
        ghStatus = {
          connected: Boolean(data.connected || prof?.githubUsername || resData?.filledData?.github),
          username: data.username || prof?.githubUsername || resData?.filledData?.github,
          publicRepos: data.publicRepos,
        };
        setGithubStatus(ghStatus);
      } catch (err) {
        if (prof?.githubUsername || resData?.filledData?.github) {
          setGithubStatus({
            connected: true,
            username: prof?.githubUsername || resData?.filledData?.github,
          });
        }
      }

      // 4. Fetch Skills from Skills Tracker & Resume
      const aggregatedSkills: SkillItem[] = [];
      const seenSkills = new Set<string>();

      // From Resume
      if (resData?.filledData?.skills) {
        const rawSkills = Array.isArray(resData.filledData.skills)
          ? resData.filledData.skills
          : String(resData.filledData.skills).split(',');

        rawSkills.forEach((s: string) => {
          const trimmed = s.trim();
          if (trimmed && !seenSkills.has(trimmed.toLowerCase())) {
            seenSkills.add(trimmed.toLowerCase());
            aggregatedSkills.push({
              name: trimmed,
              proficiency: 'Resume Verified',
              source: 'Resume Builder',
            });
          }
        });
      }

      // From Skills Tracker API
      try {
        const res = await apiRequest('/api/skills/me', { headers });
        const skillsData = res.data || [];
        if (Array.isArray(skillsData)) {
          skillsData.forEach((s: any) => {
            const sName = s.name || s.skillName || s.title;
            if (sName && !seenSkills.has(String(sName).toLowerCase())) {
              seenSkills.add(String(sName).toLowerCase());
              aggregatedSkills.push({
                name: sName,
                proficiency: s.proficiency || s.level || 'Skills Tracker',
                source: 'Skills Tracker',
              });
            }
          });
        }
      } catch (err) {
        console.warn('Skills API warning:', err);
      }

      setSkillsList(aggregatedSkills);

      // 5. Fetch Certifications from Resume & Document Intelligence
      const certList: CertItem[] = [];

      // From Resume Builder
      if (resData?.filledData?.certification_name) {
        certList.push({
          name: resData.filledData.certification_name,
          issuer: resData.filledData.certification_issuer,
          issueDate: resData.filledData.certification_issue_date,
          expiryDate: resData.filledData.certification_expiry_date,
          status: 'Verified',
        });
      }

      // From Document Intelligence
      try {
        const res = await apiRequest('/api/document-intelligence/documents', { headers });
        const docList = res.data?.documents || res.documents || [];
        if (Array.isArray(docList)) {
          docList.forEach((d: any) => {
            if (d.category?.toLowerCase().includes('certif') || d.originalName?.toLowerCase().includes('cert')) {
              certList.push({
                name: d.originalName || d.title || 'Uploaded Certificate',
                issuer: d.issuer || 'Document Intelligence',
                status: d.status === 'processed' || d.status === 'verified' ? 'Verified' : 'Uploaded',
              });
            }
          });
        }
      } catch (err) {
        console.warn('Document Intelligence API warning:', err);
      }

      setCertifications(certList);
    } catch (err: any) {
      console.error('Error loading career profile data:', err);
      setFetchError(err.message || 'Failed to load career profile data');
    } finally {
      setIsLoading(false);
    }
  };

  // Compute Dynamic Profile Completeness Percentage Engine
  const calculateCompleteness = (): number => {
    let score = 0;
    const filled = resumeData?.filledData || {};

    // 1. Name (10%)
    if (profileData?.name || filled.full_name) score += 10;
    // 2. Email (10%)
    if (profileData?.email || filled.email) score += 10;
    // 3. Phone (10%)
    if (filled.phone) score += 10;
    // 4. Location (5%)
    if (filled.location) score += 5;
    // 5. GitHub (10%)
    if (githubStatus.connected || profileData?.githubUsername || filled.github) score += 10;
    // 6. LinkedIn (10%)
    if (filled.linkedin) score += 10;
    // 7. Portfolio / Website (5%)
    if (filled.website) score += 5;
    // 8. Professional Summary (10%)
    if (filled.professional_summary) score += 10;
    // 9. Education (10%)
    if (filled.education_degree || profileData?.admissionYear) score += 10;
    // 10. Skills (10%)
    if (skillsList.length > 0 || filled.skills) score += 10;
    // 11. Experience or Projects (10%)
    if (filled.experience_company || filled.project_name) score += 10;

    return Math.min(100, Math.max(0, score));
  };

  const getSkillIcon = (skillName: string): string => {
    const lower = skillName.toLowerCase();
    if (lower.includes('python')) return '🐍';
    if (lower.includes('react')) return '⚛️';
    if (lower.includes('javascript') || lower.includes('js') || lower.includes('ts') || lower.includes('typescript')) return '🌐';
    if (lower.includes('sql') || lower.includes('mongo') || lower.includes('db')) return '💾';
    if (lower.includes('node') || lower.includes('express')) return '🟩';
    if (lower.includes('java') || lower.includes('c++') || lower.includes('c#')) return '☕';
    if (lower.includes('git') || lower.includes('docker') || lower.includes('aws')) return '🐙';
    return '💻';
  };

  // Show loading state while checking authentication or fetching data
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-400 border-opacity-50" />
      </div>
    );
  }

  // Don't render content until user is authenticated and is a student
  if (!user || !backendUser || (backendUser.role !== 'STUDENT' && backendUser.role !== 'FACULTY')) {
    return null;
  }

  const completenessScore = calculateCompleteness();
  const filled = resumeData?.filledData || {};

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Career & Verified Profile</h1>
          <p className="text-slate-400">Build your professional presence and showcase your achievements</p>
        </div>
        {resumeData?.updatedAt && (
          <div className="text-xs text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-700 self-start md:self-auto">
            Last Updated: <span className="text-emerald-400 font-medium">{new Date(resumeData.updatedAt).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {fetchError && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {fetchError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Centralized Presence */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Centralized Presence</h2>
          <div className="space-y-4">
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Professional Profile</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Profile Completeness</span>
                  <span className="text-emerald-400 font-bold">{completenessScore}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${completenessScore}%` }}></div>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-600">
              <h3 className="font-semibold text-white mb-2">Online Presence</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">LinkedIn</span>
                  {filled.linkedin ? (
                    <a href={filled.linkedin.startsWith('http') ? filled.linkedin : `https://${filled.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-emerald-400 text-sm hover:underline flex items-center gap-1">
                      <span>Connected</span>
                    </a>
                  ) : (
                    <span className="text-slate-500 text-sm">Not Connected</span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-300">GitHub</span>
                  {githubStatus.connected || profileData?.githubUsername || filled.github ? (
                    <span className="text-emerald-400 text-sm">
                      Connected ({githubStatus.username || profileData?.githubUsername || 'Active'})
                    </span>
                  ) : (
                    <span className="text-slate-500 text-sm">Not Connected</span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Portfolio</span>
                  {filled.website ? (
                    <a href={filled.website.startsWith('http') ? filled.website : `https://${filled.website}`} target="_blank" rel="noopener noreferrer" className="text-emerald-400 text-sm hover:underline">
                      Connected
                    </a>
                  ) : (
                    <span className="text-slate-500 text-sm">Not Connected</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Certifications */}
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Certifications</h2>
          <div className="space-y-4">
            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
              <h3 className="font-semibold text-blue-400">Completed</h3>
              {certifications.filter(c => c.status !== 'In Progress').length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {certifications.filter(c => c.status !== 'In Progress').map((cert, i) => (
                    <li key={i} className="flex justify-between items-center text-slate-300 text-sm">
                      <div>
                        <span className="font-medium">{cert.name}</span>
                        {cert.issuer && <span className="text-xs text-slate-400 block">{cert.issuer}</span>}
                      </div>
                      <span className="text-emerald-400 text-xs px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded">
                        {cert.status}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400 text-xs mt-2">No verified completed certifications found.</p>
              )}
            </div>
            
            <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
              <h3 className="font-semibold text-yellow-400">In Progress</h3>
              {certifications.filter(c => c.status === 'In Progress').length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {certifications.filter(c => c.status === 'In Progress').map((cert, i) => (
                    <li key={i} className="text-slate-300 text-sm flex justify-between">
                      <span>{cert.name}</span>
                      <span className="text-yellow-400 text-xs">In Progress</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500 text-xs mt-2">No certifications currently in progress.</p>
              )}
            </div>
          </div>
        </div>

        {/* Resume Section */}
        <div className="md:col-span-2 bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-emerald-400">Resume Builder Data</h2>
            <Link href="/dashboard/student/resume-builder" className="text-xs text-emerald-400 hover:underline font-medium">
              Open Resume Builder →
            </Link>
          </div>
          
          {filled.education_degree || filled.experience_company || profileData?.admissionYear ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-white mb-3">Education</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600">
                    <h4 className="font-medium text-emerald-400">
                      {filled.education_degree || 'Higher Secondary / Graduation'}
                    </h4>
                    <p className="text-slate-400 text-sm">
                      {filled.education_institution || 'Academic Institution'}
                    </p>
                    <p className="text-slate-400 text-sm">
                      {filled.education_start_year || profileData?.admissionYear || '2021'} - {filled.education_end_year || 'Present'}
                    </p>
                    {filled.education_cgpa && (
                      <p className="text-emerald-400 text-sm mt-1">CGPA: {filled.education_cgpa}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-white mb-3">Experience</h3>
                <div className="space-y-3">
                  {filled.experience_company || filled.experience_role ? (
                    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-600">
                      <h4 className="font-medium text-emerald-400">
                        {filled.experience_role || 'Software Engineer / Student Intern'}
                      </h4>
                      <p className="text-slate-400 text-sm">
                        {filled.experience_company || 'Organization'} • {filled.experience_start_date || ''} {filled.experience_end_date ? `- ${filled.experience_end_date}` : ''}
                      </p>
                      {filled.experience_description && (
                        <p className="text-slate-400 text-sm mt-1 line-clamp-2">{filled.experience_description}</p>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/50 text-slate-500 text-xs">
                      No work experience added in Resume Builder yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 bg-slate-800/30 rounded-xl border border-slate-700/50">
              <p className="text-slate-400 text-sm mb-4">No resume data found for your account.</p>
              <Link href="/dashboard/student/resume-builder" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition inline-block">
                ✨ Generate Your First Resume
              </Link>
            </div>
          )}
        </div>

        {/* Skills Section */}
        <div className="md:col-span-2 bg-slate-900/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-4">Skills</h2>
          {skillsList.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {skillsList.map((skill, index) => (
                <div key={index} className="p-4 bg-slate-800/50 rounded-lg border border-slate-600 text-center hover:border-emerald-500/50 transition">
                  <div className="text-emerald-400 text-2xl mb-2">{getSkillIcon(skill.name)}</div>
                  <h3 className="font-semibold text-white text-sm">{skill.name}</h3>
                  <p className="text-slate-400 text-xs mt-0.5">{skill.proficiency || 'Verified'}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 bg-slate-800/30 rounded-xl border border-slate-700/50 text-center text-slate-400 text-sm">
              No verified skills found. Add skills in Resume Builder or Skills Tracker.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}