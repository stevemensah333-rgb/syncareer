/**
 * Static interview question bank used for offline practice mode.
 * Bundled into the JS so it is precached by the service worker and
 * available without any network call.
 */

export type OfflineQuestionCategory =
  | "behavioral"
  | "technical"
  | "situational"
  | "general";

export interface OfflineInterviewQuestion {
  id: string;
  category: OfflineQuestionCategory;
  question: string;
  hint?: string;
}

export const OFFLINE_INTERVIEW_QUESTIONS: OfflineInterviewQuestion[] = [
  {
    id: "g1",
    category: "general",
    question: "Tell me about yourself.",
    hint: "Aim for 60–90 seconds: present, past, future.",
  },
  {
    id: "g2",
    category: "general",
    question: "Why are you interested in this role?",
    hint: "Tie your skills to two specific responsibilities.",
  },
  {
    id: "g3",
    category: "general",
    question: "What are your greatest strengths?",
    hint: "Pick 2–3, give a concrete example for each.",
  },
  {
    id: "g4",
    category: "general",
    question: "What is a weakness you're actively working on?",
    hint: "Show self-awareness and the steps you're taking.",
  },
  {
    id: "g5",
    category: "general",
    question: "Where do you see yourself in 3 years?",
  },
  {
    id: "b1",
    category: "behavioral",
    question:
      "Describe a time you had a conflict with a teammate. How did you resolve it?",
    hint: "Use the STAR format: Situation, Task, Action, Result.",
  },
  {
    id: "b2",
    category: "behavioral",
    question:
      "Tell me about a time you failed. What did you learn from it?",
  },
  {
    id: "b3",
    category: "behavioral",
    question:
      "Give an example of a goal you set and how you achieved it.",
  },
  {
    id: "b4",
    category: "behavioral",
    question:
      "Describe a time you had to learn something new quickly.",
  },
  {
    id: "b5",
    category: "behavioral",
    question:
      "Tell me about a project you led. What was the outcome?",
  },
  {
    id: "s1",
    category: "situational",
    question:
      "Your manager assigns you a task with an unrealistic deadline. What do you do?",
  },
  {
    id: "s2",
    category: "situational",
    question:
      "A teammate keeps missing deadlines that block your work. How do you handle it?",
  },
  {
    id: "s3",
    category: "situational",
    question:
      "You disagree with a decision your manager made. How do you approach the conversation?",
  },
  {
    id: "t1",
    category: "technical",
    question:
      "Walk me through how you would approach a problem you've never seen before.",
  },
  {
    id: "t2",
    category: "technical",
    question:
      "Describe a tool or technology you learned recently. Why did you choose it?",
  },
  {
    id: "t3",
    category: "technical",
    question:
      "How do you make sure your work is correct before delivering it?",
  },
  {
    id: "t4",
    category: "technical",
    question:
      "Explain a complex concept from your field as if to a non-expert.",
  },
  {
    id: "g6",
    category: "general",
    question: "Why should we hire you?",
    hint: "Connect your top 3 strengths to the role's key requirements.",
  },
  {
    id: "g7",
    category: "general",
    question: "Do you have any questions for us?",
    hint: "Always have 2–3 ready. Ask about team, success, growth.",
  },
];

export function pickOfflineQuestions(count: number): OfflineInterviewQuestion[] {
  const pool = [...OFFLINE_INTERVIEW_QUESTIONS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.max(1, Math.min(count, pool.length)));
}
