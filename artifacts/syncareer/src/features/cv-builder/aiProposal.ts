export interface CVAIProposal {
  fieldPath: string;
  before: string;
  after: string;
  rationale: string;
}

/**
 * Strictly validates a field-specific proposal. Generic suggestion strings
 * are rejected because they cannot be safely applied or undone.
 */
export function parseCVAIProposal(value: unknown): CVAIProposal | null {
  let candidate: unknown = value;
  if (typeof candidate === 'string') {
    try { candidate = JSON.parse(candidate); } catch { return null; }
  }
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
  const record = candidate as Record<string, unknown>;
  const fieldPath = typeof record.fieldPath === 'string' ? record.fieldPath.trim() : '';
  const before = typeof record.before === 'string' ? record.before : '';
  const after = typeof record.after === 'string' ? record.after.trim() : '';
  const rationale = typeof record.rationale === 'string' ? record.rationale.trim() : '';
  if (!fieldPath || !after || !rationale || after === before.trim()) return null;
  if (!/^(personal|education|experience|projects|activities)\./.test(fieldPath)) return null;
  return { fieldPath, before, after, rationale };
}
