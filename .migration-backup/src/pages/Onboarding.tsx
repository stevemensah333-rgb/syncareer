import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getHomeRouteForRole } from '@/components/auth/RoleRoute';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { z } from 'zod';
import { countries } from '@/utils/countries';

// Validation schemas
const studentSchema = z.object({
  school: z.string().max(200, 'School name must be less than 200 characters').optional(),
  major: z.string().min(1, 'Major is required'),
  degreeType: z.string().min(1, 'Degree type is required'),
});

const employerSchema = z.object({
  companyName: z.string().trim().min(1, 'Company name is required').max(200, 'Company name must be less than 200 characters'),
  companyLocation: z.string().max(200, 'Location must be less than 200 characters').optional(),
  jobTitle: z.string().max(100, 'Job title must be less than 100 characters').optional(),
});

const counsellorSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(100, 'Name must be less than 100 characters'),
  countryCode: z.string().min(1, 'Country code is required'),
  phoneNumber: z.string().trim().min(1, 'Phone number is required').max(20, 'Phone number must be less than 20 characters'),
});

const MAJORS = [
  'Computer Science',
  'Business Administration',
  'Law',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Information Technology',
  'Data Science',
  'Finance',
  'Accounting',
  'Marketing',
  'Human Resources',
  'Economics',
  'Psychology',
  'Medicine',
  'Nursing',
  'Pharmacy',
  'Architecture',
  'Graphic Design',
  'Communications',
  'Education',
  'Environmental Science',
  'Agriculture',
  'Other',
];

const DEGREE_TYPES = [
  'Certificate',
  'Diploma',
  'Associate Degree',
  'Bachelor\'s Degree',
  'Honours Degree',
  'Postgraduate Diploma',
  'Master\'s Degree',
  'Doctoral Degree (PhD)',
  'Professional Degree',
];

const INDUSTRIES = [
  'Technology',
  'Finance & Banking',
  'Healthcare',
  'Manufacturing',
  'Retail',
  'Education',
  'Construction',
  'Mining',
  'Agriculture',
  'Telecommunications',
  'Hospitality & Tourism',
  'Legal Services',
  'Consulting',
  'Media & Entertainment',
  'Non-Profit',
  'Government',
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

const JOB_ROLES = [
  'Software Developer',
  'Data Analyst',
  'Project Manager',
  'Business Analyst',
  'Marketing Manager',
  'Sales Representative',
  'Human Resources Manager',
  'Financial Analyst',
  'Operations Manager',
  'Product Manager',
  'UX/UI Designer',
  'Account Manager',
  'Consultant',
  'Teacher/Educator',
  'Healthcare Professional',
  'Engineer',
  'Administrative Assistant',
  'Customer Service Representative',
  'Legal Professional',
  'Research Scientist',
  'Entrepreneur/Business Owner',
  'Other',
];

const YEARS_OF_EXPERIENCE = [
  'Less than 1 year',
  '1-2 years',
  '3-5 years',
  '6-10 years',
  '11-15 years',
  '16-20 years',
  'More than 20 years',
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 20 }, (_, i) => currentYear - 10 + i);

const Onboarding = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // User type from signup (no longer selected here)
  const [userType, setUserType] = useState<string>('');

  // Student fields
  const [yearOfAdmission, setYearOfAdmission] = useState<string>('');
  const [expectedCompletion, setExpectedCompletion] = useState<string>('');
  const [major, setMajor] = useState<string>('');
  const [school, setSchool] = useState<string>('');
  const [degreeType, setDegreeType] = useState<string>('');

  // Reset expected completion if it becomes invalid when year of admission changes
  const handleYearOfAdmissionChange = (year: string) => {
    setYearOfAdmission(year);
    if (expectedCompletion && parseInt(expectedCompletion) < parseInt(year)) {
      setExpectedCompletion('');
    }
  };

  // Employer fields
  const [companyName, setCompanyName] = useState<string>('');
  const [companyLocation, setCompanyLocation] = useState<string>('');
  const [industry, setIndustry] = useState<string>('');
  const [companySize, setCompanySize] = useState<string>('');
  const [jobTitle, setJobTitle] = useState<string>('');

  // Counsellor fields
  const [counsellorFullName, setCounsellorFullName] = useState<string>('');
  const [countryCode, setCountryCode] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');


  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/');
        return;
      }
      setUserId(session.user.id);

      // Pre-fill counsellor name from auth metadata
      const userFullName = session.user.user_metadata?.full_name;
      if (userFullName) {
        setCounsellorFullName(userFullName);
      }

      // Get user type from profile (set during signup)
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed, user_type')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profile?.onboarding_completed) {
        const homeRoute = getHomeRouteForRole(profile.user_type);
        navigate(homeRoute);
        return;
      }

      // Use user_type from profile or from auth metadata
      const type = profile?.user_type || session.user.user_metadata?.user_type || '';
      setUserType(type);
      setInitialLoading(false);
    };

    checkSession();
  }, [navigate]);


  const handleSubmit = async () => {
    if (!userId) return;

    // Validate with zod schemas
    if (userType === 'student') {
      const result = studentSchema.safeParse({ school, major, degreeType });
      if (!result.success) {
        toast.error(result.error.errors[0].message);
        return;
      }
    } else if (userType === 'employer') {
      const result = employerSchema.safeParse({ 
        companyName: companyName.trim(), 
        companyLocation: companyLocation || undefined, 
        jobTitle: jobTitle || undefined 
      });
      if (!result.success) {
        toast.error(result.error.errors[0].message);
        return;
      }
    } else if (userType === 'career_counsellor') {
      const result = counsellorSchema.safeParse({
        fullName: counsellorFullName.trim(),
        countryCode,
        phoneNumber: phoneNumber.trim(),
      });
      if (!result.success) {
        toast.error(result.error.errors[0].message);
        return;
      }
    }

    setLoading(true);

    try {
      // Update profile with user type
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: userId,
            user_type: userType,
            onboarding_completed: true,
          },
          { onConflict: 'id' }
        );

      if (profileError) throw profileError;

      // Insert role-specific details
      if (userType === 'student') {
        const { error: studentError } = await supabase
          .from('student_details')
          .upsert({
            user_id: userId,
            year_of_admission: yearOfAdmission ? parseInt(yearOfAdmission) : null,
            expected_completion: expectedCompletion ? parseInt(expectedCompletion) : null,
            major,
            school: school || null,
            degree_type: degreeType,
          }, { onConflict: 'user_id' });

        if (studentError) throw studentError;
      } else if (userType === 'employer') {
        const { error: employerError } = await supabase
          .from('employer_details')
          .upsert({
            user_id: userId,
            company_name: companyName,
            company_location: companyLocation || null,
            industry: industry || null,
            company_size: companySize || null,
            job_title: jobTitle || null,
          }, { onConflict: 'user_id' });

        if (employerError) throw employerError;
      } else if (userType === 'career_counsellor') {
        const { error: counsellorError } = await supabase
          .from('counsellor_details')
          .upsert({
            user_id: userId,
            full_name: counsellorFullName.trim(),
            country_code: countryCode,
            phone_number: phoneNumber.trim(),
          }, { onConflict: 'user_id' });

        if (counsellorError) throw counsellorError;
      }

      toast.success('Profile setup complete!');
      const homeRoute = getHomeRouteForRole(userType);
      navigate(homeRoute);
    } catch (error: any) {
      console.error('Onboarding error:', error);
      toast.error(error.message || 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl p-8 shadow-xl">
          <div className="text-center text-muted-foreground">Loading...</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8 shadow-xl">

        {userType === 'student' && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-foreground">Academic Details</h1>
              <p className="text-muted-foreground mt-2">Help us tailor content to your field of study</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <div className="space-y-2">
                <Label>Major / Field of Study *</Label>
                <Select value={major} onValueChange={setMajor}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select your major" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    {MAJORS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Degree Type *</Label>
                <Select value={degreeType} onValueChange={setDegreeType}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select degree type" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    {DEGREE_TYPES.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>School / University</Label>
                <Input
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="Enter your school name"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label>Year of Admission</Label>
                <Select value={yearOfAdmission} onValueChange={handleYearOfAdmissionChange}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    {years.map((y) => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Expected Completion</Label>
                <Select value={expectedCompletion} onValueChange={setExpectedCompletion}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    {years
                      .filter((y) => !yearOfAdmission || y >= parseInt(yearOfAdmission))
                      .map((y) => (
                        <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <Button onClick={handleSubmit} disabled={loading || !major || !degreeType} className="px-8">
                {loading ? 'Saving...' : 'Complete Setup'}
              </Button>
            </div>
          </div>
        )}

        {userType === 'employer' && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-foreground">Company Details</h1>
              <p className="text-muted-foreground mt-2">Tell us about your organization</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <div className="space-y-2">
                <Label>Company Name *</Label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter company name"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label>Your Job Title</Label>
                <Input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g., HR Manager"
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label>Industry</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    {INDUSTRIES.map((i) => (
                      <SelectItem key={i} value={i}>{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Company Size</Label>
                <Select value={companySize} onValueChange={setCompanySize}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    {COMPANY_SIZES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Company Location</Label>
                <Input
                  value={companyLocation}
                  onChange={(e) => setCompanyLocation(e.target.value)}
                  placeholder="e.g., Johannesburg, South Africa"
                  className="h-12"
                />
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <Button onClick={handleSubmit} disabled={loading || !companyName} className="px-8">
                {loading ? 'Saving...' : 'Complete Setup'}
              </Button>
            </div>
          </div>
        )}

        {userType === 'career_counsellor' && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-foreground">Counsellor Details</h1>
              <p className="text-muted-foreground mt-2">Set up your counsellor profile</p>
            </div>

            <div className="grid grid-cols-1 gap-6 mt-8">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={counsellorFullName}
                  onChange={(e) => setCounsellorFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="h-12"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Country Code *</Label>
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      <ScrollArea className="h-[200px]">
                        {countries.map((country) => (
                          <SelectItem key={country.code} value={`+${country.code}`}>
                            {country.name} (+{country.code})
                          </SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Phone Number *</Label>
                  <Input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter phone number"
                    className="h-12"
                    type="tel"
                  />
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Your phone number will be visible to clients who book sessions with you.
                You can update your bio, specialization, and hiring price after completing setup.
              </p>
            </div>

            <div className="flex justify-end mt-8">
              <Button onClick={handleSubmit} disabled={loading || !counsellorFullName || !countryCode || !phoneNumber} className="px-8">
                {loading ? 'Saving...' : 'Complete Setup'}
              </Button>
            </div>
          </div>
        )}

        {!userType && !initialLoading && (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-foreground">Welcome to Syncareer</h1>
              <p className="text-muted-foreground mt-2">Select your account type to get started</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              {[
                { value: 'student', label: 'Student', description: 'Discover careers, build your CV, and prepare for interviews' },
                { value: 'employer', label: 'Employer', description: 'Post jobs, find talent, and manage hiring' },
                { value: 'career_counsellor', label: 'Career Counsellor', description: 'Guide students and manage counselling sessions' },
              ].map((role) => (
                <button
                  key={role.value}
                  onClick={() => setUserType(role.value)}
                  className="p-6 rounded-lg border-2 border-border hover:border-primary text-left transition-colors space-y-2"
                >
                  <h3 className="font-semibold text-lg text-foreground">{role.label}</h3>
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

      </Card>
    </div>
  );
};

export default Onboarding;
