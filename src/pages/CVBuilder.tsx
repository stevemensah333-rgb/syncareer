import React, { useState, useRef, useEffect } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Download, Eye, Sparkles, Save, FileText, MessageCircle } from 'lucide-react';
import { WhatsAppShareButton } from '@/components/shared/WhatsAppShareButton';
import { toast } from 'sonner';
import { CVFormPersonal } from '@/components/cv-builder/CVFormPersonal';
import { CVFormEducation } from '@/components/cv-builder/CVFormEducation';
import { CVFormExperience } from '@/components/cv-builder/CVFormExperience';
import { CVFormProjects } from '@/components/cv-builder/CVFormProjects';
import { CVFormActivities } from '@/components/cv-builder/CVFormActivities';
import { CVFormSkills } from '@/components/cv-builder/CVFormSkills';
import { CVPreview } from '@/components/cv-builder/CVPreview';
import { CVAIAssistant } from '@/components/cv-builder/CVAIAssistant';
import { CVStrengthScore } from '@/components/cv-builder/CVStrengthScore';
import { useCVStrengthScore } from '@/hooks/useCVStrengthScore';
import { useFeedbackModal } from '@/hooks/useFeedbackModal';
import { FeedbackModal } from '@/components/feedback/FeedbackModal';
import { supabase } from '@/integrations/supabase/client';
import html2pdf from 'html2pdf.js';

export interface CVData {
  personal: {
    firstName: string;
    lastName: string;
    phone: string;
    nationality: string;
    email: string;
    schoolEmail: string;
    linkedIn: string;
  };
  education: {
    university: string;
    location: string;
    degree: string;
    graduationDate: string;
    gpa: string;
  };
  achievements: Array<{
    id: string;
    title: string;
    organization: string;
    date: string;
  }>;
  experience: Array<{
    id: string;
    company: string;
    location: string;
    date: string;
    role: string;
    bullets: string[];
  }>;
  projects: Array<{
    id: string;
    organization: string;
    date: string;
    projectName: string;
    role: string;
    bullets: string[];
  }>;
  activities: Array<{
    id: string;
    organization: string;
    activity: string;
    date: string;
    role: string;
    bullets: string[];
  }>;
  skills: string[];
  references: string;
}

const initialCVData: CVData = {
  personal: {
    firstName: '',
    lastName: '',
    phone: '',
    nationality: '',
    email: '',
    schoolEmail: '',
    linkedIn: '',
  },
  education: {
    university: '',
    location: '',
    degree: '',
    graduationDate: '',
    gpa: '',
  },
  achievements: [],
  experience: [],
  projects: [],
  activities: [],
  skills: [],
  references: 'Available upon request',
};

const CVBuilder = () => {
  const [cvData, setCVData] = useState<CVData>(initialCVData);
  const [activeTab, setActiveTab] = useState('personal');
  const [showPreview, setShowPreview] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const strengthResult = useCVStrengthScore(cvData);
  const feedbackModal = useFeedbackModal('cv_builder');

  const updatePersonal = (data: Partial<CVData['personal']>) => {
    setCVData(prev => ({ ...prev, personal: { ...prev.personal, ...data } }));
  };

  const updateEducation = (data: Partial<CVData['education']>) => {
    setCVData(prev => ({ ...prev, education: { ...prev.education, ...data } }));
  };

  const updateAchievements = (achievements: CVData['achievements']) => {
    setCVData(prev => ({ ...prev, achievements }));
  };

  const updateExperience = (experience: CVData['experience']) => {
    setCVData(prev => ({ ...prev, experience }));
  };

  const updateProjects = (projects: CVData['projects']) => {
    setCVData(prev => ({ ...prev, projects }));
  };

  const updateActivities = (activities: CVData['activities']) => {
    setCVData(prev => ({ ...prev, activities }));
  };

  const updateSkills = (skills: string[]) => {
    setCVData(prev => ({ ...prev, skills }));
  };

  const handleDownloadPDF = async () => {
    if (!previewRef.current) {
      toast.error('Please preview your CV first');
      setShowPreview(true);
      return;
    }

    setIsGeneratingPDF(true);
    try {
      const element = previewRef.current;
      const opt = {
        margin: 0,
        filename: `${cvData.personal.firstName}_${cvData.personal.lastName}_CV.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
      toast.success('CV downloaded! Share your achievement.', {
        action: {
          label: 'Share on WhatsApp',
          onClick: () => {
            const msg = encodeURIComponent(`I just built my professional CV with Syncareer! Try it free: ${window.location.origin}`);
            window.open(`https://wa.me/?text=${msg}`, '_blank');
          },
        },
      });
      feedbackModal.triggerFeedback();
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSaveCV = async () => {
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to save your CV');
        return;
      }
      const userId = session.user.id;

      const { error } = await supabase
        .from('resumes')
        .upsert({
          user_id: userId,
          title: `${cvData.personal.firstName} ${cvData.personal.lastName} CV`,
          template: 'basic',
          personal_info: cvData.personal,
          education: [cvData.education],
          experience: cvData.experience,
          projects: cvData.projects,
          achievements: cvData.achievements,
          skills: cvData.skills,
          is_primary: true,
        }, {
          onConflict: 'user_id,is_primary'
        });

      if (error) throw error;

      // ── Write skills to user_skills so SynAI can see them ─────────
      if (cvData.skills.length > 0) {
        const skillRows = cvData.skills.map(skill => ({
          user_id: userId,
          skill_name: skill.trim(),
          category: 'general',
          proficiency: 'intermediate',
          source: 'cv',
        }));
        // Upsert to avoid duplicates
        await supabase
          .from('user_skills')
          .upsert(skillRows, { onConflict: 'user_id,skill_name' });
      }

      // ── Trigger intelligence recompute (fire-and-forget) ──────────
      supabase.functions.invoke('compute-user-intelligence').catch(e =>
        console.warn('[CVBuilder] Intelligence recompute failed:', e)
      );

      // Check for matching jobs
      const { data: matchingJobs } = await supabase
        .from('job_postings')
        .select('id')
        .eq('status', 'active');
      
      const jobCount = matchingJobs?.length || 0;
      if (jobCount > 0) {
        toast.success(`CV saved! Your profile matches ${jobCount} open position${jobCount > 1 ? 's' : ''}.`, {
          action: {
            label: 'View Jobs',
            onClick: () => window.location.href = '/markets',
          },
        });
      } else {
        toast.success('CV saved successfully!');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save CV');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAISuggestion = (section: string, content: string) => {
    // Apply AI suggestions to the relevant section
    if (section === 'skills') {
      const newSkills = content.split(',').map(s => s.trim()).filter(Boolean);
      updateSkills([...cvData.skills, ...newSkills]);
    }
    toast.success('AI suggestion applied!');
  };

  return (
    <PageLayout title="CV Builder">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold">Build Your CV</h2>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {showPreview ? 'Hide Preview' : 'Preview'}
              </Button>
              <Button
                variant="outline"
                onClick={handleSaveCV}
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
              >
                <Download className="h-4 w-4 mr-2" />
                {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="education">Education</TabsTrigger>
              <TabsTrigger value="experience">Experience</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="activities">Activities</TabsTrigger>
              <TabsTrigger value="skills">Skills</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="mt-4">
              <CVFormPersonal
                data={cvData.personal}
                onChange={updatePersonal}
              />
            </TabsContent>

            <TabsContent value="education" className="mt-4">
              <CVFormEducation
                education={cvData.education}
                achievements={cvData.achievements}
                onEducationChange={updateEducation}
                onAchievementsChange={updateAchievements}
              />
            </TabsContent>

            <TabsContent value="experience" className="mt-4">
              <CVFormExperience
                experience={cvData.experience}
                onChange={updateExperience}
              />
            </TabsContent>

            <TabsContent value="projects" className="mt-4">
              <CVFormProjects
                projects={cvData.projects}
                onChange={updateProjects}
              />
            </TabsContent>

            <TabsContent value="activities" className="mt-4">
              <CVFormActivities
                activities={cvData.activities}
                onChange={updateActivities}
              />
            </TabsContent>

            <TabsContent value="skills" className="mt-4">
              <CVFormSkills
                skills={cvData.skills}
                onChange={updateSkills}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar: Score + AI Assistant */}
        <div className="space-y-6">
          <CVStrengthScore result={strengthResult} />
          <CVAIAssistant
            cvData={cvData}
            activeSection={activeTab}
            onSuggestion={handleAISuggestion}
          />
        </div>
      </div>

      {/* CV Preview Modal/Section */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-auto">
          <div className="bg-white max-w-4xl w-full max-h-[90vh] overflow-auto rounded-lg shadow-xl">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
              <h3 className="font-semibold">CV Preview</h3>
              <div className="flex gap-2">
                <Button onClick={handleDownloadPDF} disabled={isGeneratingPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Close
                </Button>
              </div>
            </div>
            <div className="p-4">
              <CVPreview ref={previewRef} data={cvData} />
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackModal.isOpen}
        onSubmit={feedbackModal.submitFeedback}
        onDismiss={feedbackModal.dismiss}
      />
    </PageLayout>
  );
};

export default CVBuilder;
