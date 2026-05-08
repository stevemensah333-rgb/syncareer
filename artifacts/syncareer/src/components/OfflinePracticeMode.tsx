import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CloudOff, Lightbulb, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  pickOfflineQuestions,
  type OfflineInterviewQuestion,
} from "@/data/offlineInterviewQuestions";

interface OfflinePracticeModeProps {
  jobRole: string;
  questionCount: number;
  onEnd: () => void;
}

/**
 * Lightweight, fully-offline interview practice mode. Uses a static, bundled
 * question bank (no network, no AI). Notes are kept in component state so
 * they don't persist anywhere — this is private practice, not a graded session.
 */
export default function OfflinePracticeMode({
  jobRole,
  questionCount,
  onEnd,
}: OfflinePracticeModeProps) {
  const initial = useMemo(() => pickOfflineQuestions(questionCount), [questionCount]);
  const [questions, setQuestions] = useState<OfflineInterviewQuestion[]>(initial);
  const [index, setIndex] = useState(0);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const current = questions[index];
  const isLast = index === questions.length - 1;

  const reshuffle = () => {
    setQuestions(pickOfflineQuestions(questionCount));
    setIndex(0);
    setNotes({});
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        <CloudOff className="h-3.5 w-3.5 flex-shrink-0" />
        <span>
          Offline practice mode — AI feedback is paused. Reconnect to get scored
          feedback and save your session.
        </span>
      </div>

      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Question {index + 1} of {questions.length}
            </span>
            <span className="capitalize">
              {current.category} · {jobRole || "general"}
            </span>
          </div>
          <CardTitle className="text-xl leading-snug">
            {current.question}
          </CardTitle>
          {current.hint && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" />
              <span>{current.hint}</span>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={notes[current.id] || ""}
            onChange={(e) =>
              setNotes((prev) => ({ ...prev, [current.id]: e.target.value }))
            }
            placeholder="Jot down your answer or key talking points…"
            rows={6}
          />
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Previous
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={reshuffle}>
                <RotateCcw className="h-4 w-4 mr-2" /> New questions
              </Button>
              {isLast ? (
                <Button onClick={onEnd}>Finish practice</Button>
              ) : (
                <Button onClick={() => setIndex((i) => i + 1)}>
                  Next <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
