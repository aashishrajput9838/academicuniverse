export interface SkillTaxonomyItem {
  name: string;
  category: 'TECHNICAL' | 'SOFT' | 'LANGUAGE' | 'TOOL' | 'DOMAIN_SPECIFIC';
  subcategory: string;
  defaultLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
}

export const SKILL_TAXONOMY_DICTIONARY: SkillTaxonomyItem[] = [
  // Programming Languages
  { name: 'Python', category: 'TECHNICAL', subcategory: 'Programming Languages' },
  { name: 'JavaScript', category: 'TECHNICAL', subcategory: 'Programming Languages' },
  { name: 'TypeScript', category: 'TECHNICAL', subcategory: 'Programming Languages' },
  { name: 'Java', category: 'TECHNICAL', subcategory: 'Programming Languages' },
  { name: 'C++', category: 'TECHNICAL', subcategory: 'Programming Languages' },
  { name: 'C#', category: 'TECHNICAL', subcategory: 'Programming Languages' },
  { name: 'Go (Golang)', category: 'TECHNICAL', subcategory: 'Programming Languages' },
  { name: 'Rust', category: 'TECHNICAL', subcategory: 'Programming Languages' },
  { name: 'Kotlin', category: 'TECHNICAL', subcategory: 'Programming Languages' },
  { name: 'Swift', category: 'TECHNICAL', subcategory: 'Programming Languages' },
  { name: 'PHP', category: 'TECHNICAL', subcategory: 'Programming Languages' },
  { name: 'Ruby', category: 'TECHNICAL', subcategory: 'Programming Languages' },

  // Frontend Development
  { name: 'React.js', category: 'TECHNICAL', subcategory: 'Frontend' },
  { name: 'Next.js', category: 'TECHNICAL', subcategory: 'Frontend' },
  { name: 'Vue.js', category: 'TECHNICAL', subcategory: 'Frontend' },
  { name: 'Angular', category: 'TECHNICAL', subcategory: 'Frontend' },
  { name: 'HTML5', category: 'TECHNICAL', subcategory: 'Frontend' },
  { name: 'CSS3', category: 'TECHNICAL', subcategory: 'Frontend' },
  { name: 'Tailwind CSS', category: 'TECHNICAL', subcategory: 'Frontend' },
  { name: 'Redux Toolkit', category: 'TECHNICAL', subcategory: 'Frontend' },

  // Backend Development
  { name: 'Node.js', category: 'TECHNICAL', subcategory: 'Backend' },
  { name: 'Express.js', category: 'TECHNICAL', subcategory: 'Backend' },
  { name: 'Django', category: 'TECHNICAL', subcategory: 'Backend' },
  { name: 'FastAPI', category: 'TECHNICAL', subcategory: 'Backend' },
  { name: 'Spring Boot', category: 'TECHNICAL', subcategory: 'Backend' },
  { name: 'ASP.NET Core', category: 'TECHNICAL', subcategory: 'Backend' },
  { name: 'GraphQL', category: 'TECHNICAL', subcategory: 'Backend' },
  { name: 'REST API Design', category: 'TECHNICAL', subcategory: 'Backend' },

  // Databases
  { name: 'PostgreSQL', category: 'TECHNICAL', subcategory: 'Databases' },
  { name: 'MongoDB', category: 'TECHNICAL', subcategory: 'Databases' },
  { name: 'MySQL', category: 'TECHNICAL', subcategory: 'Databases' },
  { name: 'Redis', category: 'TECHNICAL', subcategory: 'Databases' },
  { name: 'Firebase Firestore', category: 'TECHNICAL', subcategory: 'Databases' },
  { name: 'Supabase', category: 'TECHNICAL', subcategory: 'Databases' },

  // Cloud & DevOps
  { name: 'Docker', category: 'TOOL', subcategory: 'Cloud & DevOps' },
  { name: 'Kubernetes', category: 'TOOL', subcategory: 'Cloud & DevOps' },
  { name: 'AWS (Amazon Web Services)', category: 'TOOL', subcategory: 'Cloud & DevOps' },
  { name: 'Microsoft Azure', category: 'TOOL', subcategory: 'Cloud & DevOps' },
  { name: 'Google Cloud Platform (GCP)', category: 'TOOL', subcategory: 'Cloud & DevOps' },
  { name: 'CI/CD Pipelines (GitHub Actions)', category: 'TOOL', subcategory: 'Cloud & DevOps' },
  { name: 'Terraform', category: 'TOOL', subcategory: 'Cloud & DevOps' },

  // AI / ML & Data Science
  { name: 'PyTorch', category: 'DOMAIN_SPECIFIC', subcategory: 'AI & Machine Learning' },
  { name: 'TensorFlow', category: 'DOMAIN_SPECIFIC', subcategory: 'AI & Machine Learning' },
  { name: 'Scikit-Learn', category: 'DOMAIN_SPECIFIC', subcategory: 'AI & Machine Learning' },
  { name: 'OpenAI API & LLMs', category: 'DOMAIN_SPECIFIC', subcategory: 'AI & Machine Learning' },
  { name: 'Pandas & NumPy', category: 'DOMAIN_SPECIFIC', subcategory: 'Data Science' },
  { name: 'Computer Vision (OpenCV)', category: 'DOMAIN_SPECIFIC', subcategory: 'AI & Machine Learning' },

  // Tools & Testing
  { name: 'Git & GitHub', category: 'TOOL', subcategory: 'Tools' },
  { name: 'Jest / React Testing Library', category: 'TOOL', subcategory: 'Software Testing' },
  { name: 'Postman', category: 'TOOL', subcategory: 'Tools' },
  { name: 'Linux System Administration', category: 'TOOL', subcategory: 'Operating Systems' },

  // Soft Skills
  { name: 'Problem Solving & DSA', category: 'SOFT', subcategory: 'Soft Skills' },
  { name: 'Technical Leadership', category: 'SOFT', subcategory: 'Soft Skills' },
  { name: 'Agile & Scrum Methodology', category: 'SOFT', subcategory: 'Soft Skills' },
  { name: 'Cross-Functional Communication', category: 'SOFT', subcategory: 'Soft Skills' },
];
