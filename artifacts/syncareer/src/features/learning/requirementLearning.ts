export interface PracticeIdea {
  title: string;
  estimatedTime: string;
  intendedOutcome: string;
  steps: string[];
}

export interface LearningResource {
  provider: string;
  title: string;
  url: string;
  cost: string;
  estimatedTime: string;
  level: string;
  intendedOutcome: string;
  whyRelevant: string;
  lastChecked: string;
}

/**
 * This is intentionally empty until Syncareer has an owner and review cadence
 * for external links. Every future entry must provide all provenance fields.
 */
const configuredResources: ReadonlyArray<
  LearningResource & { skills: string[] }
> = [];

export function resourcesForRequirement(
  requirement: string,
): LearningResource[] {
  const normalised = requirement.trim().toLowerCase();
  return configuredResources
    .filter((resource) =>
      resource.skills.some((skill) => normalised.includes(skill.toLowerCase())),
    )
    .map(({ skills: _skills, ...resource }) => resource);
}

export function practiceIdeaFor(
  requirement: string,
  role?: string,
): PracticeIdea {
  const skill = requirement.trim() || "this requirement";
  const roleContext = role?.trim() ? ` for a ${role.trim()} role` : "";

  return {
    title: `Create a small ${skill} evidence sample`,
    estimatedTime: "60–90 minutes",
    intendedOutcome: `A reviewable work sample that demonstrates how you used ${skill}${roleContext}.`,
    steps: [
      `Choose one realistic, small problem where ${skill} is useful.`,
      "Define the input, constraints, and a clear definition of done.",
      "Create the smallest working output and record the decisions you made.",
      "Review the result for accuracy, then write a short evidence note describing your action and outcome.",
    ],
  };
}

interface EvidenceHrefInput {
  requirement: string;
  role?: string;
  company?: string;
  applicationId?: string;
  returnTo?: string;
}

export function buildEvidenceHref(input: EvidenceHrefInput): string {
  const params = new URLSearchParams({ focusSkill: input.requirement });
  if (input.role) params.set("targetRole", input.role);
  if (input.company) params.set("company", input.company);
  if (input.applicationId) params.set("application", input.applicationId);
  if (input.returnTo?.startsWith("/")) params.set("returnTo", input.returnTo);
  return `/cv-builder?${params.toString()}`;
}
