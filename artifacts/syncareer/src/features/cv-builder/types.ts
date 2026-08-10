export interface CVData {
  personal: {
    firstName: string;
    lastName: string;
    phone: string;
    nationality: string;
    email: string;
    schoolEmail: string;
    linkedIn: string;
  };
  education: {
    university: string;
    location: string;
    degree: string;
    graduationDate: string;
    gpa: string;
  };
  achievements: Array<{
    id: string;
    title: string;
    organization: string;
    date: string;
  }>;
  experience: Array<{
    id: string;
    company: string;
    location: string;
    date: string;
    role: string;
    bullets: string[];
  }>;
  projects: Array<{
    id: string;
    organization: string;
    date: string;
    projectName: string;
    role: string;
    bullets: string[];
  }>;
  activities: Array<{
    id: string;
    organization: string;
    activity: string;
    date: string;
    role: string;
    bullets: string[];
  }>;
  skills: string[];
  references: string;
}

export const initialCVData: CVData = {
  personal: {
    firstName: '',
    lastName: '',
    phone: '',
    nationality: '',
    email: '',
    schoolEmail: '',
    linkedIn: '',
  },
  education: {
    university: '',
    location: '',
    degree: '',
    graduationDate: '',
    gpa: '',
  },
  achievements: [],
  experience: [],
  projects: [],
  activities: [],
  skills: [],
  references: 'Available upon request',
};
