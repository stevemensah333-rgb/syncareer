import { describe, expect, it } from 'vitest';
import { getPageTitle } from './pageTitle';

describe('getPageTitle', () => {
  it('assigns distinct meaningful titles to core application routes', () => {
    const titles = [
      getPageTitle('/dashboard'),
      getPageTitle('/opportunities'),
      getPageTitle('/applications'),
      getPageTitle('/cv-builder'),
      getPageTitle('/interview-simulator'),
    ];

    expect(new Set(titles).size).toBe(titles.length);
    expect(titles).toEqual([
      'Application Desk | Syncareer',
      'Opportunities | Syncareer',
      'Applications | Syncareer',
      'CV builder | Syncareer',
      'Interview simulator | Syncareer',
    ]);
  });

  it('covers dynamic, authentication, and unknown routes without falling back to a stale title', () => {
    expect(getPageTitle('/blog/evidence-based-cv')).toBe('Page not found | Syncareer');
    expect(getPageTitle('/sign-in/forgot-password')).toBe('Reset password | Syncareer');
    expect(getPageTitle('/applications/application-id')).toBe('Application dossier | Syncareer');
    expect(getPageTitle('/mentors/mentor-id')).toBe('Mentor profile | Syncareer');
    expect(getPageTitle('/missing-route')).toBe('Page not found | Syncareer');
  });
});
