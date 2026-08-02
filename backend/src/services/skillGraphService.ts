export interface RelatedSkillNode {
  skillId: string;
  skillName: string;
  relationshipType: 'DEPENDS_ON' | 'FRAMEWORK_FOR' | 'ECOSYSTEM_PAIR' | 'DATABASE_FOR' | 'DEVOPS_PAIR';
  relevanceScore: number; // 0.0 to 1.0
}

export class SkillGraphService {
  private readonly graphEdges: Array<{
    source: string;
    target: string;
    relationshipType: RelatedSkillNode['relationshipType'];
    weight: number;
  }> = [
    // Web Frameworks -> Languages
    { source: 'next.js', target: 'typescript', relationshipType: 'DEPENDS_ON', weight: 0.95 },
    { source: 'next.js', target: 'react', relationshipType: 'DEPENDS_ON', weight: 0.98 },
    { source: 'react', target: 'javascript', relationshipType: 'DEPENDS_ON', weight: 0.95 },
    { source: 'react', target: 'typescript', relationshipType: 'ECOSYSTEM_PAIR', weight: 0.90 },
    { source: 'express', target: 'node.js', relationshipType: 'DEPENDS_ON', weight: 0.98 },
    { source: 'express', target: 'mongodb', relationshipType: 'ECOSYSTEM_PAIR', weight: 0.85 },
    { source: 'nestjs', target: 'node.js', relationshipType: 'DEPENDS_ON', weight: 0.95 },
    { source: 'nestjs', target: 'typescript', relationshipType: 'DEPENDS_ON', weight: 0.98 },
    { source: 'django', target: 'python', relationshipType: 'DEPENDS_ON', weight: 0.98 },
    { source: 'fastapi', target: 'python', relationshipType: 'DEPENDS_ON', weight: 0.95 },
    { source: 'spring', target: 'java', relationshipType: 'DEPENDS_ON', weight: 0.98 },

    // Database Ecosystems
    { source: 'mongodb', target: 'express', relationshipType: 'ECOSYSTEM_PAIR', weight: 0.85 },
    { source: 'mongodb', target: 'node.js', relationshipType: 'ECOSYSTEM_PAIR', weight: 0.90 },
    { source: 'postgresql', target: 'prisma', relationshipType: 'ECOSYSTEM_PAIR', weight: 0.80 },

    // DevOps & Tools
    { source: 'docker', target: 'linux', relationshipType: 'DEVOPS_PAIR', weight: 0.88 },
    { source: 'docker', target: 'github actions', relationshipType: 'DEVOPS_PAIR', weight: 0.82 },
    { source: 'kubernetes', target: 'docker', relationshipType: 'DEPENDS_ON', weight: 0.92 },
    { source: 'git', target: 'github', relationshipType: 'ECOSYSTEM_PAIR', weight: 0.95 },

    // AI & Machine Learning
    { source: 'tensorflow', target: 'python', relationshipType: 'DEPENDS_ON', weight: 0.98 },
    { source: 'pytorch', target: 'python', relationshipType: 'DEPENDS_ON', weight: 0.98 },
    { source: 'langchain', target: 'python', relationshipType: 'DEPENDS_ON', weight: 0.90 },
    { source: 'pandas', target: 'python', relationshipType: 'DEPENDS_ON', weight: 0.95 },
  ];

  /**
   * Infers and retrieves related skills for a target skill
   */
  public getRelatedSkills(skillIdOrName: string): RelatedSkillNode[] {
    const target = skillIdOrName.toLowerCase().trim();
    const relatedMap = new Map<string, RelatedSkillNode>();

    for (const edge of this.graphEdges) {
      if (edge.source === target) {
        const name = this.formatSkillName(edge.target);
        relatedMap.set(edge.target, {
          skillId: edge.target,
          skillName: name,
          relationshipType: edge.relationshipType,
          relevanceScore: edge.weight,
        });
      } else if (edge.target === target) {
        const name = this.formatSkillName(edge.source);
        relatedMap.set(edge.source, {
          skillId: edge.source,
          skillName: name,
          relationshipType: edge.relationshipType,
          relevanceScore: edge.weight,
        });
      }
    }

    return Array.from(relatedMap.values()).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private formatSkillName(id: string): string {
    const titleMap: Record<string, string> = {
      'typescript': 'TypeScript',
      'javascript': 'JavaScript',
      'python': 'Python',
      'java': 'Java',
      'node.js': 'Node.js',
      'next.js': 'Next.js',
      'react': 'React',
      'express': 'Express',
      'nestjs': 'NestJS',
      'mongodb': 'MongoDB',
      'postgresql': 'PostgreSQL',
      'docker': 'Docker',
      'kubernetes': 'Kubernetes',
      'github actions': 'GitHub Actions',
      'tensorflow': 'TensorFlow',
      'pytorch': 'PyTorch',
      'langchain': 'LangChain',
      'pandas': 'Pandas',
      'git': 'Git',
      'github': 'GitHub',
    };

    return titleMap[id] || id.charAt(0).toUpperCase() + id.slice(1);
  }
}

export default new SkillGraphService();
