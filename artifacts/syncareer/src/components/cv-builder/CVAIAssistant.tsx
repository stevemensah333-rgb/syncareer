import { useMemo, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { ContextualAssistantDrawer } from '@/components/assistant/ContextualAssistantDrawer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CVData } from '@/features/cv-builder/types';
import { SECTION_TIPS } from '@/features/cv-builder/constants';
import type { CVAIProposal } from '@/features/cv-builder/aiProposal';

interface Props { cvData: CVData; activeSection: string; onSuggestion: (proposal: CVAIProposal) => boolean; onUndo: () => void; }
interface BulletOption { path: string; value: string; label: string; }

export function CVAIAssistant({ cvData, activeSection, onSuggestion, onUndo }: Props) {
  const bullets = useMemo<BulletOption[]>(() => {
    if (!['experience', 'projects', 'activities'].includes(activeSection)) return [];
    const rows = cvData[activeSection as 'experience' | 'projects' | 'activities'];
    return rows.flatMap((row) => row.bullets.map((value, index) => ({
      path: `${activeSection}.${row.id}.bullets.${index}`,
      value,
      label: `${'company' in row ? row.company : 'projectName' in row ? row.projectName : row.organization || activeSection} · bullet ${index + 1}`,
    }))).filter((item) => item.value.trim());
  }, [activeSection, cvData]);
  const [selectedPath, setSelectedPath] = useState('');
  const selected = bullets.find((item) => item.path === selectedPath) ?? bullets[0] ?? null;
  const tips = SECTION_TIPS[activeSection] || SECTION_TIPS.personal;

  return <div className="space-y-4">
    <Card><CardHeader className="pb-3"><CardTitle className="text-base">Assistant for a selected bullet</CardTitle></CardHeader><CardContent className="space-y-3">
      {bullets.length ? <><div className="space-y-2"><Label htmlFor="assistant-cv-bullet">Bullet to improve</Label><Select value={selected?.path ?? ''} onValueChange={setSelectedPath}><SelectTrigger id="assistant-cv-bullet"><SelectValue /></SelectTrigger><SelectContent>{bullets.map((bullet) => <SelectItem key={bullet.path} value={bullet.path}>{bullet.label}</SelectItem>)}</SelectContent></Select></div>
      {selected && <ContextualAssistantDrawer task="cv.rewrite_bullet" description="Propose a rewrite using only the selected bullet. No other CV fields are sent." suggestedPrompt="Rewrite this bullet for clarity and impact without adding facts, metrics, skills or outcomes." context={[{ id: 'selected-bullet', label: 'Selected CV bullet', provenance: 'selected_cv_text', content: selected.value, personal: true }]} acceptLabel="Apply to draft" onAccept={(text) => onSuggestion({ fieldPath: selected.path, before: selected.value, after: text, rationale: 'Contextual assistant proposal using only the selected bullet.' })} onUndo={onUndo} />}</> : <p className="text-sm text-muted-foreground">Open Experience, Projects or Activities and enter a bullet before requesting a rewrite.</p>}
    </CardContent></Card>
    <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Lightbulb className="h-4 w-4 text-info" />Tips for {activeSection}</CardTitle></CardHeader><CardContent><ul className="space-y-2">{(tips ?? []).map((tip) => <li key={tip} className="text-sm text-muted-foreground">• {tip}</li>)}</ul></CardContent></Card>
  </div>;
}
