import { describe, expect, it } from 'vitest';
import { filterMentors } from './filtering';
import type { MentorProfile } from './types';

const mentor = (overrides: Partial<MentorProfile> = {}): MentorProfile => ({
  mentor_id: 'mentor-1', full_name: 'Ama Mensah', avatar_url: null, bio: 'Product leadership and hiring',
  current_role: 'Product Manager', expertise_tags: ['Fintech', 'CV review'], years_experience: 5,
  availability_status: 'accepting', company_name: 'Acme', email_domain: 'acme.com', verified_at: '2026-08-31T00:00:00Z',
  ...overrides,
});

describe('filterMentors', () => {
  it('searches name, role, company, bio and expertise without case sensitivity', () => {
    expect(filterMentors([mentor()], { search: 'fintech', experience: 'all', availability: 'all', skill: 'all', role: 'all' })).toHaveLength(1);
    expect(filterMentors([mentor()], { search: 'engineer', experience: 'all', availability: 'all', skill: 'all', role: 'all' })).toHaveLength(0);
  });

  it('combines exact skill, capacity and experience filters', () => {
    const mentors = [mentor(), mentor({ mentor_id: 'mentor-2', years_experience: 11, availability_status: 'limited', expertise_tags: ['Engineering'] })];
    expect(filterMentors(mentors, { search: '', experience: '10+', availability: 'limited', skill: 'Engineering', role: 'Product Manager' }).map((item) => item.mentor_id)).toEqual(['mentor-2']);
  });
});
