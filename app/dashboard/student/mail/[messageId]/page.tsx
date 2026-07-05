'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { apiRequest } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface GmailMessageDetail {
  id: string;
  threadId: string;
  subject: string;
  from: string | null;
  to: string | null;
  date: string | null;
  snippet: string;
  bodyText: string;
  labels: string[];
  attachments: Array<{ filename: string; mimeType: string; size: number; attachmentId?: string }>;
}

const safeText = (text: string) => {
  return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};

export default function MailMessageDetailPage() {
  const params = useParams() as { messageId?: string };
  const router = useRouter();
  const { user, backendToken, loading: authLoading } = useAuth();
  const [message, setMessage] = useState<GmailMessageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !backendToken || authLoading) return;
    if (!params.messageId) {
      setError('Invalid message ID');
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const loadMessage = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiRequest(`/api/gmail/messages/${params.messageId}`, {
          headers: { Authorization: `Bearer ${backendToken}` },
          signal: controller.signal,
        });
        setMessage(response.data);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('Failed to fetch message detail:', err);
        setError(err.message || 'Unable to load message details.');
      } finally {
        setLoading(false);
      }
    };

    loadMessage();

    return () => controller.abort();
  }, [user, authLoading, params.messageId]);

  if (authLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-400 border-opacity-50" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-slate-800/70 border-red-500/50">
        <CardHeader>
          <CardTitle>Message Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-300 mb-4">{error}</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </CardContent>
      </Card>
    );
  }

  if (!message) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Mail Details</h1>
          <p className="text-slate-400">Review the selected email safely.</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>Back to Mail Explorer</Button>
      </div>

      <Card className="bg-slate-800/70 border-slate-700">
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">{message.subject}</h2>
              <div className="text-slate-400 text-sm">
                <div><span className="font-medium text-slate-200">From:</span> {message.from || 'Unknown sender'}</div>
                <div><span className="font-medium text-slate-200">To:</span> {message.to || 'Unknown recipient'}</div>
                <div><span className="font-medium text-slate-200">Date:</span> {message.date ? new Date(message.date).toLocaleString() : 'Unknown'}</div>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {message.labels.map((label) => (
                <span key={label} className="inline-flex items-center rounded-full bg-slate-700/70 px-2 py-1 text-xs uppercase tracking-widest text-slate-300">
                  {label.replace('_', ' ')}
                </span>
              ))}
            </div>

            <div className="rounded-2xl bg-slate-900/60 border border-slate-700 p-4 text-slate-200 whitespace-pre-wrap break-words">
              {message.bodyText ? safeText(message.bodyText) : message.snippet}
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">Attachments</h3>
              {message.attachments.length === 0 ? (
                <p className="text-slate-400">No attachments found.</p>
              ) : (
                <div className="grid gap-3">
                  {message.attachments.map((attachment, index) => (
                    <div key={index} className="rounded-2xl bg-slate-900/60 border border-slate-700 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-white font-medium">{attachment.filename}</div>
                          <div className="text-slate-400 text-sm">{attachment.mimeType}</div>
                        </div>
                        <div className="text-slate-400 text-sm">{attachment.size ? `${attachment.size.toLocaleString()} bytes` : 'Size unknown'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
