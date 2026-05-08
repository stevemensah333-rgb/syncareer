import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Loader2, Trophy, RefreshCcw } from 'lucide-react';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface ModuleQuizDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questions: QuizQuestion[];
  loading: boolean;
  pathTitle: string;
  moduleNumber: number;
  skillName?: string | null;
  onPass: (score: number) => void;
  onRetry: () => void;
}

type QuizPhase = 'answering' | 'reviewing' | 'result';

const ModuleQuizDialog: React.FC<ModuleQuizDialogProps> = ({
  open, onOpenChange, questions, loading, pathTitle, moduleNumber, skillName, onPass, onRetry,
}) => {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([null, null, null]);
  const [phase, setPhase] = useState<QuizPhase>('answering');
  const [score, setScore] = useState(0);

  const resetQuiz = () => {
    setCurrentQ(0);
    setAnswers([null, null, null]);
    setPhase('answering');
    setScore(0);
  };

  const handleSelect = (value: string) => {
    const updated = [...answers];
    updated[currentQ] = parseInt(value);
    setAnswers(updated);
  };

  const handleNext = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
    }
  };

  const handleSubmit = () => {
    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correctIndex) correct++;
    });
    const pct = Math.round((correct / questions.length) * 100);
    setScore(pct);
    setPhase('reviewing');
    setCurrentQ(0);
  };

  const handleFinishReview = () => {
    setPhase('result');
  };

  const passed = score >= 70;

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetQuiz();
    }
    onOpenChange(isOpen);
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Generating quiz for Module {moduleNumber}...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {phase === 'result' ? 'Quiz Results' : `Module ${moduleNumber} Validation`}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {pathTitle}{skillName ? ` — ${skillName}` : ''}
          </DialogDescription>
        </DialogHeader>

        {phase === 'answering' && questions.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Progress value={((currentQ + 1) / questions.length) * 100} className="h-2 flex-1" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {currentQ + 1}/{questions.length}
              </span>
            </div>

            <div className="space-y-4">
              <p className="font-medium text-sm leading-relaxed">{questions[currentQ].question}</p>
              <RadioGroup
                value={answers[currentQ]?.toString() ?? ''}
                onValueChange={handleSelect}
                className="space-y-2"
              >
                {questions[currentQ].options.map((opt, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer">
                    <RadioGroupItem value={idx.toString()} id={`q${currentQ}-opt${idx}`} className="mt-0.5" />
                    <Label htmlFor={`q${currentQ}-opt${idx}`} className="text-sm cursor-pointer flex-1 leading-relaxed">
                      {opt}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
                disabled={currentQ === 0}
              >
                Previous
              </Button>
              {currentQ < questions.length - 1 ? (
                <Button size="sm" onClick={handleNext} disabled={answers[currentQ] === null}>
                  Next
                </Button>
              ) : (
                <Button size="sm" onClick={handleSubmit} disabled={answers.some(a => a === null)}>
                  Submit
                </Button>
              )}
            </div>
          </div>
        )}

        {phase === 'reviewing' && questions.length > 0 && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <Progress value={((currentQ + 1) / questions.length) * 100} className="h-2 flex-1" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Review {currentQ + 1}/{questions.length}
              </span>
            </div>

            <div className="space-y-3">
              <p className="font-medium text-sm leading-relaxed">{questions[currentQ].question}</p>
              {questions[currentQ].options.map((opt, idx) => {
                const isCorrect = idx === questions[currentQ].correctIndex;
                const isChosen = idx === answers[currentQ];
                let className = 'p-3 border rounded-lg text-sm flex items-start gap-2';
                if (isCorrect) className += ' border-green-500 bg-green-500/10';
                else if (isChosen && !isCorrect) className += ' border-destructive bg-destructive/10';

                return (
                  <div key={idx} className={className}>
                    {isCorrect ? <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> :
                     isChosen ? <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" /> :
                     <div className="h-4 w-4 shrink-0" />}
                    <span className="leading-relaxed">{opt}</span>
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                {questions[currentQ].explanation}
              </p>
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentQ(Math.max(0, currentQ - 1))} disabled={currentQ === 0}>
                Previous
              </Button>
              {currentQ < questions.length - 1 ? (
                <Button size="sm" onClick={() => setCurrentQ(currentQ + 1)}>Next</Button>
              ) : (
                <Button size="sm" onClick={handleFinishReview}>See Results</Button>
              )}
            </div>
          </div>
        )}

        {phase === 'result' && (
          <div className="flex flex-col items-center py-6 gap-5">
            <div className={`h-16 w-16 rounded-full flex items-center justify-center ${passed ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
              {passed ? <Trophy className="h-8 w-8 text-green-500" /> : <XCircle className="h-8 w-8 text-destructive" />}
            </div>
            <div className="text-center space-y-1">
              <p className="text-2xl font-bold">{score}%</p>
              <p className={`text-sm font-medium ${passed ? 'text-green-600' : 'text-destructive'}`}>
                {passed ? 'Module Completed!' : 'Not Yet — Keep Improving'}
              </p>
              <p className="text-xs text-muted-foreground">
                {passed ? 'Your progress has been updated.' : 'You need 70% or higher to pass. Review and try again.'}
              </p>
            </div>
            {passed ? (
              <Button className="w-full" onClick={() => { onPass(score); handleClose(false); }}>
                Continue Learning
              </Button>
            ) : (
              <Button variant="outline" className="w-full" onClick={() => { resetQuiz(); onRetry(); }}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Retry Quiz
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ModuleQuizDialog;
