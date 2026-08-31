import type { MentorProfile } from './types';

export interface MentorFilters {
  search: string;
  experience: string;
  availability: string;
  skill: string;
  role?: string;
}

export function filterMentors(mentors: MentorProfile[], filters: MentorFilters): MentorProfile[] {
  return mentors.filter((mentor) => {
    const q = filters.search.trim().toLowerCase();
    if (q && !`${mentor.full_name} ${mentor.current_role ?? ''} ${mentor.company_name} ${mentor.bio ?? ''} ${mentor.expertise_tags.join(' ')}`.toLowerCase().includes(q)) return false;
    if (filters.availability !== 'all' && mentor.availability_status !== filters.availability) return false;
    if (filters.skill !== 'all' && !mentor.expertise_tags.includes(filters.skill)) return false;
    if (filters.role && filters.role !== 'all' && mentor.current_role !== filters.role) return false;
    if (filters.experience === '0-2' && mentor.years_experience > 2) return false;
    if (filters.experience === '3-5' && (mentor.years_experience < 3 || mentor.years_experience > 5)) return false;
    if (filters.experience === '6-10' && (mentor.years_experience < 6 || mentor.years_experience > 10)) return false;
    if (filters.experience === '10+' && mentor.years_experience < 10) return false;
    return true;
  });
}
