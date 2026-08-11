import { useState } from "react";
import { ExternalLink, Lightbulb } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  practiceIdeaFor,
  resourcesForRequirement,
} from "@/features/learning/requirementLearning";
import { ANALYTICS_EVENTS, captureProductEvent } from "@/services/analytics";

type Decision = "learning" | "practice" | "resource" | "not-relevant" | null;

interface Props {
  requirement: string;
  role?: string;
  evidenceHref?: string;
  onAddEvidence?: () => void;
  onNotRelevant?: () => void;
  surface?: 'opportunity' | 'application' | 'cv';
}

export function RequirementEvidenceActions({
  requirement,
  role,
  evidenceHref,
  onAddEvidence,
  onNotRelevant,
  surface = 'opportunity',
}: Props) {
  const [decision, setDecision] = useState<Decision>(null);
  const practice = practiceIdeaFor(requirement, role);
  const resources = resourcesForRequirement(requirement);

  const emitLearning = (action: 'already_know' | 'learning' | 'practice_selected' | 'resource_requested' | 'not_relevant' | 'evidence_opened') => {
    try {
      captureProductEvent(ANALYTICS_EVENTS.CONTEXTUAL_LEARNING_ACTIONED, {
        surface,
        action,
      });
    } catch { /* never break product */ }
  };

  const choose = (next: Decision) => {
    setDecision(next);
    if (next === "not-relevant") {
      emitLearning('not_relevant');
      onNotRelevant?.();
      return;
    }
    if (next === "learning") emitLearning('learning');
    if (next === "practice") emitLearning('practice_selected');
    if (next === "resource") emitLearning('resource_requested');
  };

  const handleAddEvidence = () => {
    emitLearning('already_know');
    onAddEvidence?.();
  };

  const handleEvidenceLink = () => {
    emitLearning('evidence_opened');
  };

  const evidenceButton = (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="h-auto min-h-9 whitespace-normal text-left"
      onClick={handleAddEvidence}
    >
      I have this — add evidence
    </Button>
  );

  return (
    <div
      className="space-y-3 rounded-lg border bg-card p-3"
      data-testid={`requirement-${requirement}`}
    >
      <div>
        <p className="text-sm font-medium">{requirement}</p>
        <p className="text-xs text-muted-foreground">
          Choose what is true for you. Nothing is added to your CV
          automatically.
        </p>
      </div>
      <div
        className="flex flex-wrap gap-2"
        aria-label={`Next step for ${requirement}`}
      >
        {evidenceHref ? (
          <Button
            size="sm"
            variant="outline"
            className="h-auto min-h-9 whitespace-normal text-left"
            asChild
          >
            <Link to={evidenceHref} onClick={handleEvidenceLink}>I have this — add evidence</Link>
          </Button>
        ) : (
          evidenceButton
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-auto min-h-9 whitespace-normal"
          aria-pressed={decision === "learning"}
          onClick={() => choose("learning")}
        >
          I'm learning this
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-auto min-h-9 whitespace-normal"
          aria-pressed={decision === "practice"}
          onClick={() => choose("practice")}
        >
          Find a practice/project idea
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-auto min-h-9 whitespace-normal"
          aria-pressed={decision === "resource"}
          onClick={() => choose("resource")}
        >
          Find a learning resource
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-auto min-h-9"
          aria-pressed={decision === "not-relevant"}
          onClick={() => choose("not-relevant")}
        >
          Not relevant
        </Button>
      </div>

      {decision === "learning" && (
        <div role="status" className="rounded-md bg-muted p-3 text-sm">
          Keep this as a learning target until you have truthful evidence. A
          practice idea can help you create that evidence.
        </div>
      )}
      {decision === "practice" && (
        <div
          role="status"
          className="space-y-2 rounded-md bg-primary/5 p-3 text-sm"
        >
          <p className="flex items-center gap-2 font-medium">
            <Lightbulb className="h-4 w-4 text-primary" />
            {practice.title}
          </p>
          <p>{practice.intendedOutcome}</p>
          <p className="text-xs text-muted-foreground">
            Suggested scope: {practice.estimatedTime}
          </p>
          <ol className="list-decimal space-y-1 pl-5">
            {practice.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      )}
      {decision === "resource" &&
        (resources.length ? (
          <div role="status" className="space-y-2">
            {resources.map((resource) => (
              <article
                key={resource.url}
                className="rounded-md bg-muted p-3 text-sm"
              >
                <p className="font-medium">{resource.title}</p>
                <p>
                  {resource.provider} · {resource.cost} ·{" "}
                  {resource.estimatedTime} · {resource.level}
                </p>
                <p>{resource.intendedOutcome}</p>
                <p className="text-muted-foreground">
                  Why relevant: {resource.whyRelevant}
                </p>
                <p className="text-xs text-muted-foreground">
                  Link last checked: {resource.lastChecked}
                </p>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-primary hover:underline"
                  onClick={() => emitLearning('resource_requested')}
                >
                  Open external resource{" "}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </article>
            ))}
          </div>
        ) : (
          <div role="status" className="rounded-md bg-muted p-3 text-sm">
            No maintained external resource is configured for this requirement
            yet. Syncareer will not send you to an unchecked search result. Try
            the practice/project idea instead.
          </div>
        ))}
      {decision === "not-relevant" && !onNotRelevant && (
        <div role="status" className="text-sm text-muted-foreground">
          Marked not relevant for this visit. This does not change the source
          posting or your profile.
        </div>
      )}
    </div>
  );
}
