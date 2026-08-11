import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { LIKERT_OPTIONS, type AssessmentQuestion } from '@/data/assessmentQuestions';

interface Props { question: AssessmentQuestion; questionNumber: number; value?: number; onChange: (questionId: number, value: number) => void; }

export function AssessmentQuestionCard({ question, questionNumber, value, onChange }: Props) {
  return <Card className={`border-l-4 transition-colors ${value !== undefined ? 'border-l-primary' : 'border-l-primary/20'}`}><CardContent className="pt-6"><fieldset><legend className="mb-4 font-medium"><span className="mr-2 text-muted-foreground">{questionNumber}.</span>{question.text}</legend><RadioGroup value={value?.toString() || ''} onValueChange={(next) => onChange(question.id, Number(next))} className="space-y-2">{LIKERT_OPTIONS.map((option) => <div key={option.value} className={`flex min-h-11 items-center space-x-3 rounded-lg p-2 transition-colors ${value === option.value ? 'border border-primary/30 bg-primary/10' : 'hover:bg-muted/50 focus-within:bg-muted/50'}`}><RadioGroupItem value={option.value.toString()} id={`q${question.id}-${option.value}`} /><Label htmlFor={`q${question.id}-${option.value}`} className="flex-1 cursor-pointer text-sm">{option.label}</Label></div>)}</RadioGroup></fieldset></CardContent></Card>;
}
