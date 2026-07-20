export function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getTemplateTypeLabel(type: string): string {
  switch (type) {
    case 'global':
      return 'Global';
    case 'section':
      return 'Section';
    case 'department':
      return 'Department';
    default:
      return type;
  }
}
