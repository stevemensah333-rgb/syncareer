import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CloudOff,
  CloudUpload,
  Lightbulb,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useOfflineDraft } from "@/hooks/useOfflineDraft";
import {
  pickOfflineQuestions,
  type OfflineInterviewQuestion,
} from "@/data/offlineInterviewQuestions";

interface OfflinePracticeDraft {
  jobRole: string;
  questions: OfflineInterviewQuestion[];
  index: number;
  notes: Record<string, string>;
  startedAt: number;
}

interface OfflinePracticeModeProps {
  jobRole: string;
  questionCount: number;
  userId: string | null | undefined;
  onEnd: () => void;
  /**
   * Push the locally-saved practice session up to the cloud. Called when the
   * user clicks "Sync now" while online. Resolves true on success.
   */
  onSync?: (draft: OfflinePracticeDraft) => Promise<boolean>;
}

/**
 * Lightweight, fully-offline interview practice mode. Uses a static, bundled
 * question bank (no network, no AI). Notes are persisted to localStorage via
 * useOfflineDraft so they survive reload and are available when offline.
 * When the user reconnects, a "Sync now" action pushes the session to the
 * cloud via the parent-supplied handler.
 */
export default function OfflinePracticeMode({
  jobRole,
  questionCount,
  userId,
  onEnd,
  onSync,
}: OfflinePracticeModeProps) {
  const isOnline = useOnlineStatus();
  const draftStore = useOfflineDraft<OfflinePracticeDraft>(
    "interview-practice",
    userId,
  );

  const initial = useMemo<OfflinePracticeDraft>(() => {
    if (
      draftStore.draft &&
      draftStore.draft.questions?.length > 0 &&
      // If the user changed roles, start fresh
      (!jobRole || draftStore.draft.jobRole === jobRole)
    ) {
      return draftStore.draft;
    }
    return {
      jobRole,
      questions: pickOfflineQuestions(questionCount),
      index: 0,
      notes: {},
      startedAt: Date.now(),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [questions, setQuestions] = useState(initial.questions);
  const [index, setIndex] = useState(initial.index);
  const [notes, setNotes] = useState<Record<string, string>>(initial.notes);
  const [startedAt] = useState(initial.startedAt);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);

  // Persist on every change so reload / closing the tab doesn't lose work.
  useEffect(() => {
    draftStore.saveDraft({
      jobRole,
      questions,
      index,
      notes,
      startedAt,
    });
    setSynced(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, index, notes, jobRole, startedAt]);

  const current = questions[index];
  const isLast = index === questions.length - 1;
  const answeredCount = Object.values(notes).filter((n) => n.trim().length > 0).length;

  const reshuffle = () => {
    setQuestions(pickOfflineQuestions(questionCount));
    setIndex(0);
    setNotes({});
  };

  const handleSync = async () => {
    if (!onSync || !isOnline) return;
    setSyncing(true);
    try {
      const ok = await onSync({
        jobRole,
        questions,
        index,
        notes,
        startedAt,
      });
      if (ok) {
        setSynced(true);
        draftStore.clearDraft();
      }
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={
          "flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs " +
          (isOnline
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : "border-amber-200 bg-amber-50 text-amber-900")
        }
      >
        <div className="flex items-center gap-2">
          <CloudOff className="h-3.5 w-3.5 flex-shrink-0" />
          <span>
            {isOnline
              ? "You're back online — sync your practice notes to save them."
              : "Offline practice mode — AI feedback is paused. Notes are saved locally and will sync when you reconnect."}
          </span>
        </div>
        {onSync && answeredCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleSync}
            disabled={!isOnline || syncing || synced}
            className="h-7 text-xs"
          >
            <CloudUpload className="h-3.5 w-3.5 mr-1.5" />
            {synced ? "Synced" : syncing ? "Syncing…" : "Sync now"}
          </Button>
        )}
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
