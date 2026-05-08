import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function ChatInput({ value, onChange, onSend, isLoading, disabled = false }: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="flex gap-2 mt-4">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? "Upgrade to Premium to continue chatting" : "Ask about careers, skills, CVs, interviews..."}
        disabled={isLoading || disabled}
        className="flex-1"
      />
      <Button onClick={onSend} disabled={isLoading || disabled || !value.trim()}>
        <Send className="w-4 h-4" />
      </Button>
    </div>
  );
}
