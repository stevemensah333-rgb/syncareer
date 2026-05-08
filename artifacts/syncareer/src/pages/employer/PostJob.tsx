import { useState, useEffect, useCallback } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import { JobFormBasics } from '@/components/employer/post-job/JobFormBasics';
import { JobFormDescription } from '@/components/employer/post-job/JobFormDescription';
import { JobFormSkills } from '@/components/employer/post-job/JobFormSkills';
import { JobFormReview } from '@/components/employer/post-job/JobFormReview';
import { ManageJobsList } from '@/components/employer/post-job/ManageJobsList';

interface JobPosting {
  id: string;
  title: string;
  department: string | null;
  location: string;
  employment_type: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  description: string;
  requirements: string | null;
  skills: string[] | null;
  status: string;
  created_at: string;
}

const STEPS = [
  { label: 'Basics', description: 'Title, location & pay' },
  { label: 'Description', description: 'Role details' },
  { label: 'Skills', description: 'Required skills' },
  { label: 'Review', description: 'Preview & post' },
];

const initialFormData = {
  title: '',
  department: '',
  location: '',
  employmentType: '',
  salaryMin: '',
  salaryMax: '',
  salaryCurrency: 'USD',
  description: '',
  requirements: '',
};

const PostJob = () => {
  const [step, setStep] = useState(0);
  const [skills, setSkills] = useState<string[]>([]);
  const [postedJobs, setPostedJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(initialFormData);

  const fetchJobs = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('job_postings')
        .select('*')
        .eq('employer_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPostedJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const updateFormData = (partial: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...partial }));
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setSkills([]);
    setStep(0);
  };

  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!formData.title.trim()) return 'Job title is required';
      if (!formData.location.trim()) return 'Location is required';
      if (!formData.employmentType) return 'Employment type is required';
    }
    if (s === 1) {
      if (!formData.description.trim()) return 'Job description is required';
    }
    return null;
  };

  const goNext = () => {
    const error = validateStep(step);
    if (error) {
      toast.error(error);
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const handlePostJob = async () => {
    // Validate all steps
    for (let i = 0; i < STEPS.length - 1; i++) {
      const error = validateStep(i);
      if (error) {
        toast.error(error);
        setStep(i);
        return;
      }
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to post a job');
        return;
      }

      const { error } = await supabase.from('job_postings').insert({
        employer_id: session.user.id,
        title: formData.title,
        department: formData.department || null,
        location: formData.location,
        employment_type: formData.employmentType,
        salary_min: formData.salaryMin ? parseInt(formData.salaryMin) : null,
        salary_max: formData.salaryMax ? parseInt(formData.salaryMax) : null,
        salary_currency: formData.salaryCurrency || null,
        description: formData.description,
        requirements: formData.requirements || null,
        skills: skills.length > 0 ? skills : null,
        status: 'active',
      });

      if (error) throw error;

      toast.success('Job posted successfully!');
      resetForm();
      fetchJobs();
    } catch (error) {
      console.error('Error posting job:', error);
      toast.error('Failed to post job');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      const { error } = await supabase.from('job_postings').delete().eq('id', jobId);
      if (error) throw error;
      toast.success('Job deleted');
      fetchJobs();
    } catch (error) {
      console.error('Error deleting job:', error);
      toast.error('Failed to delete job');
    }
  };

  const handleToggleStatus = async (jobId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'closed' : 'active';
    try {
      const { error } = await supabase.from('job_postings').update({ status: newStatus }).eq('id', jobId);
      if (error) throw error;
      toast.success(`Job ${newStatus === 'active' ? 'activated' : 'closed'}`);
      fetchJobs();
    } catch (error) {
      console.error('Error updating job:', error);
      toast.error('Failed to update job');
    }
  };

  return (
    <PageLayout title="Post a Job">
      <Tabs defaultValue="create" className="space-y-6">
        <TabsList>
          <TabsTrigger value="create">Create New</TabsTrigger>
          <TabsTrigger value="manage">Manage ({postedJobs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="create">
          <Card>
            {/* Step Indicator */}
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                {STEPS.map((s, i) => (
                  <div key={s.label} className="flex items-center gap-2 flex-1">
                    <button
                      onClick={() => {
                        // Only allow going to completed or current steps
                        if (i <= step) setStep(i);
                      }}
                      className={cn(
                        "flex items-center gap-2 text-left transition-colors",
                        i <= step ? "cursor-pointer" : "cursor-default"
                      )}
                    >
                      <div
                        className={cn(
                          "h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 transition-colors",
                          i < step
                            ? "bg-primary text-primary-foreground"
                            : i === step
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                        )}
                      >
                        {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                      </div>
                      <div className="hidden sm:block min-w-0">
                        <p className={cn("text-xs font-medium leading-none", i <= step ? "text-foreground" : "text-muted-foreground")}>
                          {s.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{s.description}</p>
                      </div>
                    </button>
                    {i < STEPS.length - 1 && (
                      <div className={cn("flex-1 h-px", i < step ? "bg-primary" : "bg-border")} />
                    )}
                  </div>
                ))}
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="min-h-[320px]">
                {step === 0 && <JobFormBasics formData={formData} onChange={updateFormData} />}
                {step === 1 && (
                  <JobFormDescription
                    description={formData.description}
                    requirements={formData.requirements}
                    onChange={updateFormData}
                  />
                )}
                {step === 2 && <JobFormSkills skills={skills} onSkillsChange={setSkills} />}
                {step === 3 && <JobFormReview formData={formData} skills={skills} />}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-6 border-t mt-6">
                <Button
                  variant="outline"
                  onClick={goBack}
                  disabled={step === 0}
                  className={cn("rounded-full px-5", step === 0 && "invisible")}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>

                <div className="flex gap-2">
                  {step < STEPS.length - 1 ? (
                    <Button onClick={goNext} className="rounded-full px-6">
                      Next
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  ) : (
                    <Button onClick={handlePostJob} disabled={submitting} className="rounded-full px-6">
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Posting...
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4 mr-2" />
                          Post Job
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage">
          <ManageJobsList
            jobs={postedJobs}
            loading={loading}
            onToggleStatus={handleToggleStatus}
            onDelete={handleDeleteJob}
          />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
};

export default PostJob;
