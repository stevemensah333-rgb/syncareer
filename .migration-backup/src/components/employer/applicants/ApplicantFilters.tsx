import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { PIPELINE_STAGES } from './types';

interface ApplicantFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedJob: string;
  onJobChange: (job: string) => void;
  uniqueJobs: string[];
  stageCounts: Record<string, number>;
}

export function ApplicantFilters({
  searchQuery, onSearchChange,
  selectedJob, onJobChange,
  uniqueJobs, stageCounts,
}: ApplicantFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Stage counts */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {PIPELINE_STAGES.map((stage) => (
          <Card key={stage.id} className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{stage.label}</span>
              <Badge variant="secondary" className="text-xs">{stageCounts[stage.id] || 0}</Badge>
            </div>
          </Card>
        ))}
      </div>

      {/* Search & filter */}
      <Card className="p-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedJob} onValueChange={onJobChange}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by job" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Jobs</SelectItem>
              {uniqueJobs.map((job) => (
                <SelectItem key={job} value={job}>{job}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>
    </div>
  );
}
