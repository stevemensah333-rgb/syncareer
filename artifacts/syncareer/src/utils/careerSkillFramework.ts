/**
 * Career-to-Skill Framework Mapping
 * 
 * Maps each career path to an ordered list of skills with module ranges.
 * Each module number maps to a specific skill, enabling:
 * - Skill-specific quiz validation
 * - Targeted mastery tracking
 * - Career alignment scoring
 */

export interface SkillModule {
  skillName: string;
  moduleStart: number;
  moduleEnd: number;
}

export interface CareerSkillFramework {
  skills: SkillModule[];
  totalModules: number;
}

const frameworks: Record<string, CareerSkillFramework> = {
  'Computer Science': {
    totalModules: 24,
    skills: [
      { skillName: 'Programming', moduleStart: 1, moduleEnd: 4 },
      { skillName: 'Data Structures', moduleStart: 5, moduleEnd: 8 },
      { skillName: 'Algorithms', moduleStart: 9, moduleEnd: 12 },
      { skillName: 'Git & Version Control', moduleStart: 13, moduleEnd: 15 },
      { skillName: 'System Design', moduleStart: 16, moduleEnd: 20 },
      { skillName: 'Cloud Computing', moduleStart: 21, moduleEnd: 24 },
    ],
  },
  'Data Science': {
    totalModules: 24,
    skills: [
      { skillName: 'Statistics', moduleStart: 1, moduleEnd: 4 },
      { skillName: 'Machine Learning', moduleStart: 5, moduleEnd: 8 },
      { skillName: 'Python for Data Science', moduleStart: 9, moduleEnd: 12 },
      { skillName: 'Data Visualization', moduleStart: 13, moduleEnd: 16 },
      { skillName: 'SQL & Databases', moduleStart: 17, moduleEnd: 20 },
      { skillName: 'Deep Learning', moduleStart: 21, moduleEnd: 24 },
    ],
  },
  'Business Administration': {
    totalModules: 24,
    skills: [
      { skillName: 'Financial Analysis', moduleStart: 1, moduleEnd: 4 },
      { skillName: 'Strategic Planning', moduleStart: 5, moduleEnd: 8 },
      { skillName: 'Project Management', moduleStart: 9, moduleEnd: 12 },
      { skillName: 'Leadership', moduleStart: 13, moduleEnd: 16 },
      { skillName: 'Marketing', moduleStart: 17, moduleEnd: 20 },
      { skillName: 'Business Analytics', moduleStart: 21, moduleEnd: 24 },
    ],
  },
  'Information Technology': {
    totalModules: 24,
    skills: [
      { skillName: 'Networking', moduleStart: 1, moduleEnd: 4 },
      { skillName: 'Cybersecurity', moduleStart: 5, moduleEnd: 8 },
      { skillName: 'Cloud Infrastructure', moduleStart: 9, moduleEnd: 12 },
      { skillName: 'Database Management', moduleStart: 13, moduleEnd: 16 },
      { skillName: 'Linux Administration', moduleStart: 17, moduleEnd: 20 },
      { skillName: 'ITIL & Service Management', moduleStart: 21, moduleEnd: 24 },
    ],
  },
  'Finance': {
    totalModules: 24,
    skills: [
      { skillName: 'Financial Modeling', moduleStart: 1, moduleEnd: 4 },
      { skillName: 'Investment Analysis', moduleStart: 5, moduleEnd: 8 },
      { skillName: 'Risk Management', moduleStart: 9, moduleEnd: 12 },
      { skillName: 'Valuation', moduleStart: 13, moduleEnd: 16 },
      { skillName: 'Portfolio Management', moduleStart: 17, moduleEnd: 20 },
      { skillName: 'FinTech & Innovation', moduleStart: 21, moduleEnd: 24 },
    ],
  },
  'Law': {
    totalModules: 24,
    skills: [
      { skillName: 'Legal Research', moduleStart: 1, moduleEnd: 4 },
      { skillName: 'Contract Drafting', moduleStart: 5, moduleEnd: 8 },
      { skillName: 'Litigation', moduleStart: 9, moduleEnd: 12 },
      { skillName: 'Compliance', moduleStart: 13, moduleEnd: 16 },
      { skillName: 'Legal Writing', moduleStart: 17, moduleEnd: 20 },
      { skillName: 'Client Relations', moduleStart: 21, moduleEnd: 24 },
    ],
  },
  'Electrical Engineering': {
    totalModules: 24,
    skills: [
      { skillName: 'Circuit Design', moduleStart: 1, moduleEnd: 4 },
      { skillName: 'Power Systems', moduleStart: 5, moduleEnd: 8 },
      { skillName: 'Control Systems', moduleStart: 9, moduleEnd: 12 },
      { skillName: 'PLC Programming', moduleStart: 13, moduleEnd: 16 },
      { skillName: 'Renewable Energy', moduleStart: 17, moduleEnd: 20 },
      { skillName: 'Electronics', moduleStart: 21, moduleEnd: 24 },
    ],
  },
  'Mechanical Engineering': {
    totalModules: 24,
    skills: [
      { skillName: 'CAD/CAM', moduleStart: 1, moduleEnd: 4 },
      { skillName: 'Thermodynamics', moduleStart: 5, moduleEnd: 8 },
      { skillName: 'Manufacturing', moduleStart: 9, moduleEnd: 12 },
      { skillName: 'Robotics', moduleStart: 13, moduleEnd: 16 },
      { skillName: 'Quality Control', moduleStart: 17, moduleEnd: 20 },
      { skillName: '3D Printing', moduleStart: 21, moduleEnd: 24 },
    ],
  },
  'Marketing': {
    totalModules: 24,
    skills: [
      { skillName: 'Digital Marketing', moduleStart: 1, moduleEnd: 4 },
      { skillName: 'SEO/SEM', moduleStart: 5, moduleEnd: 8 },
      { skillName: 'Content Strategy', moduleStart: 9, moduleEnd: 12 },
      { skillName: 'Analytics', moduleStart: 13, moduleEnd: 16 },
      { skillName: 'Brand Management', moduleStart: 17, moduleEnd: 20 },
      { skillName: 'CRM', moduleStart: 21, moduleEnd: 24 },
    ],
  },
  'Medicine': {
    totalModules: 24,
    skills: [
      { skillName: 'Clinical Skills', moduleStart: 1, moduleEnd: 4 },
      { skillName: 'Patient Care', moduleStart: 5, moduleEnd: 8 },
      { skillName: 'Diagnosis', moduleStart: 9, moduleEnd: 12 },
      { skillName: 'Medical Research', moduleStart: 13, moduleEnd: 16 },
      { skillName: 'Healthcare Technology', moduleStart: 17, moduleEnd: 20 },
      { skillName: 'Ethics', moduleStart: 21, moduleEnd: 24 },
    ],
  },
  'Civil Engineering': {
    totalModules: 24,
    skills: [
      { skillName: 'Structural Analysis', moduleStart: 1, moduleEnd: 4 },
      { skillName: 'Construction Management', moduleStart: 5, moduleEnd: 8 },
      { skillName: 'Geotechnical Engineering', moduleStart: 9, moduleEnd: 12 },
      { skillName: 'AutoCAD & BIM', moduleStart: 13, moduleEnd: 16 },
      { skillName: 'Water Resources', moduleStart: 17, moduleEnd: 20 },
      { skillName: 'Environmental Compliance', moduleStart: 21, moduleEnd: 24 },
    ],
  },
  'Chemical Engineering': {
    totalModules: 24,
    skills: [
      { skillName: 'Process Design', moduleStart: 1, moduleEnd: 4 },
      { skillName: 'Chemical Thermodynamics', moduleStart: 5, moduleEnd: 8 },
      { skillName: 'Reaction Engineering', moduleStart: 9, moduleEnd: 12 },
      { skillName: 'Process Control', moduleStart: 13, moduleEnd: 16 },
      { skillName: 'Safety & Hazard Analysis', moduleStart: 17, moduleEnd: 20 },
      { skillName: 'Materials Science', moduleStart: 21, moduleEnd: 24 },
    ],
  },
  'Accounting': {
    totalModules: 24,
    skills: [
      { skillName: 'Financial Accounting', moduleStart: 1, moduleEnd: 4 },
      { skillName: 'Management Accounting', moduleStart: 5, moduleEnd: 8 },
      { skillName: 'Auditing', moduleStart: 9, moduleEnd: 12 },
      { skillName: 'Taxation', moduleStart: 13, moduleEnd: 16 },
      { skillName: 'Financial Reporting', moduleStart: 17, moduleEnd: 20 },
      { skillName: 'Accounting Software', moduleStart: 21, moduleEnd: 24 },
    ],
  },
  'Human Resources': {
    totalModules: 24,
    skills: [
      { skillName: 'Recruitment & Selection', moduleStart: 1, moduleEnd: 4 },
      { skillName: 'Employee Relations', moduleStart: 5, moduleEnd: 8 },
      { skillName: 'Compensation & Benefits', moduleStart: 9, moduleEnd: 12 },
      { skillName: 'Training & Development', moduleStart: 13, moduleEnd: 16 },
      { skillName: 'Labour Law', moduleStart: 17, moduleEnd: 20 },
      { skillName: 'HRIS Systems', moduleStart: 21, moduleEnd: 24 },
    ],
  },
  'Economics': {
    totalModules: 24,
    skills: [
      { skillName: 'Microeconomics', moduleStart: 1, moduleEnd: 4 },
      { skillName: 'Macroeconomics', moduleStart: 5, moduleEnd: 8 },
      { skillName: 'Econometrics', moduleStart: 9, moduleEnd: 12 },
      { skillName: 'Development Economics', moduleStart: 13, moduleEnd: 16 },
      { skillName: 'Policy Analysis', moduleStart: 17, moduleEnd: 20 },
      { skillName: 'Statistical Software', moduleStart: 21, moduleEnd: 24 },
    ],
  },
  'Psychology': {
    totalModules: 24,
    skills: [
      { skillName: 'Research Methods', moduleStart: 1, moduleEnd: 4 },
      { skillName: 'Counselling Techniques', moduleStart: 5, moduleEnd: 8 },
      { skillName: 'Psychometrics', moduleStart: 9, moduleEnd: 12 },
      { skillName: 'Behavioural Analysis', moduleStart: 13, moduleEnd: 16 },
      { skillName: 'Clinical Assessment', moduleStart: 17, moduleEnd: 20 },
      { skillName: 'Industrial Psychology', moduleStart: 21, moduleEnd: 24 },
    ],
  },
  'Nursing': {
    totalModules: 24,
    skills: [
      { skillName: 'Patient Assessment', moduleStart: 1, moduleEnd: 4 },
      { skillName: 'Clinical Nursing', moduleStart: 5, moduleEnd: 8 },
      { skillName: 'Pharmacology', moduleStart: 9, moduleEnd: 12 },
      { skillName: 'Critical Care', moduleStart: 13, moduleEnd: 16 },
      { skillName: 'Community Health', moduleStart: 17, moduleEnd: 20 },
      { skillName: 'Nursing Leadership', moduleStart: 21, moduleEnd: 24 },
    ],
  },
  'Pharmacy': {
    totalModules: 24,
    skills: [
      { skillName: 'Pharmaceutical Chemistry', moduleStart: 1, moduleEnd: 4 },
      { skillName: 'Clinical Pharmacy', moduleStart: 5, moduleEnd: 8 },
      { skillName: 'Drug Formulation', moduleStart: 9, moduleEnd: 12 },
      { skillName: 'Pharmacovigilance', moduleStart: 13, moduleEnd: 16 },
      { skillName: 'Regulatory Affairs', moduleStart: 17, moduleEnd: 20 },
      { skillName: 'Pharmacy Practice', moduleStart: 21, moduleEnd: 24 },
    ],
  },
  'Architecture': {
    totalModules: 24,
    skills: [
      { skillName: 'Architectural Design', moduleStart: 1, moduleEnd: 4 },
      { skillName: 'Building Technology', moduleStart: 5, moduleEnd: 8 },
      { skillName: 'AutoCAD & Revit', moduleStart: 9, moduleEnd: 12 },
      { skillName: 'Sustainable Design', moduleStart: 13, moduleEnd: 16 },
      { skillName: 'Urban Planning', moduleStart: 17, moduleEnd: 20 },
      { skillName: 'Project Management', moduleStart: 21, moduleEnd: 24 },
    ],
  },
  'Graphic Design': {
    totalModules: 24,
    skills: [
      { skillName: 'Visual Communication', moduleStart: 1, moduleEnd: 4 },
      { skillName: 'Adobe Creative Suite', moduleStart: 5, moduleEnd: 8 },
      { skillName: 'UI/UX Design', moduleStart: 9, moduleEnd: 12 },
      { skillName: 'Typography', moduleStart: 13, moduleEnd: 16 },
      { skillName: 'Branding & Identity', moduleStart: 17, moduleEnd: 20 },
      { skillName: 'Motion Graphics', moduleStart: 21, moduleEnd: 24 },
    ],
  },
  'Communications': {
    totalModules: 24,
    skills: [
      { skillName: 'Media Writing', moduleStart: 1, moduleEnd: 4 },
      { skillName: 'Public Relations', moduleStart: 5, moduleEnd: 8 },
      { skillName: 'Digital Media', moduleStart: 9, moduleEnd: 12 },
      { skillName: 'Corporate Communications', moduleStart: 13, moduleEnd: 16 },
      { skillName: 'Content Strategy', moduleStart: 17, moduleEnd: 20 },
      { skillName: 'Crisis Communication', moduleStart: 21, moduleEnd: 24 },
    ],
  },
  'Education': {
    totalModules: 24,
    skills: [
      { skillName: 'Curriculum Design', moduleStart: 1, moduleEnd: 4 },
      { skillName: 'Pedagogy', moduleStart: 5, moduleEnd: 8 },
      { skillName: 'Classroom Management', moduleStart: 9, moduleEnd: 12 },
      { skillName: 'Educational Technology', moduleStart: 13, moduleEnd: 16 },
      { skillName: 'Assessment & Evaluation', moduleStart: 17, moduleEnd: 20 },
      { skillName: 'Inclusive Education', moduleStart: 21, moduleEnd: 24 },
    ],
  },
  'Environmental Science': {
    totalModules: 24,
    skills: [
      { skillName: 'Ecology', moduleStart: 1, moduleEnd: 4 },
      { skillName: 'Environmental Impact Assessment', moduleStart: 5, moduleEnd: 8 },
      { skillName: 'GIS & Remote Sensing', moduleStart: 9, moduleEnd: 12 },
      { skillName: 'Climate Science', moduleStart: 13, moduleEnd: 16 },
      { skillName: 'Waste Management', moduleStart: 17, moduleEnd: 20 },
      { skillName: 'Environmental Policy', moduleStart: 21, moduleEnd: 24 },
    ],
  },
  'Agriculture': {
    totalModules: 24,
    skills: [
      { skillName: 'Crop Science', moduleStart: 1, moduleEnd: 4 },
      { skillName: 'Soil Science', moduleStart: 5, moduleEnd: 8 },
      { skillName: 'Agricultural Economics', moduleStart: 9, moduleEnd: 12 },
      { skillName: 'Precision Agriculture', moduleStart: 13, moduleEnd: 16 },
      { skillName: 'Agribusiness Management', moduleStart: 17, moduleEnd: 20 },
      { skillName: 'Sustainable Farming', moduleStart: 21, moduleEnd: 24 },
    ],
  },
  'Other': {
    totalModules: 24,
    skills: [
      { skillName: 'Critical Thinking', moduleStart: 1, moduleEnd: 4 },
      { skillName: 'Communication', moduleStart: 5, moduleEnd: 8 },
      { skillName: 'Problem Solving', moduleStart: 9, moduleEnd: 12 },
      { skillName: 'Digital Literacy', moduleStart: 13, moduleEnd: 16 },
      { skillName: 'Project Management', moduleStart: 17, moduleEnd: 20 },
      { skillName: 'Professional Development', moduleStart: 21, moduleEnd: 24 },
    ],
  },
};

/**
 * Get the skill being tested for a given module number in a career path
 */
export const getSkillForModule = (careerPath: string, moduleNumber: number): string | null => {
  const framework = frameworks[careerPath];
  if (!framework) return null;
  
  const skill = framework.skills.find(
    s => moduleNumber >= s.moduleStart && moduleNumber <= s.moduleEnd
  );
  return skill?.skillName || null;
};

/**
 * Get the difficulty level based on module position within a skill's range
 */
export const getDifficultyForModule = (careerPath: string, moduleNumber: number): string => {
  const framework = frameworks[careerPath];
  if (!framework) return 'foundational';
  
  const skill = framework.skills.find(
    s => moduleNumber >= s.moduleStart && moduleNumber <= s.moduleEnd
  );
  if (!skill) return 'foundational';
  
  const range = skill.moduleEnd - skill.moduleStart + 1;
  const position = moduleNumber - skill.moduleStart;
  const progress = position / range;
  
  if (progress >= 0.75) return 'advanced';
  if (progress >= 0.5) return 'developing';
  return 'foundational';
};

/**
 * Get the full career skill framework
 */
export const getCareerFramework = (careerPath: string): CareerSkillFramework | null => {
  return frameworks[careerPath] || null;
};

/**
 * Get all skills for a career path
 */
export const getCareerSkills = (careerPath: string): string[] => {
  const framework = frameworks[careerPath];
  if (!framework) return [];
  return framework.skills.map(s => s.skillName);
};

/**
 * Calculate skill mastery percentage based on completed modules
 */
export const calculateSkillMastery = (
  careerPath: string,
  skillName: string,
  completedModules: number
): number => {
  const framework = frameworks[careerPath];
  if (!framework) return 0;
  
  const skill = framework.skills.find(s => s.skillName === skillName);
  if (!skill) return 0;
  
  const totalSkillModules = skill.moduleEnd - skill.moduleStart + 1;
  const completedInSkill = Math.min(
    Math.max(0, completedModules - skill.moduleStart + 1),
    totalSkillModules
  );
  
  return Math.round((completedInSkill / totalSkillModules) * 100);
};

/**
 * Get all supported career paths
 */
export const getSupportedCareerPaths = (): string[] => Object.keys(frameworks);

/**
 * Check if a career path has a structured question bank
 */
export const hasStructuredQuestionBank = (careerPath: string): boolean => {
  return careerPath in frameworks;
};
