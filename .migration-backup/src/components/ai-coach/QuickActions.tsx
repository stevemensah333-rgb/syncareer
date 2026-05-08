import { Compass, FileText, Mic, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

const actions = [
  { icon: Compass, label: "Career guidance", prompt: "Based on my profile, what career paths should I explore?" },
  { icon: FileText, label: "CV tips", prompt: "Review my CV and suggest improvements for ATS compatibility." },
  { icon: Mic, label: "Interview prep", prompt: "Help me prepare for a common behavioural interview question." },
  { icon: TrendingUp, label: "Skill gaps", prompt: "What skills should I develop next to be more competitive?" },
];

export function QuickActions({ onSelect, disabled }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map((action) => (
        <Button
          key={action.label}
          variant="outline"
          size="sm"
          className="justify-start gap-2 h-auto py-2 text-xs"
          onClick={() => onSelect(action.prompt)}
          disabled={disabled}
        >
          <action.icon className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="truncate">{action.label}</span>
        </Button>
      ))}
    </div>
  );
}
