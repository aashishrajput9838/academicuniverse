'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, FileText, ChevronRight, Check, Download, ArrowLeft, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import html2pdf from 'html2pdf.js';

interface Template {
  _id: string;
  templateName: string;
  type: string;
  target: string;
  uploadedBy: { name: string; email: string };
  createdAt: string;
}

export default function ResumeBuilder() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    education: '',
    projects: '',
    skills: '',
    experience: ''
  });

  const [aiTone, setAiTone] = useState('none');

  // Preview State
  const [isGenerating, setIsGenerating] = useState(false);
  const [htmlPreview, setHtmlPreview] = useState<string>('');
  const [docxBase64, setDocxBase64] = useState<string>('');
  const previewRef = useRef<HTMLDivElement>(null);

  const { toast } = useToast();
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${baseUrl}/api/resume/templates`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch templates');
      const data = await res.json();
      setTemplates(data.data || []);
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Could not load templates', variant: 'destructive' });
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleTemplateSelect = async (template: Template) => {
    setSelectedTemplate(template);
    
    // Check if we have a saved draft for this template
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${baseUrl}/api/resume/draft?templateId=${template._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          setFormData(data.data);
          toast({ title: 'Draft Loaded', description: 'Your previous draft was loaded automatically.' });
        }
      }
    } catch (e) {
      console.error('Failed to load draft:', e);
    }
    
    setStep(2);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;

    try {
      setIsGenerating(true);
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${baseUrl}/api/resume/generate`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          templateId: selectedTemplate._id,
          tone: aiTone !== 'none' ? aiTone : undefined,
          data: formData
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Generation failed');
      }

      const data = await res.json();
      setHtmlPreview(data.data.htmlPreview);
      setDocxBase64(data.data.docxBase64);
      setStep(3);
      toast({ title: 'Success', description: 'Resume generated successfully.' });
    } catch (error: any) {
      console.error(error);
      toast({ title: 'Generation Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadDocx = () => {
    if (!docxBase64) return;
    const link = document.createElement('a');
    link.href = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${docxBase64}`;
    link.download = `Resume_${formData.name.replace(/\s+/g, '_')}.docx`;
    link.click();
  };

  const handleDownloadPdf = () => {
    if (!previewRef.current) return;
    const element = previewRef.current;
    const opt = {
      margin: 10,
      filename: `Resume_${formData.name.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-700 shadow-xl min-h-[500px]">
      {/* STEPS INDICATOR */}
      <div className="flex items-center justify-center mb-10">
        <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${step >= 1 ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800 text-slate-500'}`}>1</div>
        <div className={`w-16 h-1 ${step >= 2 ? 'bg-emerald-500' : 'bg-slate-800'}`}></div>
        <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${step >= 2 ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800 text-slate-500'}`}>2</div>
        <div className={`w-16 h-1 ${step >= 3 ? 'bg-emerald-500' : 'bg-slate-800'}`}></div>
        <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${step >= 3 ? 'bg-emerald-500 text-slate-900' : 'bg-slate-800 text-slate-500'}`}>3</div>
      </div>

      {step === 1 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <h2 className="text-xl font-semibold text-white mb-4">Select a Template</h2>
          {loadingTemplates ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/50 rounded-xl">
              <p className="text-slate-400">No templates have been assigned to your department or section yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map(template => (
                <button
                  key={template._id}
                  onClick={() => handleTemplateSelect(template)}
                  className="bg-slate-800 hover:bg-slate-700 hover:border-emerald-500/50 transition border border-slate-700 rounded-xl p-6 text-left group"
                >
                  <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center mb-4 group-hover:bg-emerald-500/10 group-hover:text-emerald-400 transition">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{template.templateName}</h3>
                  <p className="text-xs text-slate-400 mb-4 flex items-center gap-2">
                    <span className="bg-slate-900 px-2 py-1 rounded text-emerald-400">{template.type}</span>
                    {template.target && <span className="bg-slate-900 px-2 py-1 rounded text-blue-400">{template.target}</span>}
                  </p>
                  <p className="text-xs text-slate-500">By {template.uploadedBy?.name || 'Faculty'}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <form onSubmit={handleGenerate} className="space-y-6 animate-in fade-in slide-in-from-right-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <button type="button" onClick={() => setStep(1)} className="text-slate-400 hover:text-white"><ArrowLeft className="w-5 h-5"/></button>
              Fill Your Information
            </h2>
            <span className="text-sm text-slate-400 bg-slate-800 px-3 py-1 rounded-full">Template: {selectedTemplate?.templateName}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Full Name</label>
              <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Email Address</label>
              <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="john@example.com" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Phone</label>
              <input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="+1 234 567 890" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Skills (Comma separated)</label>
              <input type="text" value={formData.skills} onChange={(e) => setFormData({...formData, skills: e.target.value})} className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="React, Node.js, Python..." />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-300">Education Details</label>
              <textarea rows={3} value={formData.education} onChange={(e) => setFormData({...formData, education: e.target.value})} className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="B.Tech in Computer Science, 2020-2024..." />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-300">Key Projects</label>
              <textarea rows={3} value={formData.projects} onChange={(e) => setFormData({...formData, projects: e.target.value})} className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="- E-Commerce App built with React and Firebase..." />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-300">Experience / Internships</label>
              <textarea rows={3} value={formData.experience} onChange={(e) => setFormData({...formData, experience: e.target.value})} className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="- Software Engineering Intern at XYZ Corp..." />
            </div>
          </div>

          <div className="bg-emerald-900/20 border border-emerald-500/20 rounded-xl p-6">
            <h3 className="text-emerald-400 font-semibold mb-2 flex items-center gap-2">
              ✨ AI Content Enhancement
            </h3>
            <p className="text-sm text-slate-300 mb-4">
              Our AI can automatically rewrite and polish your Experience, Projects, Skills, and Education fields to be ATS-friendly. Select a tone below to enable.
            </p>
            <select 
              value={aiTone} 
              onChange={(e) => setAiTone(e.target.value)}
              className="w-full md:w-1/2 px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="none">Disabled (Use My Original Text)</option>
              <option value="professional">Professional & ATS-Friendly</option>
              <option value="creative">Creative & Impactful</option>
              <option value="concise">Concise & Direct</option>
            </select>
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-sm text-slate-400 flex items-center gap-1"><Save className="w-4 h-4"/> Drafts automatically save on submit</span>
            <button type="submit" disabled={isGenerating} className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl font-bold flex items-center gap-2 transition disabled:opacity-50 shadow-lg shadow-emerald-500/20">
              {isGenerating ? <><Loader2 className="w-5 h-5 animate-spin" /> {aiTone !== 'none' ? 'AI Enhancing...' : 'Generating...'}</> : 'Preview Resume'}
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <div className="animate-in fade-in slide-in-from-right-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-6 border-b border-slate-700">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                <button onClick={() => setStep(2)} className="text-slate-400 hover:text-white p-1 bg-slate-800 rounded-full mr-2"><ArrowLeft className="w-4 h-4"/></button>
                Preview Your Resume
              </h2>
              <p className="text-slate-400">Review the generated result and download in your preferred format.</p>
            </div>
            <div className="flex gap-3 mt-4 md:mt-0">
              <button onClick={handleDownloadDocx} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center gap-2 transition border border-slate-600">
                <Download className="w-4 h-4" /> DOCX
              </button>
              <button onClick={handleDownloadPdf} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-lg flex items-center gap-2 transition shadow-lg shadow-emerald-500/20">
                <Download className="w-4 h-4" /> PDF
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg p-8 shadow-2xl mx-auto max-w-4xl text-black overflow-auto max-h-[70vh]">
            {/* Display Mammoth HTML output */}
            <div 
              ref={previewRef}
              className="prose max-w-none resume-preview-content" 
              dangerouslySetInnerHTML={{ __html: htmlPreview }} 
            />
          </div>
          
          <style dangerouslySetInnerHTML={{__html: `
            .resume-preview-content h1, .resume-preview-content h2, .resume-preview-content h3 {
              color: #111;
              margin-top: 1em;
              margin-bottom: 0.5em;
            }
            .resume-preview-content p {
              margin-bottom: 0.5em;
              color: #333;
            }
            .resume-preview-content ul {
              list-style-type: disc;
              padding-left: 20px;
              margin-bottom: 1em;
            }
          `}} />
        </div>
      )}
    </div>
  );
}
