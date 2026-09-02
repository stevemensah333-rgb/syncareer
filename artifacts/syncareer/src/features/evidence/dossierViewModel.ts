import { deriveSupportStatus } from './supportStatus';
import type {
  ApplicationEvidenceLinkRow,
  ApplicationRequirementRow,
  EvidenceItemRow,
  EvidenceSourceRow,
  EvidenceSupportStatus,
  ResumeEvidenceLinkRow,
} from './types';

/**
 * Pure view-model for the Application Dossier evidence threads:
 *   Requirement → evidence (reference + support status) → CV/interview usage.
 *
 * Lines in the UI are decorative; this module keeps the semantic
 * relationship as plain, ordered data that renders readably in the DOM at
 * any width.
 */

export interface EvidenceThreadEntry {
  item: EvidenceItemRow;
  link: ApplicationEvidenceLinkRow;
  sources: EvidenceSourceRow[];
  supportStatus: EvidenceSupportStatus;
  usedInCv: boolean;
  usedInInterview: boolean;
}

export interface RequirementThread {
  requirement: ApplicationRequirementRow;
  evidence: EvidenceThreadEntry[];
}

export interface EvidenceCoverage {
  requirementCount: number;
  supportedRequirementCount: number;
  gapRequirementCount: number;
}

export function buildRequirementThreads(
  requirements: ApplicationRequirementRow[],
  links: ApplicationEvidenceLinkRow[],
  evidence: EvidenceItemRow[],
  sources: EvidenceSourceRow[],
  resumeLinks: ResumeEvidenceLinkRow[],
): RequirementThread[] {
  const evidenceById = new Map(evidence.map((item) => [item.id, item]));
  const sourcesByEvidence = new Map<string, EvidenceSourceRow[]>();
  for (const source of sources) {
    const existing = sourcesByEvidence.get(source.evidence_id);
    if (existing) existing.push(source);
    else sourcesByEvidence.set(source.evidence_id, [source]);
  }
  const usedInCvIds = new Set(resumeLinks.map((link) => link.evidence_id));
  const usedInInterviewIds = new Set(
    sources.filter((source) => source.source_type === 'interview_response').map((source) => source.evidence_id),
  );

  return requirements.map((requirement) => {
    const requirementLinks = links
      .filter((link) => link.requirement_id === requirement.id)
      // Stable order: by evidence creation time so threads do not reshuffle
      // between saves.
      .sort((a, b) => a.created_at.localeCompare(b.created_at));

    const entries: EvidenceThreadEntry[] = [];
    for (const link of requirementLinks) {
      const item = evidenceById.get(link.evidence_id);
      if (!item) continue;
      const itemSources = sourcesByEvidence.get(item.id) ?? [];
      entries.push({
        item,
        link,
        sources: itemSources,
        supportStatus: deriveSupportStatus(item.review_status, itemSources.length),
        usedInCv: usedInCvIds.has(item.id),
        usedInInterview: usedInInterviewIds.has(item.id),
      });
    }

    return { requirement, evidence: entries };
  });
}

export function threadCoverage(threads: RequirementThread[]): EvidenceCoverage {
  let supported = 0;
  let gaps = 0;
  for (const thread of threads) {
    const hasSupported = thread.evidence.some((entry) => entry.supportStatus === 'supported');
    if (hasSupported) supported += 1;
    else gaps += 1;
  }
  return {
    requirementCount: threads.length,
    supportedRequirementCount: supported,
    gapRequirementCount: gaps,
  };
}

/**
 * Evidence owned by the student that is not yet linked to any requirement.
 * The dossier surfaces these as "not yet placed" so nothing saved is silently
 * forgotten, while archived evidence stays visible but flagged.
 */
export function unplacedEvidence(
  evidence: EvidenceItemRow[],
  sources: EvidenceSourceRow[],
  links: ApplicationEvidenceLinkRow[],
): Array<{ item: EvidenceItemRow; supportStatus: EvidenceSupportStatus }> {
  const linkedIds = new Set(links.map((link) => link.evidence_id));
  const sourceCount = new Map<string, number>();
  for (const source of sources) {
    sourceCount.set(source.evidence_id, (sourceCount.get(source.evidence_id) ?? 0) + 1);
  }
  return evidence
    .filter((item) => !linkedIds.has(item.id))
    .map((item) => ({ item, supportStatus: deriveSupportStatus(item.review_status, sourceCount.get(item.id) ?? 0) }));
}
