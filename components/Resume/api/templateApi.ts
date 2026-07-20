import type { ResumeTemplateDTO } from '../types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

async function request<T>(
  endpoint: string,
  options: RequestInit,
  backendToken: string
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${backendToken}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || `Request failed: ${response.status}`);
  }

  const payload = await response.json();
  if (!payload?.success || !payload?.data) {
    throw new Error('Invalid API response');
  }

  return payload.data;
}

export async function uploadTemplate(
  backendToken: string,
  formData: FormData
): Promise<ResumeTemplateDTO> {
  const response = await fetch(`${API_BASE_URL}/api/resume/templates`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${backendToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || `Upload failed: ${response.status}`);
  }

  const payload = await response.json();
  if (!payload?.success || !payload?.data) {
    throw new Error('Invalid upload response');
  }

  return payload.data;
}

export async function fetchAllTemplates(backendToken: string): Promise<ResumeTemplateDTO[]> {
  return request<ResumeTemplateDTO[]>('/api/resume/templates', { method: 'GET' }, backendToken);
}

export async function deleteTemplate(backendToken: string, templateId: string): Promise<void> {
  await request<void>(
    `/api/resume/templates/${encodeURIComponent(templateId)}`,
    { method: 'DELETE' },
    backendToken
  );
}
