import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface JobFormDescriptionProps {
  description: string;
  requirements: string;
  onChange: (data: { description?: string; requirements?: string }) => void;
}

export function JobFormDescription({ description, requirements, onChange }: JobFormDescriptionProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="description">Job Description *</Label>
        <p className="text-xs text-muted-foreground">
          Describe the role, responsibilities, and what makes this opportunity unique.
        </p>
        <Textarea
          id="description"
          placeholder="We are looking for a talented professional to join our team..."
          rows={8}
          value={description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="requirements">Requirements</Label>
        <p className="text-xs text-muted-foreground">
          List qualifications, experience level, and must-have skills.
        </p>
        <Textarea
          id="requirements"
          placeholder="• 3+ years of experience in...&#10;• Bachelor's degree in...&#10;• Strong communication skills"
          rows={6}
          value={requirements}
          onChange={(e) => onChange({ requirements: e.target.value })}
        />
      </div>
    </div>
  );
}
