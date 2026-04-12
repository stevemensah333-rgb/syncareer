import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Briefcase, GraduationCap, Target, TrendingUp, AlertCircle } from 'lucide-react';

interface ExtractedSkill {
  name: string;
  category: 'technical' | 'soft' | 'domain' | 'tool';
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

interface ExperienceSummary {
  totalYears: number;
  industries: string[];
  educationLevel: string;
  keyAchievements: string[];
}

interface Scores {
  overall: number;
  formatting: number;
  content: number;
  relevance: number;
  impact: number;
}

interface AnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: string;
  isLoading: boolean;
  extractedSkills?: ExtractedSkill[];
  experienceSummary?: ExperienceSummary | null;
  scores?: Scores | null;
  suggestedRoles?: string[];
  missingSkills?: string[];
}

const proficiencyColor: Record<string, string> = {
  beginner: 'bg-muted text-muted-foreground',
  intermediate: 'bg-accent/20 text-accent-foreground',
  advanced: 'bg-primary/20 text-primary',
  expert: 'bg-primary text-primary-foreground',
};

const categoryLabel: Record<string, string> = {
  technical: 'Technical',
  soft: 'Soft Skill',
  domain: 'Domain',
  tool: 'Tool',
};

function renderMarkdown(text: string) {
  if (!text) return null;
  
  const lines = text.split('\n');
  const elements: JSX.Element[] = [];
  let listItems: string[] = [];
  let listKey = 0;
  
  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${listKey++}`} className="list-disc list-inside space-y-1 mb-3 text-sm text-muted-foreground">
          {listItems.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const renderInline = (text: string) => {
    // Bold
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h3 key={`h2-${idx}`} className="text-lg font-semibold text-foreground mt-4 mb-2">
          {trimmed.slice(3)}
        </h3>
      );
    } else if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={`h3-${idx}`} className="text-base font-semibold text-foreground mt-3 mb-1">
          {trimmed.slice(4)}
        </h4>
      );
    } else if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h2 key={`h1-${idx}`} className="text-xl font-bold text-foreground mt-4 mb-2">
          {trimmed.slice(2)}
        </h2>
      );
    } else if (trimmed.match(/^[-*•]\s/)) {
      listItems.push(trimmed.replace(/^[-*•]\s/, ''));
    } else if (trimmed.match(/^\d+\.\s/)) {
      listItems.push(trimmed.replace(/^\d+\.\s/, ''));
    } else if (trimmed === '') {
      flushList();
    } else {
      flushList();
      elements.push(
        <p key={`p-${idx}`} className="text-sm text-muted-foreground mb-2">
          {renderInline(trimmed)}
        </p>
      );
    }
  });
  
  flushList();
  return elements;
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}/100</span>
      </div>
      <Progress value={value} className="h-2" />
    </div>
  );
}

export function AnalysisDialog({ 
  open, onOpenChange, analysis, isLoading,
  extractedSkills, experienceSummary, scores, suggestedRoles, missingSkills 
}: AnalysisDialogProps) {
  const hasStructuredData = (extractedSkills && extractedSkills.length > 0) || scores;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>AI Portfolio & CV Analysis</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">Analyzing your portfolio and CV...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Scores Section */}
              {scores && (
                <Card>
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-center gap-2 mb-4">
                      <Target className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-lg">Quality Scores</h3>
                      <Badge variant="default" className="ml-auto text-lg px-3">
                        {scores.overall}/100
                      </Badge>
                    </div>
                    <ScoreBar label="Formatting & Presentation" value={scores.formatting} />
                    <ScoreBar label="Content Depth" value={scores.content} />
                    <ScoreBar label="Market Relevance" value={scores.relevance} />
                    <ScoreBar label="Achievement Impact" value={scores.impact} />
                  </CardContent>
                </Card>
              )}

              {/* Extracted Skills */}
              {extractedSkills && extractedSkills.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-lg">Extracted Skills ({extractedSkills.length})</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {extractedSkills.map((skill, i) => (
                        <Badge 
                          key={i} 
                          variant="outline"
                          className={`${proficiencyColor[skill.proficiency] || ''}`}
                        >
                          {skill.name}
                          <span className="ml-1 text-xs opacity-70">({categoryLabel[skill.category] || skill.category})</span>
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Experience Summary + Suggested Roles */}
              {(experienceSummary || (suggestedRoles && suggestedRoles.length > 0)) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {experienceSummary && (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-3">
                          <GraduationCap className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold">Experience Summary</h3>
                        </div>
                        <div className="space-y-2 text-sm">
                          <p><span className="text-muted-foreground">Experience:</span> <strong>{experienceSummary.totalYears} years</strong></p>
                          <p><span className="text-muted-foreground">Education:</span> <strong>{experienceSummary.educationLevel}</strong></p>
                          {experienceSummary.industries.length > 0 && (
                            <div>
                              <span className="text-muted-foreground">Industries:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {experienceSummary.industries.map((ind, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">{ind}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {experienceSummary.keyAchievements.length > 0 && (
                            <div>
                              <span className="text-muted-foreground">Key Achievements:</span>
                              <ul className="list-disc list-inside mt-1 space-y-0.5">
                                {experienceSummary.keyAchievements.map((a, i) => (
                                  <li key={i} className="text-xs">{a}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {suggestedRoles && suggestedRoles.length > 0 && (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Briefcase className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold">Suggested Roles</h3>
                        </div>
                        <div className="space-y-2">
                          {suggestedRoles.map((role, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">{i + 1}</span>
                              {role}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Missing Skills */}
              {missingSkills && missingSkills.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="h-5 w-5 text-destructive" />
                      <h3 className="font-semibold">Skills to Develop</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {missingSkills.map((skill, i) => (
                        <Badge key={i} variant="outline" className="border-destructive/30 text-destructive">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Full Analysis (Markdown) */}
              {analysis && (
                <div>
                  {hasStructuredData && (
                    <h3 className="font-semibold text-lg mb-3">Detailed Analysis</h3>
                  )}
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {renderMarkdown(analysis)}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
