import type { TemplateQuestion } from '@/components/Resume/types/api';

const SAMPLE_MAP: Record<string, string> = {
  // Personal
  full_name: 'Aashish Rajput',
  name: 'Aashish Rajput',
  candidate_name: 'Aashish Rajput',
  fullname: 'Aashish Rajput',

  phone: '+91 9876543210',
  phone_number: '+91 9876543210',
  mobile: '+91 9876543210',
  contact: '+91 9876543210',

  email: 'aashish.rajput@example.com',
  email_id: 'aashish.rajput@example.com',
  mail: 'aashish.rajput@example.com',

  github: 'https://github.com/aashishrajput',
  github_url: 'https://github.com/aashishrajput',

  linkedin: 'https://linkedin.com/in/aashishrajput',
  linkedin_url: 'https://linkedin.com/in/aashishrajput',

  website: 'https://aashishrajput.dev',
  portfolio: 'https://aashishrajput.dev',

  location: 'Noida, Uttar Pradesh, India',
  city: 'Noida',
  address: 'Greater Noida, UP',

  // Summary
  professional_summary: 'Motivated Computer Science undergraduate with strong problem-solving skills, experience in full-stack development, AI applications, and competitive programming. Passionate about building scalable software systems.',
  about_me: 'Motivated Computer Science undergraduate with strong problem-solving skills, experience in full-stack development, AI applications, and competitive programming. Passionate about building scalable software systems.',
  profile: 'Motivated Computer Science undergraduate with strong problem-solving skills, experience in full-stack development, AI applications, and competitive programming. Passionate about building scalable software systems.',
  objective: 'To leverage full-stack and AI development skills to build impactful and scalable software solutions in a dynamic engineering team.',

  // Skills
  skills: 'Java, C++, Python, JavaScript, React, Next.js, Node.js, MongoDB, SQL, Git, Docker',
  technical_skills: 'Java, C++, Python, JavaScript, React, Next.js, Node.js, MongoDB, SQL, Git, Docker',
  skills_list: 'Java, C++, Python, JavaScript, React, Next.js, Node.js, MongoDB, SQL, Git, Docker',
  core_skills: 'Full-Stack Development, AI/ML Applications, RESTful APIs, Database Design, Cloud Deployment',

  // Experience
  experience_company: 'OpenAI Research Labs',
  company: 'OpenAI Research Labs',
  company_name: 'OpenAI Research Labs',
  employer: 'OpenAI Research Labs',

  experience_role: 'Software Engineering Intern',
  role: 'Software Engineering Intern',
  job_title: 'Software Engineering Intern',
  position: 'Software Engineering Intern',

  experience_start_date: '2023-06',
  start_date: '2023-06',
  from_date: '2023-06',

  experience_end_date: '2023-12',
  end_date: '2023-12',
  to_date: '2023-12',

  experience_description: 'Developed AI-powered web applications, optimized backend APIs, and collaborated with cross-functional teams to improve application performance and reduce response latency by 35%.',
  description: 'Developed AI-powered web applications, optimized backend APIs, and collaborated with cross-functional teams to improve application performance.',
  responsibilities: 'Led the development of scalable microservices, integrated third-party APIs, and performed automated testing to ensure high software reliability.',

  experience_technologies: 'Node.js, TypeScript, React, MongoDB, Docker, AWS',
  technologies: 'Node.js, TypeScript, React, MongoDB, Docker, AWS',
  tech_stack: 'Node.js, TypeScript, React, MongoDB, Docker, AWS',

  // Education
  education_degree: 'B.Tech Computer Science and Engineering',
  degree: 'B.Tech Computer Science and Engineering',
  qualification: 'B.Tech Computer Science and Engineering',

  education_institution: 'Sharda University',
  institution: 'Sharda University',
  university: 'Sharda University',
  school: 'Sharda University',
  college: 'Sharda University',

  education_start_year: '2021',
  start_year: '2021',
  from_year: '2021',

  education_end_year: '2025',
  end_year: '2025',
  to_year: '2025',

  education_cgpa: '8.72 / 10.0',
  cgpa: '8.72 / 10.0',
  gpa: '8.72 / 10.0',

  education_details: 'Specialization in Artificial Intelligence and Machine Learning. Relevant coursework: Data Structures, Algorithms, DBMS, Operating Systems, Computer Networks.',

  // Projects
  project_name: 'Academic Universe',
  proj_name: 'Academic Universe',

  project_description: 'Designed and developed a multi-tenant academic management platform featuring AI-powered resume generation, student analytics, and career tracking.',

  project_technologies: 'React, Next.js, Node.js, Express, MongoDB, TailwindCSS',

  project_url: 'https://github.com/academicuniverse/academicuniverse',

  // Certifications
  certification_name: 'AWS Certified Cloud Practitioner',
  cert_name: 'AWS Certified Cloud Practitioner',
  certification: 'AWS Certified Cloud Practitioner',

  certification_issuer: 'Amazon Web Services',
  issuer: 'Amazon Web Services',

  certification_issue_date: '2024-01',
  issue_date: '2024-01',

  certification_expiry_date: '2027-01',
  expiry_date: '2027-01',

  certification_details: 'Validated expertise in cloud security, architecture, core AWS services, and billing management.',

  // Additional
  additional_information: 'Languages: English (Fluent), Hindi (Native). Hobbies: Competitive Programming, Tech Blogging, Open Source Contributing.',
  additional_info: 'Languages: English (Fluent), Hindi (Native). Hobbies: Competitive Programming, Tech Blogging, Open Source Contributing.',
};

export function generateSampleResumeData(questions: TemplateQuestion[]): Record<string, string> {
  const data: Record<string, string> = {};

  for (const q of questions) {
    const tag = q.tag.toLowerCase();
    const label = q.question.toLowerCase();
    const type = q.type;

    if (SAMPLE_MAP[tag]) {
      data[q.tag] = SAMPLE_MAP[tag];
      continue;
    }

    // Heuristic fallbacks based on tag, label, and type
    if (tag.includes('email') || label.includes('email') || type === 'email') {
      data[q.tag] = 'aashish.rajput@example.com';
    } else if (tag.includes('phone') || tag.includes('mobile') || label.includes('phone') || type === 'phone') {
      data[q.tag] = '+91 9876543210';
    } else if (tag.includes('url') || tag.includes('link') || tag.includes('github') || tag.includes('linkedin') || type === 'url') {
      data[q.tag] = 'https://github.com/aashishrajput';
    } else if (tag.includes('date') || tag.includes('year') || type === 'date') {
      data[q.tag] = '2024-01';
    } else if (type === 'textarea' || tag.includes('desc') || tag.includes('summary') || tag.includes('about') || tag.includes('detail')) {
      data[q.tag] = `Experienced in software development and ${q.question || q.tag} management with strong technical expertise.`;
    } else {
      data[q.tag] = `Sample ${q.question || q.tag}`;
    }
  }

  return data;
}
