// ── Scoring constants ────────────────────────────────────────────

export const ACTION_VERBS = [
  'led', 'managed', 'developed', 'created', 'designed', 'implemented', 'built',
  'organized', 'analyzed', 'improved', 'increased', 'reduced', 'achieved',
  'launched', 'coordinated', 'negotiated', 'delivered', 'spearheaded',
  'mentored', 'optimized', 'initiated', 'established', 'facilitated',
  'generated', 'streamlined', 'collaborated', 'executed', 'transformed',
  'pioneered', 'resolved', 'supervised', 'trained', 'presented',
] as const;

export const PLACEHOLDER_PATTERNS: readonly RegExp[] = [
  /lorem ipsum/i,
  /placeholder/i,
  /xxx/i,
  /tbd/i,
  /enter your/i,
  /your .* here/i,
  /^describe your/i,
  /^(first\s*name|last\s*name|full name|university name|degree program|month year|company name|organization name|project name)$/i,
  /^email@(gmail\.com|school\.edu)$/i,
  /^0\.00\/4\.00$/,
];

// ── Display config ───────────────────────────────────────────────

export type StrengthLabel = 'Weak' | 'Developing' | 'Strong' | 'Excellent';

export const LABEL_CONFIG: Record<StrengthLabel, { color: string; ring: string }> = {
  Weak: { color: 'text-destructive', ring: 'stroke-destructive' },
  Developing: { color: 'text-orange-500', ring: 'stroke-orange-500' },
  Strong: { color: 'text-primary', ring: 'stroke-primary' },
  Excellent: { color: 'text-green-600', ring: 'stroke-green-600' },
};

export const CATEGORY_LABELS: Record<string, string> = {
  contentQuality: 'Writing quality',
  skillsCoverage: 'Skills coverage',
  presentation: 'Structure',
  evidence: 'Evidence',
};

// ── Skills suggestions ───────────────────────────────────────────

export const SUGGESTED_SKILLS = [
  'Advanced Proficiency in French',
  'Microsoft Office Suite',
  'Java',
  'Python',
  'C++',
  'SQL',
  'HTML/CSS',
  'JavaScript',
  'React',
  'Node.js',
  'Git',
  'Agile/Scrum',
  'Data Analysis',
  'Machine Learning',
  'Public Speaking',
  'Team Leadership',
] as const;

// ── AI Assistant section tips ────────────────────────────────────

export const SECTION_TIPS: Record<string, string[]> = {
  personal: [
    'Use a professional email address',
    'Include country code in phone number',
    'LinkedIn URL should be customized',
  ],
  education: [
    'List your most recent education first',
    'Include relevant coursework if applicable',
    'GPA above 3.0 is worth mentioning',
  ],
  experience: [
    'Start bullet points with action verbs',
    'Quantify achievements with numbers',
    'Focus on impact, not just duties',
  ],
  projects: [
    'Highlight technical skills used',
    'Mention team size and your role',
    'Include measurable outcomes',
  ],
  activities: [
    'Show leadership and initiative',
    'Connect activities to career goals',
    'Demonstrate soft skills',
  ],
  skills: [
    'List both technical and soft skills',
    'Be specific about proficiency levels',
    'Include relevant certifications',
  ],
};

// ── File upload limits ───────────────────────────────────────────

export const MAX_UPLOAD_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const ALLOWED_UPLOAD_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
] as const;
