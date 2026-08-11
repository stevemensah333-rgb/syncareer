import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  minLength?: number;
  description?: string;
}

export default function PasswordField({ id, label, value, onChange, autoComplete, minLength, description }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const descriptionId = description ? `${id}-description` : undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          name={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={descriptionId}
          className="h-11 pr-12"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1 h-9 w-9"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
        >
          {visible ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
        </Button>
      </div>
      {description ? <p id={descriptionId} className="text-xs text-muted-foreground">{description}</p> : null}
    </div>
  );
}
