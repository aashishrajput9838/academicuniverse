/**
 * Issuer Logos & Brand Mapping Utility
 * Returns branding color, icon metadata, and badge styling for known certificate issuers.
 */

export interface IssuerBrand {
  name: string;
  shortName: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  iconBg: string;
  logoSvg?: string;
}

export function getIssuerBrand(issuerName?: string): IssuerBrand {
  const issuer = (issuerName || '').trim().toLowerCase();

  if (issuer.includes('owasp')) {
    return {
      name: 'OWASP Foundation',
      shortName: 'OWASP',
      badgeBg: 'bg-cyan-500/10',
      badgeText: 'text-cyan-400',
      badgeBorder: 'border-cyan-500/20',
      iconBg: 'from-cyan-600 to-blue-600',
    };
  }

  if (issuer.includes('aws') || issuer.includes('amazon')) {
    return {
      name: 'Amazon Web Services',
      shortName: 'AWS',
      badgeBg: 'bg-amber-500/10',
      badgeText: 'text-amber-400',
      badgeBorder: 'border-amber-500/20',
      iconBg: 'from-amber-500 to-orange-600',
    };
  }

  if (issuer.includes('google')) {
    return {
      name: 'Google Cloud',
      shortName: 'Google',
      badgeBg: 'bg-blue-500/10',
      badgeText: 'text-blue-400',
      badgeBorder: 'border-blue-500/20',
      iconBg: 'from-blue-500 via-red-500 to-amber-500',
    };
  }

  if (issuer.includes('sharda')) {
    return {
      name: 'Sharda University',
      shortName: 'Sharda',
      badgeBg: 'bg-purple-500/10',
      badgeText: 'text-purple-400',
      badgeBorder: 'border-purple-500/20',
      iconBg: 'from-purple-600 to-indigo-600',
    };
  }

  if (issuer.includes('microsoft')) {
    return {
      name: 'Microsoft',
      shortName: 'Microsoft',
      badgeBg: 'bg-sky-500/10',
      badgeText: 'text-sky-400',
      badgeBorder: 'border-sky-500/20',
      iconBg: 'from-blue-600 to-sky-500',
    };
  }

  if (issuer.includes('coursera')) {
    return {
      name: 'Coursera',
      shortName: 'Coursera',
      badgeBg: 'bg-blue-600/10',
      badgeText: 'text-blue-400',
      badgeBorder: 'border-blue-600/20',
      iconBg: 'from-blue-700 to-blue-500',
    };
  }

  if (issuer.includes('udemy')) {
    return {
      name: 'Udemy',
      shortName: 'Udemy',
      badgeBg: 'bg-purple-600/10',
      badgeText: 'text-purple-300',
      badgeBorder: 'border-purple-600/20',
      iconBg: 'from-purple-700 to-fuchsia-600',
    };
  }

  if (issuer.includes('hackerrank')) {
    return {
      name: 'HackerRank',
      shortName: 'HackerRank',
      badgeBg: 'bg-emerald-500/10',
      badgeText: 'text-emerald-400',
      badgeBorder: 'border-emerald-500/20',
      iconBg: 'from-emerald-600 to-teal-700',
    };
  }

  // Default fallback brand
  return {
    name: issuerName || 'Verified Authority',
    shortName: (issuerName || 'Verified').substring(0, 12),
    badgeBg: 'bg-slate-700/30',
    badgeText: 'text-slate-300',
    badgeBorder: 'border-slate-600/30',
    iconBg: 'from-emerald-600 to-teal-600',
  };
}
