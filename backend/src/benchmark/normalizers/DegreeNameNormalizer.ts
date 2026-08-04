/**
 * DegreeNameNormalizer.ts
 *
 * Normalizes degree title variations into canonical degree representations.
 */

export class DegreeNameNormalizer {
  private static degreeAliasMap: Record<string, string> = {
    'btech': 'Bachelor of Technology',
    'b.tech': 'Bachelor of Technology',
    'b.tech.': 'Bachelor of Technology',
    'bachelor of technology': 'Bachelor of Technology',
    'mtech': 'Master of Technology',
    'm.tech': 'Master of Technology',
    'm.tech.': 'Master of Technology',
    'master of technology': 'Master of Technology',
    'bsc': 'Bachelor of Science',
    'b.sc': 'Bachelor of Science',
    'bachelor of science': 'Bachelor of Science',
    'msc': 'Master of Science',
    'm.sc': 'Master of Science',
    'master of science': 'Master of Science',
  };

  /**
   * Normalize degree name string.
   */
  public static normalize(rawDegree: any): string {
    if (!rawDegree) return '';
    let str = String(rawDegree).trim();

    // Check exact alias map match
    const lower = str.toLowerCase();
    if (this.degreeAliasMap[lower]) {
      return this.degreeAliasMap[lower];
    }

    // Replace prefix shorthand e.g. "B.Tech in Information Technology" -> "Bachelor of Technology in Information Technology"
    for (const [shorthand, canonical] of Object.entries(this.degreeAliasMap)) {
      if (lower.startsWith(shorthand + ' ')) {
        const rest = str.slice(shorthand.length).trim();
        return `${canonical} ${rest}`;
      }
    }

    return str;
  }
}
