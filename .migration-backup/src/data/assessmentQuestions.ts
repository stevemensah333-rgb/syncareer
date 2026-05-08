export interface AssessmentQuestion {
  id: number;
  text: string;
  category: 'personality' | 'skills' | 'work_interest';
  subcategory?: string; // For RIASEC: R, I, A, S, E, C
}

export const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  // === PERSONALITY (1-15) ===
  { id: 1, text: "I enjoy taking the lead in group projects and decision-making.", category: 'personality' },
  { id: 2, text: "I prefer working independently rather than in teams.", category: 'personality' },
  { id: 3, text: "I adapt quickly when plans change unexpectedly.", category: 'personality' },
  { id: 4, text: "I enjoy meeting new people and networking.", category: 'personality' },
  { id: 5, text: "I pay close attention to details in my work.", category: 'personality' },
  { id: 6, text: "I remain calm under pressure and tight deadlines.", category: 'personality' },
  { id: 7, text: "I am comfortable expressing my opinions in front of others.", category: 'personality' },
  { id: 8, text: "I prefer structured routines over spontaneous activities.", category: 'personality' },
  { id: 9, text: "I enjoy helping others solve their problems.", category: 'personality' },
  { id: 10, text: "I am motivated by competition and achieving goals.", category: 'personality' },
  { id: 11, text: "I find it easy to empathize with others' feelings.", category: 'personality' },
  { id: 12, text: "I enjoy analyzing data and finding patterns.", category: 'personality' },
  { id: 13, text: "I am comfortable with ambiguity and uncertainty.", category: 'personality' },
  { id: 14, text: "I take initiative without waiting to be told what to do.", category: 'personality' },
  { id: 15, text: "I value harmony and avoid conflict when possible.", category: 'personality' },

  // === SKILLS PREFERENCE (16-30) ===
  { id: 16, text: "I enjoy writing reports, articles, or creative content.", category: 'skills' },
  { id: 17, text: "I am skilled at using spreadsheets and data analysis tools.", category: 'skills' },
  { id: 18, text: "I enjoy learning new software and technologies.", category: 'skills' },
  { id: 19, text: "I am good at presenting ideas to an audience.", category: 'skills' },
  { id: 20, text: "I enjoy planning and organizing events or projects.", category: 'skills' },
  { id: 21, text: "I have strong problem-solving abilities.", category: 'skills' },
  { id: 22, text: "I enjoy designing visuals, layouts, or user interfaces.", category: 'skills' },
  { id: 23, text: "I am comfortable negotiating and persuading others.", category: 'skills' },
  { id: 24, text: "I enjoy working with numbers, budgets, and financial data.", category: 'skills' },
  { id: 25, text: "I am skilled at building and maintaining relationships.", category: 'skills' },
  { id: 26, text: "I enjoy conducting research and gathering information.", category: 'skills' },
  { id: 27, text: "I am good at managing my time and meeting deadlines.", category: 'skills' },
  { id: 28, text: "I enjoy coding, scripting, or building technical solutions.", category: 'skills' },
  { id: 29, text: "I am skilled at mediating disagreements between people.", category: 'skills' },
  { id: 30, text: "I enjoy mentoring or teaching others new skills.", category: 'skills' },

  // === WORK INTEREST - RIASEC (31-45) ===
  // Realistic (R) - hands-on, practical
  { id: 31, text: "I enjoy working with tools, machines, or physical materials.", category: 'work_interest', subcategory: 'R' },
  { id: 32, text: "I prefer tasks that produce tangible, visible results.", category: 'work_interest', subcategory: 'R' },
  { id: 33, text: "I enjoy building, repairing, or constructing things.", category: 'work_interest', subcategory: 'R' },

  // Investigative (I) - analytical, intellectual
  { id: 34, text: "I enjoy solving complex puzzles and abstract problems.", category: 'work_interest', subcategory: 'I' },
  { id: 35, text: "I like investigating how things work at a deeper level.", category: 'work_interest', subcategory: 'I' },
  { id: 36, text: "I enjoy conducting experiments or testing hypotheses.", category: 'work_interest', subcategory: 'I' },

  // Artistic (A) - creative, expressive
  { id: 37, text: "I enjoy expressing myself through art, writing, or music.", category: 'work_interest', subcategory: 'A' },
  { id: 38, text: "I am drawn to creative projects that allow originality.", category: 'work_interest', subcategory: 'A' },
  { id: 39, text: "I prefer unstructured environments where I can innovate.", category: 'work_interest', subcategory: 'A' },

  // Social (S) - helping, teaching
  { id: 40, text: "I enjoy working directly with people to help them improve.", category: 'work_interest', subcategory: 'S' },
  { id: 41, text: "I am drawn to careers in education, counseling, or healthcare.", category: 'work_interest', subcategory: 'S' },
  { id: 42, text: "I find fulfillment in volunteering and community service.", category: 'work_interest', subcategory: 'S' },

  // Enterprising (E) - leading, persuading
  { id: 43, text: "I enjoy leading teams and influencing decision-making.", category: 'work_interest', subcategory: 'E' },
  { id: 44, text: "I am motivated by sales, entrepreneurship, or business strategy.", category: 'work_interest', subcategory: 'E' },

  // Conventional (C) - organizing, detail-oriented
  { id: 45, text: "I enjoy organizing data, records, and systematic processes.", category: 'work_interest', subcategory: 'C' },
];

export const RIASEC_LABELS: Record<string, string> = {
  R: 'Realistic',
  I: 'Investigative',
  A: 'Artistic',
  S: 'Social',
  E: 'Enterprising',
  C: 'Conventional',
};

export const RIASEC_DESCRIPTIONS: Record<string, string> = {
  R: 'You prefer hands-on, practical work — building, repairing, or working with tangible outcomes. Careers in engineering, trades, agriculture, or athletics suit you well.',
  I: 'You thrive on investigation and analysis — solving complex problems and exploring ideas. Research, science, technology, and data-driven roles align with your strengths.',
  A: 'You value creativity, self-expression, and originality. Careers in design, writing, media, performing arts, and content creation energize you.',
  S: 'You are people-oriented and driven to help others. Teaching, counseling, healthcare, social work, and community development are natural fits.',
  E: 'You are ambitious, persuasive, and drawn to leadership. Business, sales, entrepreneurship, management, and politics match your enterprising spirit.',
  C: 'You excel at organization, structure, and systematic work. Finance, administration, logistics, compliance, and data management roles suit you.',
};

export const LIKERT_OPTIONS = [
  { value: 1, label: 'Strongly Disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly Agree' },
];
