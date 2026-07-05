'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { apiRequest } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  senderName: string | null;
  senderEmail: string | null;
  snippet: string;
  receivedAt: string | null;
  isUnread: boolean;
  labels: string[];
}

interface GmailMessagesResponse {
  messages: GmailMessage[];
  nextPageToken: string | null;
  resultSizeEstimate: number | null;
}

const filterOptions = [
  { label: 'All Mail', value: 'ALL' },
  { label: 'Unread', value: 'UNREAD' },
  { label: 'Inbox', value: 'INBOX' },
  { label: 'Starred', value: 'STARRED' },
  { label: 'Sent', value: 'SENT' },
];

const sanitizeQueryValue = (value: string) => value.trim();

const buildLabelQuery = (filter: string): { labelIds?: string[]; q?: string } => {
  switch (filter) {
    case 'UNREAD':
      return { q: 'is:unread' };
    case 'INBOX':
      return { labelIds: ['INBOX'] };
    case 'STARRED':
      return { labelIds: ['STARRED'] };
    case 'SENT':
      return { labelIds: ['SENT'] };
    default:
      return {};
  }
};

export default function MailExplorerPage() {
  const { user, backendToken, loading: authLoading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [pageTokenHistory, setPageTokenHistory] = useState<string[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [emptyState, setEmptyState] = useState(false);
  const [queryInFlight, setQueryInFlight] = useState<AbortController | null>(null);
  const searchDebounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastRequestId = useRef(0);

  const queryParams = useMemo(() => {
    const base = buildLabelQuery(filter);
    const search = searchText.trim();
    if (search) {
      const existingQ = base.q ? `${base.q} ` : '';
      return { ...base, q: `${existingQ}${search}`.trim() };
    }
    return base;
  }, [filter, searchText]);

  const fetchGmailStatus = useCallback(async () => {
    if (!user) return;
    try {
      const status = await apiRequest('/api/gmail/status', {
        headers: { Authorization: `Bearer ${backendToken}` },
      });
      setConnected(status.data.connected);
      return status.data.connected;
    } catch (err) {
      console.error('Failed to fetch Gmail status:', err);
      setConnected(false);
      return false;
    }
  }, [user]);

  const fetchMessages = useCallback(async (options: { pageToken?: string; reset?: boolean; searchQuery?: string } = {}) => {
    if (!user || !backendToken) return;
    const requestId = ++lastRequestId.current;

    if (queryInFlight) {
      queryInFlight.abort();
    }

    const controller = new AbortController();
    setQueryInFlight(controller);
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      const actualPageToken = options.pageToken || '';
      if (actualPageToken) params.set('pageToken', actualPageToken);
      params.set('maxResults', '25');
      const searchValue = options.searchQuery !== undefined ? options.searchQuery.trim() : queryParams.q;
      if (searchValue) params.set('q', searchValue);
      if (queryParams.labelIds) params.set('labelIds', queryParams.labelIds.join(','));

      const response = await apiRequest(`/api/gmail/messages?${params.toString()}`, {
        headers: { Authorization: `Bearer ${backendToken}` },
        signal: controller.signal,
      });

      if (requestId !== lastRequestId.current) {
        return;
      }

      setMessages(response.data.messages);
      setNextPageToken(response.data.nextPageToken);
      setEmptyState(response.data.messages.length === 0);
      setError(null);

      if (options.reset) {
        setPageTokenHistory([]);
        setPageNumber(1);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Failed to fetch Gmail messages:', err);
      setError(err.message || 'Unable to load mail.');
      setEmptyState(false);
    } finally {
      setLoading(false);
      setQueryInFlight(null);
    }
  }, [queryParams, user, queryInFlight]);

  useEffect(() => {
    if (!user || !backendToken || authLoading) return;
    let mounted = true;

    const initialize = async () => {
      const isConnected = await fetchGmailStatus();
      if (!mounted) return;
      if (!isConnected) return;
      await fetchMessages({ reset: true });
    };

    initialize();
    return () => { mounted = false; if (queryInFlight) queryInFlight.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, backendToken, authLoading, fetchGmailStatus]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = sanitizeQueryValue(event.target.value);
    setSearchText(value);
    if (searchDebounceTimeout.current) {
      clearTimeout(searchDebounceTimeout.current);
    }
    const capturedQuery = value;
    searchDebounceTimeout.current = setTimeout(() => {
      setPageTokenHistory([]);
      setPageNumber(1);
      fetchMessages({ reset: true, searchQuery: capturedQuery });
    }, 500) as unknown as ReturnType<typeof setTimeout>;
  };

  const handleFilterChange = (value: string) => {
    setFilter(value);
    setPageTokenHistory([]);
    setPageNumber(1);
    fetchMessages({ reset: true });
  };

  const handleNextPage = () => {
    if (!nextPageToken || loading) return;
    setPageTokenHistory((prev) => [...prev, nextPageToken]);
    setPageNumber((prev) => prev + 1);
    fetchMessages({ pageToken: nextPageToken });
  };

  const handlePreviousPage = () => {
    if (pageTokenHistory.length === 0 || loading) return;
    const previousHistory = [...pageTokenHistory];
    const previousToken = previousHistory.pop() || '';
    setPageTokenHistory(previousHistory);
    setPageNumber((prev) => Math.max(1, prev - 1));
    fetchMessages({ pageToken: previousHistory[previousHistory.length - 1] || undefined });
  };

  const handleRetry = () => {
    setError(null);
    fetchMessages({ reset: true });
  };

  const handleMessageSelect = useCallback((messageId: string) => {
    router.push(`/dashboard/student/mail/${messageId}`);
  }, [router]);

  if (authLoading || connected === null) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-emerald-400 border-opacity-50" />
      </div>
    );
  }

  if (!connected) {
    return (
      <Card className="bg-slate-800/70 border-slate-700">
        <CardHeader>
          <CardTitle>Mail Explorer</CardTitle>
          <p className="text-slate-400">Connect Gmail to browse your messages.</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-slate-300">Gmail is not currently connected. Use the Events page to reconnect and sync your account.</p>
            <Button asChild>
              <Link href="/dashboard/student/events">Go to Events & Opportunities</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Mail Explorer</h1>
          <p className="text-slate-400">Browse and search emails from your connected Gmail account.</p>
        </div>
      </div>

      <Card className="bg-slate-800/70 border-slate-700">
        <CardContent>
          <div className="grid gap-4 md:grid-cols-[1fr_auto] lg:grid-cols-[2fr_1fr] items-center">
            <Input
              value={searchText}
              onChange={handleSearchChange}
              placeholder="Search mail..."
              className="bg-slate-900/70 text-white border-slate-700"
            />

            <div className="flex flex-wrap gap-2 justify-end">
              {filterOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={filter === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleFilterChange(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card className="bg-slate-800/70 border-red-500/50">
          <CardContent>
            <div className="space-y-4">
              <p className="text-red-300">{error}</p>
              <Button onClick={handleRetry}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="bg-slate-800/60 border-slate-700">
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : !error && emptyState ? (
          <Card className="bg-slate-800/70 border-slate-700">
            <CardContent>
              <div className="text-slate-300">
                No emails matched your search or filter. Try a different query or remove the filters.
              </div>
            </CardContent>
          </Card>
        ) : (
          messages.map((message) => (
            <Card
              key={message.id}
              className="bg-slate-800/60 border-slate-700 transition hover:border-emerald-500/60 cursor-pointer"
              role="button"
              tabIndex={0}
              aria-label={`Open mail: ${message.subject}`}
              onClick={() => handleMessageSelect(message.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleMessageSelect(message.id);
                }
              }}
            >
                  <CardContent>
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
                      <div className="space-y-2">
                        <Link href={`/dashboard/student/mail/${message.id}`} className="text-lg font-semibold text-white hover:text-emerald-400">
                          {message.subject}
                        </Link>
                        <div className="text-slate-400 text-sm">
                          {message.senderName || message.senderEmail || 'Unknown sender'}
                          {message.senderEmail ? ` · ${message.senderEmail}` : ''}
                        </div>
                      </div>
                      <div className="text-slate-500 text-xs text-right">
                        <div>{message.receivedAt ? new Date(message.receivedAt).toLocaleString() : 'Unknown date'}</div>
                        <div className="mt-2">
                          {message.isUnread ? <span className="inline-flex items-center rounded-full bg-emerald-500/20 text-emerald-200 px-2 py-0.5 text-[11px]">Unread</span> : null}
                        </div>
                      </div>
                    </div>

                    <p className="mt-4 text-slate-300 text-sm line-clamp-2">{message.snippet}</p>

                    {message.labels.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {message.labels.slice(0, 3).map((label) => (
                          <span key={label} className="rounded-full bg-slate-700/60 px-2 py-1 text-[11px] uppercase tracking-widest text-slate-300">
                            {label.replace('_', ' ')}
                          </span>
                        ))}
                        {message.labels.length > 3 && <span className="rounded-full bg-slate-700/60 px-2 py-1 text-[11px] uppercase tracking-widest text-slate-300">+{message.labels.length - 3} more</span>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-slate-400 text-sm">Page {pageNumber}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={pageNumber <= 1 || loading} onClick={handlePreviousPage}>
                Previous Page
              </Button>
              <Button variant="default" size="sm" disabled={!nextPageToken || loading} onClick={handleNextPage}>
                Next Page
              </Button>
            </div>
          </div>
    </div>
  );
}
