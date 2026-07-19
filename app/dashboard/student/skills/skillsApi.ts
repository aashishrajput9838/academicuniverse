import {
  SkillRecordDTO,
  SkillDetailDTO,
  SkillProfileResponse,
  SkillSummaryResponse,
} from './types/skills';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

export async function fetchSkillProfile(backendToken: string): Promise<SkillProfileResponse> {
  const response = await fetch(`${API_BASE_URL}/api/skills/me`, {
    headers: {
      Authorization: `Bearer ${backendToken}`,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || 'Failed to fetch skill profile');
  }

  const payload = await response.json();
  if (!payload?.success || !payload?.data) {
    throw new Error('Invalid skill profile response');
  }

  return payload.data as SkillProfileResponse;
}

export async function fetchSkillEvidence(
  backendToken: string,
  skillId: string,
): Promise<SkillDetailDTO> {
  const response = await fetch(
    `${API_BASE_URL}/api/skills/me/${encodeURIComponent(skillId)}/evidence`,
    {
      headers: {
        Authorization: `Bearer ${backendToken}`,
      },
    },
  );

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || 'Failed to fetch skill evidence');
  }

  const payload = await response.json();
  if (!payload?.success || !payload?.data) {
    throw new Error('Invalid skill evidence response');
  }

  return payload.data as SkillDetailDTO;
}

export async function fetchSkillSummary(backendToken: string): Promise<SkillSummaryResponse> {
  const response = await fetch(`${API_BASE_URL}/api/skills/me/summary`, {
    headers: {
      Authorization: `Bearer ${backendToken}`,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || 'Failed to fetch skill summary');
  }

  const payload = await response.json();
  if (!payload?.success || !payload?.data) {
    throw new Error('Invalid skill summary response');
  }

  return payload.data as SkillSummaryResponse;
}
