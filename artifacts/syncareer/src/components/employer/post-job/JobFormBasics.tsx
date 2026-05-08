import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

interface JobFormBasicsProps {
  formData: JobFormData;
  onChange: (data: Partial<JobFormData>) => void;
}

export function JobFormBasics({ formData, onChange }: JobFormBasicsProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title">Job Title *</Label>
        <Input
          id="title"
          placeholder="e.g. Senior Software Engineer"
          value={formData.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="department">Department</Label>
          <Input
            id="department"
            placeholder="e.g. Engineering"
            value={formData.department}
            onChange={(e) => onChange({ department: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Location *</Label>
          <Input
            id="location"
            placeholder="e.g. Lagos, Nigeria or Remote"
            value={formData.location}
            onChange={(e) => onChange({ location: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Employment Type *</Label>
          <Select
            value={formData.employmentType}
            onValueChange={(value) => onChange({ employmentType: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full-time">Full-time</SelectItem>
              <SelectItem value="part-time">Part-time</SelectItem>
              <SelectItem value="internship">Internship</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="remote">Remote</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Salary Currency</Label>
          <Select
            value={formData.salaryCurrency}
            onValueChange={(value) => onChange({ salaryCurrency: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="GHS">GHS (₵)</SelectItem>
              <SelectItem value="NGN">NGN (₦)</SelectItem>
              <SelectItem value="GBP">GBP (£)</SelectItem>
              <SelectItem value="EUR">EUR (€)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="salary-min">Salary Min</Label>
          <Input
            id="salary-min"
            placeholder="e.g. 50000"
            type="number"
            value={formData.salaryMin}
            onChange={(e) => onChange({ salaryMin: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="salary-max">Salary Max</Label>
          <Input
            id="salary-max"
            placeholder="e.g. 80000"
            type="number"
            value={formData.salaryMax}
            onChange={(e) => onChange({ salaryMax: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
