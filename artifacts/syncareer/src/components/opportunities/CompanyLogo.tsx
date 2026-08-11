import { useState } from 'react';
import type { OpportunityJobFacts } from '@/features/opportunities/opportunity';

function getCompanyInitials(name: string | null | undefined, fallback: string): string {
  const source = (name || fallback || '?').trim();
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || '?';
}

interface CompanyLogoProps {
  job: OpportunityJobFacts & { company_domain?: string | null };
  size?: number;
}

/**
 * Organisation mark: the Clearbit logo when a domain is known, otherwise
 * initials. Identical behavior to the original Opportunities page.
 */
export function CompanyLogo({ job, size = 40 }: CompanyLogoProps) {
  const [errored, setErrored] = useState(false);
  const domain = job.company_domain;
  const showImg = domain && !errored;
  return (
    <div
      className="rounded-md bg-muted flex items-center justify-center font-semibold text-muted-foreground overflow-hidden shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {showImg ? (
        <img
          src={`https://logo.clearbit.com/${domain}`}
          alt={job.company_name || job.department || 'Company'}
          className="w-full h-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <span>{getCompanyInitials(job.company_name, job.department || job.title || '')}</span>
      )}
    </div>
  );
}
