import type { ResumeTemplateDTO, GenerateResumeResponse } from '../types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

async function request<T>(
  endpoint: string,
  options: RequestInit,
  backendToken: string,
  requireData: boolean = true
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${backendToken}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || `Request failed: ${response.status}`);
  }

  const payload = await response.json();
  if (!payload?.success || (requireData && payload?.data == null)) {
    throw new Error('Invalid API response');
  }

  return payload.data;
}

export async function fetchTemplates(backendToken: string, target?: string): Promise<ResumeTemplateDTO[]> {
  const url = target ? `/api/resume/templates?target=${encodeURIComponent(target)}` : '/api/resume/templates';
  return request<ResumeTemplateDTO[]>(url, { method: 'GET' }, backendToken);
}

export async function saveDraft(
  backendToken: string,
  templateId: string,
  data: Record<string, any>
): Promise<{ studentResumeId: string; updatedAt: string }> {
  return request<{ studentResumeId: string; updatedAt: string }>(
    '/api/resume/draft',
    {
      method: 'POST',
      body: JSON.stringify({ templateId, data }),
    },
    backendToken
  );
}

export async function generateResume(
  backendToken: string,
  templateId: string,
  data: Record<string, any>,
  tone?: string
): Promise<GenerateResumeResponse> {
  return request<GenerateResumeResponse>(
    '/api/resume/generate',
    {
      method: 'POST',
      body: JSON.stringify({ templateId, data, tone }),
    },
    backendToken
  );
}

export async function fetchDraft(backendToken: string, templateId: string): Promise<Record<string, any> | null> {
  return request<Record<string, any> | null>(
    `/api/resume/draft?templateId=${encodeURIComponent(templateId)}`,
    { method: 'GET' },
    backendToken,
    false
  );
}
