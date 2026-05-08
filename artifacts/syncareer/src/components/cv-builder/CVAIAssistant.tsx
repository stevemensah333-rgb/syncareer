import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Send, Loader2, Lightbulb, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { CVData } from '@/pages/CVBuilder';

interface CVAIAssistantProps {
  cvData: CVData;
  activeSection: string;
  onSuggestion: (section: string, content: string) => void;
}

export const CVAIAssistant: React.FC<CVAIAssistantProps> = ({
  cvData,
  activeSection,
  onSuggestion,
}) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const sectionTips: Record<string, string[]> = {
    personal: [
      'Use a professional email address',
      'Include country code in phone number',
      'LinkedIn URL should be customized',
    ],
    education: [
      'List your most recent education first',
      'Include relevant coursework if applicable',
      'GPA above 3.0 is worth mentioning',
    ],
    experience: [
      'Start bullet points with action verbs',
      'Quantify achievements with numbers',
      'Focus on impact, not just duties',
    ],
    projects: [
      'Highlight technical skills used',
      'Mention team size and your role',
      'Include measurable outcomes',
    ],
    activities: [
      'Show leadership and initiative',
      'Connect activities to career goals',
      'Demonstrate soft skills',
    ],
    skills: [
      'List both technical and soft skills',
      'Be specific about proficiency levels',
      'Include relevant certifications',
    ],
  };

  const quickPrompts = [
    { label: 'Improve bullet points', prompt: 'Help me write stronger bullet points for my experience section' },
    { label: 'Suggest skills', prompt: 'Suggest relevant skills based on my background' },
    { label: 'Professional summary', prompt: 'Help me write a compelling professional summary' },
    { label: 'Action verbs', prompt: 'Give me powerful action verbs for my CV' },
  ];

  const handleAIRequest = async (customPrompt?: string) => {
    const finalPrompt = customPrompt || prompt;
    if (!finalPrompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cv-ai-assistant', {
        body: {
          prompt: finalPrompt,
          cvData,
          section: activeSection,
        },
      });

      if (error) throw error;

      if (data.suggestions) {
        setSuggestions(data.suggestions);
      }
      
      toast.success('AI suggestions generated!');
    } catch (error) {
      console.error('AI request error:', error);
      toast.error('Failed to get AI suggestions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentTips = sectionTips[activeSection] || sectionTips.personal;

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Writing Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Ask AI for help with your CV (e.g., 'Help me write better bullet points for my internship')"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[80px]"
          />
          <Button
            onClick={() => handleAIRequest()}
            disabled={isLoading || !prompt.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Get AI Help
              </>
            )}
          </Button>

          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((qp) => (
              <Button
                key={qp.label}
                variant="outline"
                size="sm"
                onClick={() => {
                  setPrompt(qp.prompt);
                  handleAIRequest(qp.prompt);
                }}
                disabled={isLoading}
                className="text-xs"
              >
                <Wand2 className="h-3 w-3 mr-1" />
                {qp.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {suggestions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">AI Suggestions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="p-3 bg-muted rounded-md text-sm cursor-pointer hover:bg-muted/80 transition-colors"
                onClick={() => onSuggestion(activeSection, suggestion)}
              >
                {suggestion}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5 text-accent" />
            Tips for {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {currentTips.map((tip, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-primary">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
