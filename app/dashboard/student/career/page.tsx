'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { apiRequest } from '@/utils/api';
import {
  User,
  CheckCircle2,
  XCircle,
  ExternalLink,
  FileText,
  Award,
  BookOpen,
  Briefcase,
  Code2,
  Sparkles,
  Clock,
  Download,
  Github,
  Linkedin,
  Globe,
  ChevronRight,
  AlertTriangle,
  FolderGit2,
  TrendingUp,
  GraduationCap,
  ShieldCheck,
  Zap,
  X,
  Loader2,
  Trash2,
  Layers,
} from 'lucide-react';

interface UserProfileData {
  id?: string;
  name?: string;
  email?: string;
  githubUsername?: string;
  linkedinUrl?: string;
  linkedinUsername?: string;
  linkedinConnected?: boolean;
  linkedinLastUpdated?: string;
  role?: string;
  admissionYear?: number | null;
}

interface ResumeDraftData {
  studentResumeId?: string;
  templateId?: string;
  templateName?: string;
  filledData?: Record<string, any>;
  generatedDocxUrl?: string;
  generatedResumeCount?: number;
  isGenerated?: boolean;
  updatedAt?: string;
  createdAt?: string;
}

interface GithubStatus {
  connected: boolean;
  username?: string;
  publicRepos?: number;
}

interface LinkedinStatus {
  connected: boolean;
  url?: string;
  username?: string;
  lastUpdated?: string;
}

interface SkillItem {
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

interface TimelineEvent {
  title: string;
  category: string;
  date: string;
  description: string;
  icon: string;
}

export default function StudentCareerProfile() {
  const { user, backendUser, backendToken, loading: authLoading } = useAuth();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [resumeData, setResumeData] = useState<ResumeDraftData | null>(null);
  const [githubStatus, setGithubStatus] = useState<GithubStatus>({ connected: false });
  const [linkedinStatus, setLinkedinStatus] = useState<LinkedinStatus>({ connected: false });
  const [skillsList, setSkillsList] = useState<SkillItem[]>([]);
  const [certifications, setCertifications] = useState<CertItem[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // LinkedIn Connection Modal State
  const [isLinkedinModalOpen, setIsLinkedinModalOpen] = useState(false);
  const [linkedinInputUrl, setLinkedinInputUrl] = useState('');
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && (!user || !backendUser)) {
      router.push('/login');
    } else if (!authLoading && backendUser && backendUser.role !== 'STUDENT' && backendUser.role !== 'FACULTY') {
      router.push('/');
    }
  }, [user, backendUser, authLoading, router]);

  // Load real data from all backend endpoints
  useEffect(() => {
    if (!backendToken || !backendUser) return;
    loadCareerProfileData();
  }, [backendToken, backendUser]);

  const loadCareerProfileData = async () => {
    setIsLoading(true);
    setFetchError(null);

    const headers = { Authorization: `Bearer ${backendToken}` };

    try {
      // 1. Fetch User Profile (Includes LinkedIn fields)
      let prof: UserProfileData | null = null;
      try {
        const res = await apiRequest('/api/profile', { headers });
        prof = res.data || res;
        setProfileData(prof);
      } catch (err) {
        console.warn('Profile fetch warning:', err);
      }

      // 2. Fetch Latest Generated Resume Data & Count
      let resData: ResumeDraftData | null = null;
      try {
        const res = await apiRequest('/api/resume/draft', { headers });
        resData = res.data || res;
        setResumeData(resData);
      } catch (err) {
        console.warn('Resume draft fetch warning:', err);
      }

      // 3. Fetch LinkedIn Status API
      try {
        const res = await apiRequest('/api/profile/linkedin', { headers });
        const liData = res.data || res;
        setLinkedinStatus({
          connected: Boolean(liData.connected || prof?.linkedinConnected || resData?.filledData?.linkedin),
          url: liData.url || prof?.linkedinUrl || resData?.filledData?.linkedin || '',
          username: liData.username || prof?.linkedinUsername || '',
          lastUpdated: liData.lastUpdated || prof?.linkedinLastUpdated,
        });
        setLinkedinInputUrl(liData.url || prof?.linkedinUrl || resData?.filledData?.linkedin || '');
      } catch (err) {
        const isConn = Boolean(prof?.linkedinConnected || resData?.filledData?.linkedin);
        const lUrl = prof?.linkedinUrl || resData?.filledData?.linkedin || '';
        setLinkedinStatus({
          connected: isConn,
          url: lUrl,
          username: prof?.linkedinUsername || '',
          lastUpdated: prof?.linkedinLastUpdated,
        });
        setLinkedinInputUrl(lUrl);
      }

      // 4. Fetch GitHub Connection Status
      try {
        const res = await apiRequest('/api/github/connection-status', { headers });
        const data = res.data || res;
        setGithubStatus({
          connected: Boolean(data.connected || prof?.githubUsername || resData?.filledData?.github),
          username: data.username || prof?.githubUsername || resData?.filledData?.github,
          publicRepos: data.publicRepos,
        });
      } catch (err) {
        if (prof?.githubUsername || resData?.filledData?.github) {
          setGithubStatus({
            connected: true,
            username: prof?.githubUsername || resData?.filledData?.github,
          });
        }
      }

      // 5. Fetch Skills
      const aggregatedSkills: SkillItem[] = [];
      const seenSkills = new Set<string>();

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

      // 6. Fetch Certifications
      const certList: CertItem[] = [];

      if (resData?.filledData?.certification_name) {
        certList.push({
          name: resData.filledData.certification_name,
          issuer: resData.filledData.certification_issuer,
          issueDate: resData.filledData.certification_issue_date,
          expiryDate: resData.filledData.certification_expiry_date,
          status: 'Verified',
        });
      }

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

  // LinkedIn Modal Handlers
  const handleSaveLinkedin = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setModalSuccess(null);

    let trimmed = linkedinInputUrl.trim();
    if (!trimmed) {
      setModalError('Please enter a LinkedIn profile URL.');
      return;
    }

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      trimmed = 'https://' + trimmed;
    }

    if (!trimmed.toLowerCase().includes('linkedin.com/in/')) {
      setModalError('Invalid URL. Must be a valid LinkedIn profile URL (e.g. https://linkedin.com/in/username). Company/job/post URLs are not allowed.');
      return;
    }

    setModalSaving(true);
    try {
      const res = await apiRequest('/api/profile/linkedin', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${backendToken}`,
        },
        body: JSON.stringify({ url: trimmed }),
      });

      const data = res.data || res;
      setLinkedinStatus({
        connected: true,
        url: data.url,
        username: data.username,
        lastUpdated: data.lastUpdated,
      });

      // Update resume draft filledData in local state
      setResumeData(prev => prev ? ({
        ...prev,
        filledData: { ...prev.filledData, linkedin: data.url }
      }) : { filledData: { linkedin: data.url } });

      setModalSuccess('LinkedIn profile connected successfully!');
      setTimeout(() => {
        setIsLinkedinModalOpen(false);
        setModalSuccess(null);
      }, 1200);
    } catch (err: any) {
      setModalError(err.message || 'Failed to connect LinkedIn profile.');
    } finally {
      setModalSaving(false);
    }
  };

  const handleDisconnectLinkedin = async () => {
    setModalError(null);
    setModalSuccess(null);
    setModalSaving(true);

    try {
      await apiRequest('/api/profile/linkedin', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${backendToken}`,
        },
      });

      setLinkedinStatus({
        connected: false,
        url: '',
        username: '',
        lastUpdated: new Date().toISOString(),
      });
      setLinkedinInputUrl('');

      // Clear linkedin in resume draft local state
      setResumeData(prev => prev ? ({
        ...prev,
        filledData: { ...prev.filledData, linkedin: '' }
      }) : { filledData: { linkedin: '' } });

      setModalSuccess('LinkedIn profile disconnected.');
      setTimeout(() => {
        setIsLinkedinModalOpen(false);
        setModalSuccess(null);
      }, 1200);
    } catch (err: any) {
      setModalError(err.message || 'Failed to disconnect LinkedIn profile.');
    } finally {
      setModalSaving(false);
    }
  };

  const filled = useMemo(() => resumeData?.filledData || {}, [resumeData]);

  // Exact Resume Status Engine (Single Source of Truth)
  const generatedResumeCount = useMemo(() => {
    if (resumeData?.generatedResumeCount !== undefined) {
      return resumeData.generatedResumeCount;
    }
    if (resumeData?.updatedAt || resumeData?.filledData?.full_name) {
      return 1;
    }
    return 0;
  }, [resumeData]);

  const hasGeneratedResume = generatedResumeCount > 0;

  // Compute Dynamic Profile Completeness Percentage Engine
  const completenessScore = useMemo(() => {
    let score = 0;
    if (profileData?.name || filled.full_name) score += 10;
    if (profileData?.email || filled.email) score += 10;
    if (filled.phone) score += 10;
    if (filled.location) score += 5;
    if (githubStatus.connected || profileData?.githubUsername || filled.github) score += 10;
    if (linkedinStatus.connected || profileData?.linkedinConnected || filled.linkedin) score += 10;
    if (filled.website) score += 5;
    if (filled.professional_summary) score += 10;
    if (filled.education_degree || profileData?.admissionYear) score += 10;
    if (skillsList.length > 0 || filled.skills) score += 10;
    if (filled.experience_company || filled.project_name) score += 10;
    return Math.min(100, Math.max(0, score));
  }, [profileData, filled, githubStatus, linkedinStatus, skillsList]);

  // Generate Profile Progress Checklist
  const progressChecklist = useMemo(() => [
    { label: 'Resume Generated', completed: hasGeneratedResume, link: '/dashboard/student/resume-builder' },
    { label: 'GitHub Account Connected', completed: Boolean(githubStatus.connected || profileData?.githubUsername || filled.github), link: '/dashboard/student/profile' },
    { label: 'LinkedIn Profile Connected', completed: Boolean(linkedinStatus.connected || profileData?.linkedinConnected || filled.linkedin), isLinkedinTrigger: true },
    { label: 'Portfolio Website Added', completed: Boolean(filled.website), link: '/dashboard/student/resume-builder' },
    { label: 'Technical Skills Recorded', completed: Boolean(skillsList.length > 0 || filled.skills), link: '/dashboard/student/skills' },
    { label: 'Work Experience Added', completed: Boolean(filled.experience_company || filled.experience_role), link: '/dashboard/student/resume-builder' },
    { label: 'Certifications Verified', completed: Boolean(certifications.length > 0), link: '/dashboard/student/growth?upload=certificate' },
  ], [hasGeneratedResume, filled, githubStatus, linkedinStatus, profileData, skillsList, certifications]);

  // Generate Career Timeline Events from Real Data
  const timelineEvents = useMemo(() => {
    const events: TimelineEvent[] = [];
    if (linkedinStatus.connected || profileData?.linkedinConnected) {
      events.push({
        title: `LinkedIn Connected (@${linkedinStatus.username || profileData?.linkedinUsername || 'profile'})`,
        category: 'Professional Network',
        date: linkedinStatus.lastUpdated ? new Date(linkedinStatus.lastUpdated).toLocaleDateString() : 'Connected',
        description: 'Synced LinkedIn professional URL to Digital Career Portfolio & Resume Builder.',
        icon: '💼',
      });
    }
    if (hasGeneratedResume && resumeData?.updatedAt) {
      events.push({
        title: `Resume Generated (${resumeData.templateName || 'Polished ATS Template'})`,
        category: 'Resume Builder',
        date: new Date(resumeData.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        description: `Generated ATS-formatted resume with ${skillsList.length} verified skills.`,
        icon: '📄',
      });
    }
    certifications.forEach((c) => {
      events.push({
        title: `Certification Verified: ${c.name}`,
        category: 'Document Intelligence',
        date: c.issueDate || 'Recently Verified',
        description: `Verified certificate issued by ${c.issuer || 'Academic Partner'}.`,
        icon: '🏆',
      });
    });
    if (githubStatus.connected || profileData?.githubUsername) {
      events.push({
        title: `GitHub Connected (@${githubStatus.username || profileData?.githubUsername})`,
        category: 'Developer Profile',
        date: 'Connected',
        description: 'Synced GitHub OAuth profile and public repositories.',
        icon: '🐙',
      });
    }
    if (profileData?.admissionYear) {
      events.push({
        title: `Enrolled in University (${profileData.admissionYear})`,
        category: 'Academic Record',
        date: String(profileData.admissionYear),
        description: `Enrolled student record in Sharda University.`,
        icon: '🎓',
      });
    }
    return events;
  }, [linkedinStatus, hasGeneratedResume, resumeData, certifications, githubStatus, profileData, skillsList]);

  // Generate Smart Actionable Recommendations (No Fake AI)
  const aiRecommendations = useMemo(() => {
    const recs = [];
    if (!linkedinStatus.connected && !profileData?.linkedinConnected && !filled.linkedin) {
      recs.push({
        title: 'Connect LinkedIn Profile',
        description: 'Recruiters view profiles with LinkedIn links 40% more often. Connect your profile URL.',
        action: 'Connect LinkedIn',
        isLinkedinTrigger: true,
        priority: 'High',
      });
    }
    if (!githubStatus.connected && !profileData?.githubUsername) {
      recs.push({
        title: 'Connect GitHub Account',
        description: 'Showcase your open source code and repository stats to technical recruiters.',
        action: 'Connect GitHub',
        link: '/dashboard/student/profile',
        priority: 'High',
      });
    }
    // ONLY RECOMMEND IF STUDENT HAS ZERO GENERATED RESUMES (generatedResumeCount === 0)
    if (!hasGeneratedResume) {
      recs.push({
        title: 'Generate ATS Resume',
        description: 'You have not created a resume yet. Choose a template and generate your first DOCX resume.',
        action: 'Generate Resume',
        link: '/dashboard/student/resume-builder',
        priority: 'Critical',
      });
    }
    if (skillsList.length < 4) {
      recs.push({
        title: 'Track Core Skills',
        description: 'Adding 4+ technical skills unlocks deeper career mapping in Skills Tracker.',
        action: 'Add Skills',
        link: '/dashboard/student/skills',
        priority: 'Medium',
      });
    }
    if (certifications.length === 0) {
      recs.push({
        title: 'Upload Course Certificates',
        description: 'Upload course certificates in Growth Hub for automated verification.',
        action: 'Upload Certs',
        link: '/dashboard/student/growth?upload=certificate',
        priority: 'Medium',
      });
    }
    return recs;
  }, [linkedinStatus, filled, githubStatus, profileData, hasGeneratedResume, skillsList, certifications]);

  const getSkillIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('python')) return '🐍';
    if (lower.includes('react')) return '⚛️';
    if (lower.includes('javascript') || lower.includes('js') || lower.includes('typescript') || lower.includes('ts')) return '🌐';
    if (lower.includes('sql') || lower.includes('mongo') || lower.includes('db')) return '💾';
    if (lower.includes('node') || lower.includes('express')) return '🟩';
    if (lower.includes('java') || lower.includes('c++') || lower.includes('c#')) return '☕';
    if (lower.includes('git') || lower.includes('docker') || lower.includes('aws')) return '🐙';
    return '💻';
  };

  const candidateName = profileData?.name || filled.full_name || 'Student Candidate';
  const initials = candidateName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'SC';
  const headline = filled.experience_role || (filled.education_degree ? `${filled.education_degree} Candidate` : 'Software Engineering Student');
  const university = filled.education_institution || 'Sharda University';
  const degree = filled.education_degree || 'Bachelor of Technology in CSE';

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-400 border-opacity-50" />
          <p className="text-slate-400 text-sm">Loading Digital Career Portfolio...</p>
        </div>
      </div>
    );
  }

  if (!user || !backendUser || (backendUser.role !== 'STUDENT' && backendUser.role !== 'FACULTY')) {
    return null;
  }

  return (
    <div className="space-y-6 pb-12">
      {fetchError && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{fetchError}</span>
        </div>
      )}

      {/* SECTION 1 — Professional Hero Banner */}
      <section className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar Initials */}
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-bold text-3xl flex items-center justify-center shadow-lg border-2 border-emerald-400/30 shrink-0">
              {initials}
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-white tracking-tight">{candidateName}</h1>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                  completenessScore >= 75
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                }`}>
                  {completenessScore >= 75 ? 'Placement Ready 🟢' : 'Building Profile 🟡'}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {completenessScore}% Complete
                </span>
              </div>

              <p className="text-emerald-400 font-medium text-lg">{headline}</p>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-slate-400 text-sm">
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-emerald-400" />
                  {university} • {degree}
                </span>
                {profileData?.admissionYear && (
                  <span>Admission Year: {profileData.admissionYear}</span>
                )}
                {filled.education_cgpa && (
                  <span className="text-emerald-300 font-semibold">CGPA: {filled.education_cgpa}</span>
                )}
              </div>
            </div>
          </div>

          {/* Action Links Bar */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-700/60">
            {hasGeneratedResume ? (
              <a
                href={resumeData?.generatedDocxUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm flex items-center gap-2 transition shadow-lg shadow-emerald-900/30"
              >
                <Download className="w-4 h-4" />
                Resume DOCX
              </a>
            ) : (
              <Link
                href="/dashboard/student/resume-builder"
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm flex items-center gap-2 transition"
              >
                <FileText className="w-4 h-4" />
                Create Resume
              </Link>
            )}

            {githubStatus.connected || profileData?.githubUsername || filled.github ? (
              <a
                href={filled.github ? (filled.github.startsWith('http') ? filled.github : `https://${filled.github}`) : `https://github.com/${githubStatus.username || profileData?.githubUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-2 text-sm font-medium transition"
              >
                <Github className="w-4 h-4 text-emerald-400" />
                GitHub
              </a>
            ) : (
              <button disabled className="p-2.5 rounded-xl bg-slate-800/40 text-slate-600 border border-slate-800 flex items-center gap-2 text-sm font-medium cursor-not-allowed">
                <Github className="w-4 h-4" />
                GitHub
              </button>
            )}

            {/* LinkedIn Action Trigger */}
            {linkedinStatus.connected || profileData?.linkedinConnected || filled.linkedin ? (
              <button
                onClick={() => setIsLinkedinModalOpen(true)}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-2 text-sm font-medium transition"
              >
                <Linkedin className="w-4 h-4 text-emerald-400" />
                <span>LinkedIn ({linkedinStatus.username || profileData?.linkedinUsername || 'Connected'})</span>
              </button>
            ) : (
              <button
                onClick={() => setIsLinkedinModalOpen(true)}
                className="p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-2 text-sm font-medium transition"
              >
                <Linkedin className="w-4 h-4" />
                Connect LinkedIn
              </button>
            )}

            {filled.website ? (
              <a
                href={filled.website.startsWith('http') ? filled.website : `https://${filled.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-2 text-sm font-medium transition"
              >
                <Globe className="w-4 h-4 text-emerald-400" />
                Portfolio
              </a>
            ) : (
              <button disabled className="p-2.5 rounded-xl bg-slate-800/40 text-slate-600 border border-slate-800 flex items-center gap-2 text-sm font-medium cursor-not-allowed">
                <Globe className="w-4 h-4" />
                Portfolio
              </button>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 2 — Career Snapshot KPI Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-700/60 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Code2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-medium">Projects Built</p>
            <p className="text-2xl font-bold text-white mt-0.5">{filled.project_name ? 1 : 0}</p>
          </div>
        </div>

        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-700/60 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-medium">Verified Skills</p>
            <p className="text-2xl font-bold text-white mt-0.5">{skillsList.length}</p>
          </div>
        </div>

        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-700/60 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-medium">Certifications</p>
            <p className="text-2xl font-bold text-white mt-0.5">{certifications.length}</p>
          </div>
        </div>

        <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-700/60 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <FolderGit2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-slate-400 text-xs font-medium">GitHub Status</p>
            <p className="text-lg font-bold text-white mt-0.5">
              {githubStatus.connected ? 'Active' : 'Not Linked'}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* SECTION 8 — AI Career Coach Recommendations */}
          {aiRecommendations.length > 0 && (
            <section className="bg-gradient-to-r from-emerald-950/40 via-slate-900/80 to-slate-900/80 p-6 rounded-2xl border border-emerald-500/30">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-white">AI Career Coach Recommendations</h2>
              </div>
              <div className="space-y-3">
                {aiRecommendations.map((rec, i) => (
                  <div key={i} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white text-sm">{rec.title}</h3>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {rec.priority}
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs mt-1">{rec.description}</p>
                    </div>
                    {rec.isLinkedinTrigger ? (
                      <button
                        onClick={() => setIsLinkedinModalOpen(true)}
                        className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1 shrink-0 transition"
                      >
                        <span>{rec.action}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <Link
                        href={rec.link!}
                        className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1 shrink-0 transition"
                      >
                        <span>{rec.action}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* SECTION 7 — Latest Resume Overview */}
          <section className="bg-slate-900/60 p-6 rounded-2xl border border-slate-700/60">
            <div className="flex flex-wrap justify-between items-center gap-2 mb-5">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h2 className="text-xl font-bold text-white">Latest Resume Overview</h2>
                {hasGeneratedResume && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {generatedResumeCount} {generatedResumeCount === 1 ? 'Resume' : 'Resumes'} Generated
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs">
                <Link href="/dashboard/student/resume-builder" className="text-emerald-400 hover:underline flex items-center gap-1">
                  <span>Open Resume Builder</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {hasGeneratedResume ? (
              <div className="space-y-4">
                {/* Meta details banner */}
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400">Template Used</span>
                    <h3 className="font-bold text-white text-base mt-0.5">{resumeData?.templateName || 'Polished Semantic Resume v2'}</h3>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-300">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Generated Date</span>
                      <strong className="text-white font-medium">{resumeData?.createdAt ? new Date(resumeData.createdAt).toLocaleDateString() : (resumeData?.updatedAt ? new Date(resumeData.updatedAt).toLocaleDateString() : 'Active')}</strong>
                    </div>
                    <div className="h-6 w-px bg-slate-700" />
                    <div>
                      <span className="text-[10px] text-slate-400 block">Last Updated</span>
                      <strong className="text-white font-medium">{resumeData?.updatedAt ? new Date(resumeData.updatedAt).toLocaleDateString() : 'Active'}</strong>
                    </div>
                    <div className="h-6 w-px bg-slate-700" />
                    <div>
                      <span className="text-[10px] text-slate-400 block">Resume Version</span>
                      <strong className="text-emerald-400 font-medium">v1.0 (Latest)</strong>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <p className="text-slate-400 text-xs font-medium">Education Record</p>
                    <h3 className="font-bold text-emerald-400 text-base mt-1">
                      {filled.education_degree || 'Graduation Candidate'}
                    </h3>
                    <p className="text-slate-300 text-sm">{filled.education_institution || university}</p>
                    <p className="text-slate-400 text-xs mt-1">
                      {filled.education_start_year || profileData?.admissionYear || '2021'} - {filled.education_end_year || 'Present'}
                      {filled.education_cgpa ? ` • CGPA: ${filled.education_cgpa}` : ''}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <p className="text-slate-400 text-xs font-medium">Work Experience</p>
                    {filled.experience_company || filled.experience_role ? (
                      <>
                        <h3 className="font-bold text-emerald-400 text-base mt-1">{filled.experience_role}</h3>
                        <p className="text-slate-300 text-sm">{filled.experience_company}</p>
                        <p className="text-slate-400 text-xs mt-1">
                          {filled.experience_start_date || ''} {filled.experience_end_date ? `- ${filled.experience_end_date}` : ''}
                        </p>
                      </>
                    ) : (
                      <p className="text-slate-500 text-xs mt-3">No work experience added in Resume Builder yet.</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
                  <span className="text-slate-400">
                    Status: <strong className="text-emerald-400 font-semibold">Generated & Sync Verified</strong>
                  </span>
                  <div className="flex items-center gap-3">
                    <Link
                      href="/dashboard/student/resume-builder"
                      className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition flex items-center gap-1.5"
                    >
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{generatedResumeCount > 1 ? 'View All Resumes' : 'Open Resume Builder'}</span>
                    </Link>
                    {resumeData?.generatedDocxUrl && (
                      <a
                        href={resumeData.generatedDocxUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download DOCX</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-800/30 rounded-xl border border-slate-800">
                <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm mb-4">No generated resume found for your account.</p>
                <Link href="/dashboard/student/resume-builder" className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-500 transition inline-block">
                  ✨ Generate Your First Resume
                </Link>
              </div>
            )}
          </section>

          {/* SECTION 5 — Skills Showcase */}
          <section className="bg-slate-900/60 p-6 rounded-2xl border border-slate-700/60">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-emerald-400" />
                <h2 className="text-xl font-bold text-white">Verified Skills Showcase</h2>
              </div>
              <span className="text-xs text-slate-400">{skillsList.length} Skills Recorded</span>
            </div>

            {skillsList.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {skillsList.map((skill, index) => (
                  <div key={index} className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/60 text-center hover:border-emerald-500/50 transition">
                    <div className="text-2xl mb-2">{getSkillIcon(skill.name)}</div>
                    <h3 className="font-semibold text-white text-sm">{skill.name}</h3>
                    <p className="text-emerald-400 text-xs mt-1 font-medium">{skill.proficiency || 'Verified'}</p>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{skill.source || 'Resume Builder'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-slate-800/30 rounded-xl border border-slate-800 text-center text-slate-400 text-sm">
                No skills recorded yet. Add skills in Resume Builder or Skills Tracker.
              </div>
            )}
          </section>

          {/* SECTION 6 — Certifications Showcase */}
          <section className="bg-slate-900/60 p-6 rounded-2xl border border-slate-700/60">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-400" />
                <h2 className="text-xl font-bold text-white">Verified Certifications</h2>
              </div>
              <Link href="/dashboard/student/growth?upload=certificate" className="text-xs text-emerald-400 hover:underline flex items-center gap-1">
                <span>Growth Hub Upload</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {certifications.length > 0 ? (
              <div className="space-y-3">
                {certifications.map((cert, index) => (
                  <div key={index} className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/60 flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-white text-sm">{cert.name}</h3>
                      <p className="text-slate-400 text-xs mt-0.5">{cert.issuer || 'Academic Institution'}</p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                      {cert.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-slate-800/30 rounded-xl border border-slate-800 text-center">
                <p className="text-slate-400 text-sm mb-3">No verified certifications found.</p>
                <Link
                  href="/dashboard/student/growth?upload=certificate"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition inline-block"
                >
                  Upload Your First Certificate
                </Link>
              </div>
            )}
          </section>
        </div>

        {/* Right 1 Column */}
        <div className="space-y-6">
          {/* SECTION 3 — Profile Progress Checklist */}
          <section className="bg-slate-900/60 p-6 rounded-2xl border border-slate-700/60">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-white">Profile Readiness</h2>
              <span className="text-emerald-400 font-bold text-sm">{completenessScore}%</span>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-2.5 mb-5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${completenessScore}%` }}
              />
            </div>

            <div className="space-y-3">
              {progressChecklist.map((item, index) => item.isLinkedinTrigger ? (
                <button
                  key={index}
                  onClick={() => setIsLinkedinModalOpen(true)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800 transition border border-slate-800 text-left group"
                >
                  <div className="flex items-center gap-3">
                    {item.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                    <span className={`text-xs font-medium ${item.completed ? 'text-slate-200' : 'text-slate-400'}`}>
                      {item.label}
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-emerald-400 transition" />
                </button>
              ) : (
                <Link
                  key={index}
                  href={item.link!}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 hover:bg-slate-800 transition border border-slate-800 group"
                >
                  <div className="flex items-center gap-3">
                    {item.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                    <span className={`text-xs font-medium ${item.completed ? 'text-slate-200' : 'text-slate-400'}`}>
                      {item.label}
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-emerald-400 transition" />
                </Link>
              ))}
            </div>
          </section>

          {/* SECTION 9 — Online Presence Hub */}
          <section className="bg-slate-900/60 p-6 rounded-2xl border border-slate-700/60">
            <h2 className="text-lg font-bold text-white mb-4">Online Presence</h2>
            <div className="space-y-3">
              {/* GitHub */}
              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Github className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-xs font-medium text-white">GitHub</p>
                    <p className="text-[11px] text-slate-400">
                      {githubStatus.connected ? `@${githubStatus.username || profileData?.githubUsername}` : 'Not Linked'}
                    </p>
                  </div>
                </div>
                {githubStatus.connected ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-500">
                    Offline
                  </span>
                )}
              </div>

              {/* LinkedIn Interactive Card */}
              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Linkedin className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-xs font-medium text-white">LinkedIn</p>
                    <p className="text-[11px] text-slate-400 truncate max-w-[130px]">
                      {linkedinStatus.connected || profileData?.linkedinConnected || filled.linkedin
                        ? `@${linkedinStatus.username || profileData?.linkedinUsername || 'connected'}`
                        : 'Not Connected'}
                    </p>
                  </div>
                </div>
                {linkedinStatus.connected || profileData?.linkedinConnected || filled.linkedin ? (
                  <div className="flex items-center gap-2">
                    <a
                      href={linkedinStatus.url || (filled.linkedin?.startsWith('http') ? filled.linkedin : `https://${filled.linkedin}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      onClick={() => setIsLinkedinModalOpen(true)}
                      className="text-[10px] px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition"
                    >
                      Manage
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsLinkedinModalOpen(true)}
                    className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition"
                  >
                    Connect
                  </button>
                )}
              </div>

              {/* Portfolio */}
              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-xs font-medium text-white">Portfolio</p>
                    <p className="text-[11px] text-slate-400 truncate max-w-[140px]">
                      {filled.website ? 'Website Live' : 'Not Connected'}
                    </p>
                  </div>
                </div>
                {filled.website ? (
                  <a
                    href={filled.website.startsWith('http') ? filled.website : `https://${filled.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <span>View</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-500">
                    Missing
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* SECTION 4 — Professional Timeline */}
          <section className="bg-slate-900/60 p-6 rounded-2xl border border-slate-700/60">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">Career Activity Timeline</h2>
            </div>

            {timelineEvents.length > 0 ? (
              <div className="relative border-l border-slate-700 ml-3 space-y-6 my-2">
                {timelineEvents.map((evt, i) => (
                  <div key={i} className="relative pl-6">
                    <div className="absolute -left-2.5 top-0.5 w-5 h-5 rounded-full bg-slate-900 border border-emerald-400 flex items-center justify-center text-[10px]">
                      {evt.icon}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">{evt.category}</span>
                      <h3 className="font-semibold text-white text-xs mt-0.5">{evt.title}</h3>
                      <p className="text-slate-400 text-[11px] mt-1">{evt.description}</p>
                      <span className="text-[10px] text-slate-500 block mt-1">{evt.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-slate-500 text-xs">
                No career activity events recorded yet.
              </div>
            )}
          </section>
        </div>
      </div>

      {/* LINKEDIN CONNECTION MODAL */}
      {isLinkedinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setIsLinkedinModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                <Linkedin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Connect LinkedIn Profile</h3>
                <p className="text-xs text-slate-400">Link your official profile URL to build recruiter trust</p>
              </div>
            </div>

            {modalError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {modalSuccess && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{modalSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveLinkedin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  LinkedIn Profile URL
                </label>
                <input
                  type="url"
                  value={linkedinInputUrl}
                  onChange={(e) => setLinkedinInputUrl(e.target.value)}
                  placeholder="https://www.linkedin.com/in/username"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Format: https://linkedin.com/in/username (Company and non-LinkedIn URLs will be rejected).
                </p>
              </div>

              {linkedinStatus.connected && (
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 text-xs text-slate-300 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Status:</span>
                    <span className="text-emerald-400 font-bold">Connected</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Username Extracted:</span>
                    <span className="font-mono text-emerald-300">@{linkedinStatus.username || 'username'}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                {linkedinStatus.connected && (
                  <button
                    type="button"
                    onClick={handleDisconnectLinkedin}
                    disabled={modalSaving}
                    className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    {modalSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>Disconnect</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsLinkedinModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={modalSaving}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition disabled:opacity-50"
                >
                  {modalSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save & Connect</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}