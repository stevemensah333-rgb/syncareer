/**
 * Pure parser for the final interview report embedded in the last
 * assistant message.  Operates on raw text — no React or Supabase deps.
 */

export interface FinalReport {
  overallScore: number;
  overallVerdict: string;
  readiness: string;
  assessment: string;
  strengths: string[];
  weaknesses: string[];
  priorities: string[];
  nextSteps: string[];
  categoryScores: {
    technical: number | null;
    behavioral: number | null;
    situational: number | null;
    communication: number;
    overall_impression: number;
  };
  interviewerNote?: string;
}

export function parseFinalReport(content: string): FinalReport | null {
  try {
    const scoreMatch = content.match(/Score:\s*(\d+)\/100/);
    const verdictMatch = content.match(/—\s*([^\n]+)/);
    const readinessMatch = content.match(/Readiness:\s*([^\n]+)/);
    const assessmentMatch = content.match(
      /Readiness:[^\n]*\n\n([\s\S]*?)(?:\n\n|✅)/,
    );
    const strengthsMatch = content.match(/✅ Strengths:\s*([^\n]+)/);
    const weaknessesMatch = content.match(/⚠️ Areas to Improve:\s*([^\n]+)/);
    const nextStepsMatch = content.match(/📋 Next Steps:\s*([^\n]+)/);
    const noteMatch = content.match(/💼 Interviewer's Note:\s*([^\n]+)/);

    if (!scoreMatch) return null;

    return {
      overallScore: parseInt(scoreMatch[1]!, 10),
      overallVerdict: verdictMatch?.[1]?.trim() ?? 'N/A',
      readiness: readinessMatch?.[1]?.trim() ?? 'N/A',
      assessment: assessmentMatch?.[1]?.trim() ?? '',
      strengths: strengthsMatch?.[1]?.split(', ').filter(Boolean) ?? [],
      weaknesses: weaknessesMatch?.[1]?.split(', ').filter(Boolean) ?? [],
      priorities: [],
      nextSteps: nextStepsMatch?.[1]?.split(', ').filter(Boolean) ?? [],
      categoryScores: {
        technical: null,
        behavioral: null,
        situational: null,
        communication: 0,
        overall_impression: parseInt(scoreMatch[1]!, 10),
      },
      interviewerNote: noteMatch?.[1]?.trim(),
    };
  } catch {
    return null;
  }
}
