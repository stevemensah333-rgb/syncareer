import { FileSearch, Users, Target, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HireQuickActionsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

const actions = [
  { icon: FileSearch, label: "Write job description", prompt: "Help me write a compelling job description for a role I'm hiring for." },
  { icon: Users, label: "Find candidates", prompt: "Recommend candidates from the talent pool that match my open positions." },
  { icon: Target, label: "Interview questions", prompt: "Suggest structured interview questions for evaluating candidates." },
  { icon: BarChart3, label: "Market insights", prompt: "What are the current salary benchmarks and talent availability trends in my industry?" },
];

export function HireQuickActions({ onSelect, disabled }: HireQuickActionsProps) {
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
