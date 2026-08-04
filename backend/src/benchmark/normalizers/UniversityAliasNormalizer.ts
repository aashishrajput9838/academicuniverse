/**
 * UniversityAliasNormalizer.ts
 *
 * Normalizes university short codes, acronyms, and aliases to canonical full names.
 */

export class UniversityAliasNormalizer {
  private static universityAliasMap: Record<string, string> = {
    'vtu': 'Vivekananda Technical University',
    'vtu new delhi': 'Vivekananda Technical University',
    'vivekananda tech univ': 'Vivekananda Technical University',
    'vivekananda technical university': 'Vivekananda Technical University',
    'sharda': 'Sharda University',
    'sharda univ': 'Sharda University',
    'sharda university': 'Sharda University',
  };

  /**
   * Normalize university name string.
   */
  public static normalize(rawUniv: any): string {
    if (!rawUniv) return '';
    const str = String(rawUniv).trim();
    const lower = str.toLowerCase().replace(/[^\w\s]/gi, '').replace(/\s+/g, ' ');

    if (this.universityAliasMap[lower]) {
      return this.universityAliasMap[lower];
    }

    return str;
  }
}
