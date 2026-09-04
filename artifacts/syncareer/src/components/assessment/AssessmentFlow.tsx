import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, ClipboardCheck, Compass } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { LIKERT_OPTIONS, type AssessmentQuestion } from '@/data/assessmentQuestions';
import { cn } from '@/lib/utils';

/**
 * ADVANCE-mode assessment flow: one question at a time, progressive.
 *
 * The question bank, Likert scale and scoring are untouched — this component
 * only changes how the 45 answers are gathered. Section intros (personality →
 * task preferences → work interests) stay as deliberate pacing beats, and a
 * running progress track makes progress meaningful: answered count, section
 * name, and which of the 45 questions is on screen.
 *
 * Motion is entrance/feedback only (question enter + selection tint), on the
 * shared 120–180ms tokens, and collapses under prefers-reduced-motion via the
 * global stylesheet rules.
 */

interface SectionIntro {
  key: string;
  title: string;
  description: string;
  questionRange: string;
}

interface Props {
  questions: AssessmentQuestion[];
  sectionIntros: SectionIntro[];
  sectionStartIndices: number[];
  sectionName: (category: AssessmentQuestion['category']) => string;
  answers: Record<number, number>;
  onAnswer: (questionId: number, value: number) => void;
  onComplete: () => void;
  submitting: boolean;
}

const SECTION_INDEX: Record<AssessmentQuestion['category'], number> = {
  personality: 0,
  skills: 1,
  work_interest: 2,
};

export function AssessmentFlow({
  questions,
  sectionIntros,
  sectionStartIndices,
  sectionName,
  answers,
  onAnswer,
  onComplete,
  submitting,
}: Props) {
  const total = questions.length;
  const [index, setIndex] = useState(0);
  const [introSection, setIntroSection] = useState<number | null>(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mql.matches);
    const onChange = () => setReducedMotion(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const question = questions[index]!;
  const answeredCount = Object.keys(answers).length;
  const progressPercent = (answeredCount / total) * 100;
  const isLast = index === total - 1;
  const currentValue = answers[question.id];

  const sectionProgress = useMemo(() => {
    const current = SECTION_INDEX[question.category];
    const sectionStart = sectionStartIndices[current]!;
    const sectionEnd = sectionStartIndices[current + 1] ?? total;
    return {
      section: current + 1,
      total: 3,
      name: sectionName(question.category),
      withinSection: index - sectionStart + 1,
      sectionSize: sectionEnd - sectionStart,
    };
  }, [question, index, sectionName, sectionStartIndices, total]);

  const goTo = useCallback(
    (next: number) => {
      setIndex(next);
      // Landing exactly on a section's first question replays its intro —
      // this is true for auto-advance across boundaries and for back-nav
      // into the opening question of a section.
      if (sectionStartIndices.includes(next)) {
        setIntroSection(SECTION_INDEX[questions[next]!.category]);
      }
    },
    [questions, sectionStartIndices],
  );

  const handleAnswer = useCallback(
    (value: number) => {
      const isFinalQuestion = index === total - 1;
      const answeringLastGap = answeredCount === total - 1;
      onAnswer(question.id, value);
      // Auto-advance after the selection settles: the radio gets its
      // selection state (150ms token), then the next question enters.
      // On the final unanswered question the same beat later reveals the
      // profile.
      // A short beat lets the radio show its selected state before the next
      // question enters. Under reduced motion the beat collapses to a single
      // tick so motion-sensitive users wait for no animation.
      const advanceDelay = reducedMotion ? 0 : 180;
      const completeDelay = reducedMotion ? 0 : 260;
      if (!isFinalQuestion) {
        window.setTimeout(() => goTo(index + 1), advanceDelay);
      } else if (answeringLastGap) {
        window.setTimeout(() => onComplete(), completeDelay);
      }
    },
    [question.id, index, total, answeredCount, reducedMotion, onAnswer, onComplete, goTo],
  );

  const canGoNext = currentValue !== undefined;

  if (introSection !== null) {
    const intro = sectionIntros[introSection]!;
    return (
      <div className="mx-auto max-w-xl">
        <FlowProgress
          answeredCount={answeredCount}
          total={total}
          progressPercent={progressPercent}
          label={`Section ${introSection + 1} of 3`}
        />
        <Card>
          <CardContent className="flex flex-col items-center space-y-5 pb-10 pt-10 text-center">
            <Badge variant="secondary" className="text-xs">
              Questions {intro.questionRange}
            </Badge>
            <div className="space-y-1">
              <p className="type-label text-muted-foreground">Section {introSection + 1} of 3</p>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{intro.title}</h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              {intro.description}
            </p>
            <Button size="lg" onClick={() => setIntroSection(null)} className="mt-2 rounded-full px-6">
              Begin section <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <FlowProgress
        answeredCount={answeredCount}
        total={total}
        progressPercent={progressPercent}
        label={`Question ${index + 1} of ${total}`}
      />

      <Card key={question.id} className="overflow-hidden">
        <div
          className="border-b border-border-subtle bg-secondary/30 px-6 py-3"
          aria-hidden="true"
        >
          <div className="flex items-center justify-between">
            <span className="type-label flex items-center gap-1.5 text-muted-foreground">
              <Compass className="h-3.5 w-3.5" />
              {sectionProgress.name} · {sectionProgress.withinSection} of {sectionProgress.sectionSize}
            </span>
            <span className="type-meta text-muted-foreground">
              Section {sectionProgress.section} of {sectionProgress.total}
            </span>
          </div>
        </div>

        <CardContent className="space-y-6 pt-7">
          <fieldset key={`fs-${question.id}`} className="interview-question-enter">
            <legend className="text-lg font-medium leading-relaxed text-foreground sm:text-xl">
              {question.text}
            </legend>

            <RadioGroup
              value={currentValue?.toString() ?? ''}
              onValueChange={(next) => handleAnswer(Number(next))}
              aria-label={question.text}
              className="mt-5 space-y-2"
            >
              {LIKERT_OPTIONS.map((option) => {
                const selected = currentValue === option.value;
                return (
                  <label
                    key={option.value}
                    className={cn(
                      'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors duration-150 ease-standard motion-reduce:transition-none',
                      selected
                        ? 'border-primary/40 bg-primary/10'
                        : 'border-transparent hover:bg-muted/60 focus-within:bg-muted/60',
                    )}
                  >
                    <RadioGroupItem
                      value={option.value.toString()}
                      id={`q${question.id}-${option.value}`}
                    />
                    <span className="flex-1 text-sm">{option.label}</span>
                  </label>
                );
              })}
            </RadioGroup>
          </fieldset>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              className="rounded-full px-5"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            {isLast ? (
              <Button
                onClick={onComplete}
                disabled={answeredCount < total || submitting}
                className="rounded-full px-6"
              >
                {submitting ? 'Preparing your profile…' : 'See my Career Profile'}
                <ClipboardCheck className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => goTo(index + 1)}
                disabled={!canGoNext}
                className="rounded-full px-6"
              >
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Answer based on what genuinely interests you — there are no right or wrong responses.
      </p>
    </div>
  );
}

function FlowProgress({
  answeredCount,
  total,
  progressPercent,
  label,
}: {
  answeredCount: number;
  total: number;
  progressPercent: number;
  label: string;
}) {
  return (
    <div className="mb-2">
      <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        <span>{answeredCount} of {total} answered</span>
      </div>
      <Progress
        value={progressPercent}
        className="h-1.5"
        aria-label={`Assessment progress: ${answeredCount} of ${total} questions answered`}
      />
    </div>
  );
}
