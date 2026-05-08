import { Badge } from '@/components/ui/badge';
import { MapPin, Briefcase, DollarSign, Building2 } from 'lucide-react';

interface JobFormData {
  title: string;
  department: string;
  location: string;
  employmentType: string;
  salaryMin: string;
  salaryMax: string;
  salaryCurrency: string;
  description: string;
  requirements: string;
}

const currencySymbols: Record<string, string> = {
  USD: '$', GHS: '₵', NGN: '₦', GBP: '£', EUR: '€',
};

interface JobFormReviewProps {
  formData: JobFormData;
  skills: string[];
}

export function JobFormReview({ formData, skills }: JobFormReviewProps) {
  const symbol = currencySymbols[formData.salaryCurrency] || '$';

  return (
    <div className="space-y-5">
      <div className="p-4 rounded-lg border bg-muted/30">
        <h3 className="text-lg font-semibold">{formData.title || 'Untitled Position'}</h3>

        <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
          {formData.department && (
            <span className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              {formData.department}
            </span>
          )}
          {formData.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {formData.location}
            </span>
          )}
          {formData.employmentType && (
            <span className="flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5" />
              <span className="capitalize">{formData.employmentType}</span>
            </span>
          )}
          {(formData.salaryMin || formData.salaryMax) && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              {formData.salaryMin && formData.salaryMax
                ? `${symbol}${Number(formData.salaryMin).toLocaleString()} – ${symbol}${Number(formData.salaryMax).toLocaleString()}`
                : formData.salaryMin
                  ? `${symbol}${Number(formData.salaryMin).toLocaleString()}+`
                  : `Up to ${symbol}${Number(formData.salaryMax).toLocaleString()}`
              }
            </span>
          )}
        </div>
      </div>

      {formData.description && (
        <div className="space-y-1.5">
          <h4 className="text-sm font-medium">Description</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{formData.description}</p>
        </div>
      )}

      {formData.requirements && (
        <div className="space-y-1.5">
          <h4 className="text-sm font-medium">Requirements</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{formData.requirements}</p>
        </div>
      )}

      {skills.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-sm font-medium">Skills</h4>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
            ))}
          </div>
        </div>
      )}

      {!formData.title && !formData.description && (
        <p className="text-center text-sm text-muted-foreground py-4">
          Fill in the previous steps to see a preview of your job posting.
        </p>
      )}
    </div>
  );
}
