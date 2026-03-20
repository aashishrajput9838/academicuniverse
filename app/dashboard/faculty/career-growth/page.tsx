'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { FiDownload, FiUsers, FiTrendingUp } from 'react-icons/fi';

export default function FacultyCareerGrowthPage() {
    const { token } = useAuth();
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState('');

    const handleDownloadExcel = async () => {
        if (!token) {
            setDownloadError('You must be logged in to download student data.');
            return;
        }

        setIsDownloading(true);
        setDownloadError('');

        try {
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';
            
            const response = await fetch(`${API_BASE_URL}/export/students`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('You do not have permission to download this data.');
                }
                throw new Error('Failed to generate the Excel file. Please try again.');
            }

            // Convert the response stream into a Blob representing the Excel file
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            
            // Create a temporary anchor element to trigger the browser download
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = 'students.xlsx';
            document.body.appendChild(a);
            a.click();
            
            // Cleanup the DOM and blob memory
            a.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error: any) {
            setDownloadError(error.message);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">
                        Career Growth Tracking
                    </h1>
                    <p className="text-slate-400 mt-2">
                        Monitor, analyze, and easily export all student endpoints for professional development and placement tracking.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                {/* Export Module */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between">
                    <div>
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4">
                            <FiDownload className="w-6 h-6 text-emerald-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-slate-100 mb-2">Student Data Export</h2>
                        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                            Generate a comprehensive, one-click spreadsheet containing the social links, identification, and resume data for all authenticated students under your organization.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {downloadError && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                                {downloadError}
                            </div>
                        )}
                        <button 
                            onClick={handleDownloadExcel}
                            disabled={isDownloading}
                            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-white transition-all shadow-lg ${
                                isDownloading 
                                    ? 'bg-slate-600 cursor-not-allowed opacity-70' 
                                    : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 hover:scale-[1.02] shadow-emerald-500/20 active:scale-95'
                            }`}
                        >
                            {isDownloading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Generating Spreadsheet...
                                </>
                            ) : (
                                <>
                                    <FiDownload className="w-5 h-5" />
                                    Download Student Data (Excel)
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Coming Soon Module */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-xl shadow-xl border-dashed opacity-70">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                        <FiTrendingUp className="w-6 h-6 text-blue-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-100 mb-2">Placement Analytics</h2>
                    <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                        Visualizing organizational hiring trends, section-wide program competencies, and deep career insights will be available here soon.
                    </p>
                    <div className="h-32 border border-slate-700/50 rounded-lg flex items-center justify-center bg-slate-900/50">
                        <span className="text-slate-500 font-medium">Coming Soon</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
