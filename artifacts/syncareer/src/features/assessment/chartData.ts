/**
 * Pure transforms from raw assessment scores → chart data shapes.
 * Keeps chart-specific aggregations out of the page component.
 */

export const PERSONALITY_AXES = [
  { label: 'Leadership', qIds: [1, 7, 14] },
  { label: 'Independence', qIds: [2, 8] },
  { label: 'Adaptability', qIds: [3, 13] },
  { label: 'Social', qIds: [4, 9, 11, 15] },
  { label: 'Detail', qIds: [5, 12] },
  { label: 'Drive', qIds: [6, 10] },
] as const;

export const SKILLS_AXES = [
  { label: 'Writing', qIds: [16] },
  { label: 'Data', qIds: [17, 24] },
  { label: 'Tech', qIds: [18, 28] },
  { label: 'Presenting', qIds: [19] },
  { label: 'Planning', qIds: [20, 27] },
  { label: 'Problem Solving', qIds: [21, 26] },
  { label: 'Design', qIds: [22] },
  { label: 'Negotiation', qIds: [23] },
  { label: 'Relationships', qIds: [25, 29, 30] },
] as const;

interface AxisDef {
  label: string;
  qIds: readonly number[];
}

function aggregateToPercent(
  axes: ReadonlyArray<AxisDef>,
  scores: Record<string, number>,
): Array<{ axis: string; value: number }> {
  return axes.map(({ label, qIds }) => {
    const vals = qIds
      .map((id) => scores[`q${id}`] ?? 0)
      .filter((v) => v > 0);
    const avg = vals.length > 0
      ? vals.reduce((a, b) => a + b, 0) / vals.length
      : 0;
    return { axis: label, value: Math.round((avg / 5) * 100) };
  });
}

export function personalityRadarData(
  personalityScores: Record<string, number>,
) {
  return aggregateToPercent(PERSONALITY_AXES, personalityScores);
}

export function skillsBarData(
  skillsScores: Record<string, number>,
) {
  return aggregateToPercent(SKILLS_AXES, skillsScores).sort(
    (a, b) => b.value - a.value,
  );
}
