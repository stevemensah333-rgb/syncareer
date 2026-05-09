export type Trait = "Realistic" | "Investigative" | "Artistic" | "Social" | "Enterprising" | "Conventional";

export type Question = {
  id: number;
  text: string;
  trait: Trait;
};

export const QUESTIONS: Question[] = [
  { id: 1, text: "I enjoy building or repairing things with my hands.", trait: "Realistic" },
  { id: 2, text: "I like working outdoors or with tools and machines.", trait: "Realistic" },
  { id: 3, text: "I am curious and enjoy solving complex problems.", trait: "Investigative" },
  { id: 4, text: "I like analysing data and researching new ideas.", trait: "Investigative" },
  { id: 5, text: "I enjoy designing, drawing, writing, or making music.", trait: "Artistic" },
  { id: 6, text: "I prefer creative tasks over structured routines.", trait: "Artistic" },
  { id: 7, text: "I enjoy helping, teaching, or supporting other people.", trait: "Social" },
  { id: 8, text: "I am a good listener and people share their problems with me.", trait: "Social" },
  { id: 9, text: "I like leading teams and persuading others.", trait: "Enterprising" },
  { id: 10, text: "I am comfortable taking risks to start something new.", trait: "Enterprising" },
  { id: 11, text: "I like working with numbers, lists, and clear procedures.", trait: "Conventional" },
  { id: 12, text: "I prefer organised, predictable environments.", trait: "Conventional" },
];

export const LIKERT = [
  { value: 1, label: "Strongly disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly agree" },
];

export const TRAIT_DESCRIPTIONS: Record<Trait, { title: string; blurb: string; careers: string[] }> = {
  Realistic: {
    title: "The Builder",
    blurb: "You like practical, hands-on work and tangible results.",
    careers: ["Mechanical Engineer", "Agricultural Specialist", "Construction Manager"],
  },
  Investigative: {
    title: "The Thinker",
    blurb: "You enjoy research, analysis, and figuring out how things work.",
    careers: ["Data Analyst", "Research Scientist", "Software Engineer"],
  },
  Artistic: {
    title: "The Creator",
    blurb: "You thrive when you can express ideas and design new things.",
    careers: ["UX Designer", "Content Creator", "Architect"],
  },
  Social: {
    title: "The Helper",
    blurb: "You are energised by supporting, teaching, and connecting with people.",
    careers: ["Teacher", "Counsellor", "Public Health Officer"],
  },
  Enterprising: {
    title: "The Leader",
    blurb: "You are persuasive, ambitious, and ready to lead and take risks.",
    careers: ["Entrepreneur", "Sales Manager", "Project Lead"],
  },
  Conventional: {
    title: "The Organiser",
    blurb: "You bring order, accuracy, and structure to complex work.",
    careers: ["Accountant", "Operations Analyst", "Compliance Officer"],
  },
};
