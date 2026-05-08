import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const INDUSTRIES = [
  'Technology',
  'Finance',
  'Healthcare',
  'Education',
  'Manufacturing',
  'Retail',
  'Consulting',
  'Media',
  'Real Estate',
  'Transportation',
  'Energy',
  'Agriculture',
  'Other',
];

const COMPANY_SIZES = [
  '1-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-500 employees',
  '501-1000 employees',
  '1000+ employees',
];

interface EditCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyData: {
    company_name: string;
    company_location: string | null;
    industry: string | null;
    company_size: string | null;
    job_title: string | null;
    company_website: string | null;
    company_email: string | null;
    company_phone: string | null;
    company_description: string | null;
  } | null;
  onSave: () => void;
}

export function EditCompanyDialog({ open, onOpenChange, companyData, onSave }: EditCompanyDialogProps) {
  const [formData, setFormData] = useState({
    company_name: '',
    company_location: '',
    industry: '',
    company_size: '',
    job_title: '',
    company_website: '',
    company_email: '',
    company_phone: '',
    company_description: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (companyData) {
      setFormData({
        company_name: companyData.company_name || '',
        company_location: companyData.company_location || '',
        industry: companyData.industry || '',
        company_size: companyData.company_size || '',
        job_title: companyData.job_title || '',
        company_website: companyData.company_website || '',
        company_email: companyData.company_email || '',
        company_phone: companyData.company_phone || '',
        company_description: companyData.company_description || '',
      });
    }
  }, [companyData]);

  const handleSave = async () => {
    if (!formData.company_name.trim()) {
      toast.error('Company name is required');
      return;
    }

    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error('Please sign in');
        return;
      }

      const { error } = await supabase
        .from('employer_details')
        .update({
          company_name: formData.company_name,
          company_location: formData.company_location || null,
          industry: formData.industry || null,
          company_size: formData.company_size || null,
          job_title: formData.job_title || null,
          company_website: formData.company_website || null,
          company_email: formData.company_email || null,
          company_phone: formData.company_phone || null,
          company_description: formData.company_description || null,
        })
        .eq('user_id', session.user.id);

      if (error) throw error;

      toast.success('Company profile updated!');
      onSave();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating company:', error);
      toast.error(error.message || 'Failed to update company profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Company Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto pr-2">
          <div className="space-y-2">
            <Label>Company Name *</Label>
            <Input
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              placeholder="Enter company name"
            />
          </div>

          <div className="space-y-2">
            <Label>Your Job Title</Label>
            <Input
              value={formData.job_title}
              onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
              placeholder="e.g., HR Manager, CEO"
            />
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              value={formData.company_location}
              onChange={(e) => setFormData({ ...formData, company_location: e.target.value })}
              placeholder="e.g., Lagos, Nigeria"
            />
          </div>

          <div className="space-y-2">
            <Label>Industry</Label>
            <Select
              value={formData.industry}
              onValueChange={(value) => setFormData({ ...formData, industry: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Company Size</Label>
            <Select
              value={formData.company_size}
              onValueChange={(value) => setFormData({ ...formData, company_size: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select company size" />
              </SelectTrigger>
              <SelectContent>
                {COMPANY_SIZES.map((size) => (
                  <SelectItem key={size} value={size}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border-t pt-4 mt-4">
            <p className="text-sm font-medium mb-3">Contact Information</p>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Company Website</Label>
                <Input
                  value={formData.company_website}
                  onChange={(e) => setFormData({ ...formData, company_website: e.target.value })}
                  placeholder="https://www.yourcompany.com"
                  type="url"
                />
              </div>

              <div className="space-y-2">
                <Label>Company Email</Label>
                <Input
                  value={formData.company_email}
                  onChange={(e) => setFormData({ ...formData, company_email: e.target.value })}
                  placeholder="hr@yourcompany.com"
                  type="email"
                />
              </div>

              <div className="space-y-2">
                <Label>Company Phone</Label>
                <Input
                  value={formData.company_phone}
                  onChange={(e) => setFormData({ ...formData, company_phone: e.target.value })}
                  placeholder="+1 234 567 890"
                  type="tel"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Company Description</Label>
            <Textarea
              value={formData.company_description}
              onChange={(e) => setFormData({ ...formData, company_description: e.target.value })}
              placeholder="Tell job seekers about your company's mission, values, and culture..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
