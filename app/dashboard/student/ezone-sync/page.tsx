'use client';

import { useState, useCallback, useEffect } from 'react';
import { ezoneApi } from '@/lib/api/ezone';
import { useAuth } from '@/lib/AuthContext';
import { normalizeDate } from '@shared-utils/date';
import LiveSyncLogs from '@/components/ezone/LiveSyncLogs';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw, CheckCircle2, User, BookOpen, GraduationCap, Calendar, Lock } from 'lucide-react';

/**
 * SyncState Machine:
 * idle -> (sendOtp) -> otp_sent -> (verifyOtp) -> verifying -> syncing -> completed
 */
type SyncState = 'idle' | 'otp_sent' | 'verifying' | 'syncing' | 'completed' | 'error';

export default function EzoneSyncPage() {
    const [state, setState] = useState<SyncState>('idle');
    const [systemId, setSystemId] = useState('');
    const [sessionId, setSessionId] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const { backendUser } = useAuth();
    const { toast } = useToast();

    // Check for existing profile on page mount
    useEffect(() => {
        const fetchExistingProfile = async () => {
            try {
                const profileRes = await ezoneApi.getProfile();
                if (profileRes.success && profileRes.data) {
                    setProfile(profileRes.data);
                    setState('completed');
                }
            } catch (error) {
                // No profile found or error, just stay in idle state
                console.log('No existing profile found or error fetching profile');
            }
        };

        fetchExistingProfile();
    }, []);

    const handleSendOtp = async () => {
        if (!systemId) return;
        setLoading(true);
        try {
            const res = await ezoneApi.sendOtp(systemId);
            if (res.success && res.sessionId) {
                setSessionId(res.sessionId);
                setState('otp_sent');
                toast({ title: 'OTP Sent', description: 'Please check your university email.' });
            } else {
                throw new Error(res.message || 'Failed to send OTP');
            }
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp || !sessionId) return;
        setLoading(true);
        setState('verifying');
        try {
            // Step 1: Verify OTP, scrape data, and persist to MongoDB
            const res = await ezoneApi.verifyOtp(systemId, otp, sessionId);
            
            if (res.success) {
                setState('syncing');
                
                // Use profile returned directly by verifyOtp or fetch via getProfile()
                let profileData = res.data;
                if (!profileData) {
                    const profileRes = await ezoneApi.getProfile();
                    if (profileRes.success && profileRes.data) {
                        profileData = profileRes.data;
                    }
                }

                if (profileData) {
                    setProfile(profileData);
                    setState('completed');
                    toast({ title: 'Sync Complete', description: 'Your academic profile is now up to date.' });
                } else {
                    throw new Error('Verification completed, but profile data could not be retrieved.');
                }
            } else {
                throw new Error(res.message || 'Verification failed');
            }
        } catch (error: any) {
            console.error('Sync Flow Error:', error);
            setState('otp_sent'); // Allow retry
            
            if (error.status === 401 || error.message?.includes('401')) {
                toast({ 
                    title: 'Authentication Failed', 
                    description: 'Please connect your college profile first.', 
                    variant: 'destructive' 
                });
                resetFlow();
            } else {
                toast({ 
                    title: 'Sync Error', 
                    description: error.message || 'An unexpected error occurred.', 
                    variant: 'destructive' 
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const resetFlow = () => {
        setState('idle');
        setOtp('');
        setSystemId('');
        setSessionId('');
        setProfile(null);
        setLoading(false);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 p-6">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    Ezone Sync
                    {state === 'completed' && <CheckCircle2 className="text-emerald-500 h-6 w-6" />}
                </h1>
                <p className="text-slate-400">Integrate your official academic records directly from Sharda Ezone.</p>
            </div>

            {state === 'idle' && (
                <Card className="bg-slate-800/50 backdrop-blur-md border-slate-700 animate-in fade-in slide-in-from-bottom-4">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Lock className="h-5 w-5 text-emerald-400" />
                            Connect Your Account
                        </CardTitle>
                        <CardDescription className="text-slate-400">Enter your university System ID to begin the authorized sync process.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="systemId" className="text-slate-300">System ID</Label>
                            <Input 
                                id="systemId"
                                placeholder="e.g. 2023XXXXXX"
                                value={systemId}
                                onChange={(e) => setSystemId(e.target.value)}
                                className="bg-slate-900/50 border-slate-700 text-white focus:ring-emerald-500"
                                disabled={loading}
                            />
                        </div>
                        <Button 
                            onClick={handleSendOtp} 
                            disabled={loading || !systemId}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white transition-all"
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Send OTP'}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {state === 'otp_sent' && (
                <Card className="bg-slate-800/50 backdrop-blur-md border-slate-700 animate-in zoom-in-95">
                    <CardHeader>
                        <CardTitle className="text-white">Enter OTP</CardTitle>
                        <CardDescription className="text-slate-400">A 6-digit verification code has been sent to your student email.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="otp" className="text-slate-300">Verification Code</Label>
                            <Input 
                                id="otp"
                                placeholder="XXXXXX"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="bg-slate-900/50 border-slate-700 text-white text-center text-2xl tracking-widest font-mono"
                                maxLength={6}
                                disabled={loading}
                            />
                        </div>
                        <Button 
                            onClick={handleVerifyOtp} 
                            disabled={loading || otp.length < 6}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Verify & Sync'}
                        </Button>
                        <Button variant="link" onClick={resetFlow} className="w-full text-slate-400 hover:text-white text-sm">
                            Use a different System ID
                        </Button>
                    </CardContent>
                </Card>
            )}

            {(state === 'verifying' || state === 'syncing') && (
                <Card className="bg-slate-800/50 backdrop-blur-md border-slate-700 py-12">
                    <CardContent className="flex flex-col items-center justify-center space-y-4">
                        <div className="relative">
                            <RefreshCw className="h-12 w-12 text-emerald-500 animate-spin" />
                            <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full"></div>
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-white capitalize">{state}...</h3>
                            <p className="text-slate-400 text-sm">
                                {state === 'verifying' ? 'Verifying OTP with university servers' : 'Fetching your academic profile data'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Live Automation Logs */}
            <LiveSyncLogs 
                userId={backendUser?.id || ''} 
                sessionId={systemId}
                isActive={state !== 'idle' && state !== 'completed'} 
            />

            {state === 'completed' && profile && (
                <div className="space-y-6 animate-in fade-in duration-500 slide-in-from-top-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard 
                            icon={<CheckCircle2 className="text-emerald-400" />} 
                            label="Attendance" 
                            value={`${(profile.attendancePercentage || 0).toFixed(1)}%`} 
                        />
                        <StatCard 
                            icon={<GraduationCap className="text-blue-400" />} 
                            label="CGPA" 
                            value="N/A" 
                        />
                        <StatCard 
                            icon={<Calendar className="text-purple-400" />} 
                            label="Semester" 
                            value="N/A" 
                        />
                        <StatCard 
                            icon={<BookOpen className="text-orange-400" />} 
                            label="System ID" 
                            value={profile.systemId || 'N/A'} 
                        />
                    </div>

                    <Card className="bg-slate-800/50 backdrop-blur-md border-slate-700">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-white">Academic Profile</CardTitle>
                                <CardDescription className="text-slate-400">Synced from Ezone ERP</CardDescription>
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={resetFlow}
                                className="border-slate-700 text-slate-300 hover:bg-slate-700"
                            >
                                <RefreshCw className="mr-2 h-4 w-4" /> Resync
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50">
                                <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                    <User className="text-emerald-400 h-6 w-6" />
                                </div>
                                <div>
                                    <div className="text-white font-bold">{profile.studentName}</div>
                                    <div className="text-slate-400 text-sm">System ID: {profile.systemId} • {profile.program}</div>
                                    <div className="text-slate-500 text-xs mt-1">{profile.school} • Status: {profile.status}</div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Attendance Breakdown</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="p-3 bg-slate-900/30 rounded-lg border border-slate-700/30">
                                        <div className="text-xs text-slate-500 uppercase">Total Classes</div>
                                        <div className="text-lg font-bold text-white">{profile.totalClasses || 0}</div>
                                    </div>
                                    <div className="p-3 bg-slate-900/30 rounded-lg border border-slate-700/30">
                                        <div className="text-xs text-slate-500 uppercase">Present</div>
                                        <div className="text-lg font-bold text-emerald-400">{profile.presentClasses || 0}</div>
                                    </div>
                                    <div className="p-3 bg-slate-900/30 rounded-lg border border-slate-700/30">
                                        <div className="text-xs text-slate-500 uppercase">Absent</div>
                                        <div className="text-lg font-bold text-red-400">{profile.absentClasses || 0}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="text-xs text-slate-500 text-right italic">
                                Last synced: {profile.lastSyncedAt ? new Date(normalizeDate(profile.lastSyncedAt).isoDateTime ?? profile.lastSyncedAt).toLocaleString() : 'Just now'}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) {
    return (
        <Card className="bg-slate-800/50 backdrop-blur-md border-slate-700 hover:border-emerald-500/30 transition-all duration-300">
            <CardContent className="p-6">
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-slate-900/50 rounded-lg">
                        {icon}
                    </div>
                    <div>
                        <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{label}</div>
                        <div className="text-2xl font-bold text-white">{value}</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
