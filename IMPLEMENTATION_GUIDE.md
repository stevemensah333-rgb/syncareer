# Syncareer Website Improvements - Implementation Guide

## Overview
This guide walks through all 8 phases of website improvements, with code files and integration points.

---

## Phase 1: Foundation - Analytics & Feature Tour System ✅

### Files Created:
- `src/services/analytics.ts` - PostHog analytics service with event tracking
- `src/services/sentry.ts` - Sentry error tracking initialization
- `src/contexts/TourContext.tsx` - Tour guide state management
- `src/components/common/TourOverlay.tsx` - Visual tour overlay
- `src/components/common/HelpTooltip.tsx` - Contextual help tooltips

### Environment Variables Required:
```
VITE_SENTRY_DSN=your_sentry_dsn
VITE_POSTHOG_API_KEY=your_posthog_api_key
```

### Integration Points:
1. Analytics initialized in `src/main.tsx`
2. Sentry error boundary integrated in `src/components/GlobalErrorBoundary.tsx`
3. Tour provider added to `src/App.tsx`
4. Error tracking via `src/services/sentry.ts`

### Usage Examples:
```tsx
// Track events
import { trackEvent } from '@/services/analytics';
trackEvent({
  event: 'user_signup',
  properties: { user_type: 'student' }
});

// Start tour
import { useTourGuide } from '@/contexts/TourContext';
const { startTour } = useTourGuide();
startTour('dashboard');

// Help tooltip
import { HelpTooltip } from '@/components/common/HelpTooltip';
<HelpTooltip
  tooltipId="assessment-intro"
  featureName="Assessment"
  content="Our comprehensive career assessment..."
/>
```

---

## Phase 2: Performance - Image Optimization & Skeleton Loaders ✅

### Files Created:
- `src/components/common/OptimizedImage.tsx` - Image component with lazy loading
- `src/components/common/SkeletonCard.tsx` - Skeleton loader variants
- `src/lib/apiClient.ts` - Centralized API client with retry logic
- Enhanced `src/components/GlobalErrorBoundary.tsx` - Better error recovery

### Usage Examples:
```tsx
// Optimized images
import { OptimizedImage } from '@/components/common/OptimizedImage';
<OptimizedImage
  src="/images/hero.png"
  alt="Hero image"
  lazy={true}
  className="w-full"
/>

// Skeleton loaders
import { SkeletonCard } from '@/components/common/SkeletonCard';
{isLoading ? <SkeletonCard variant="chart" /> : <RealChart />}

// API client
import { apiGet, apiPost } from '@/lib/apiClient';
const data = await apiGet('/api/assessments');
await apiPost('/api/assessments', { type: 'career' });
```

---

## Phase 3: Accessibility & SEO - Meta Tags & WCAG Compliance 🚀

### Files Created:
- `src/lib/seo.ts` - SEO utilities and meta tag management

### Usage Examples:
```tsx
import { setMetaTags, setOrganizationSchema, setBreadcrumbSchema } from '@/lib/seo';

// Set page metadata
setMetaTags({
  title: 'Career Assessment - Syncareer',
  description: 'Discover your ideal career path with our AI-powered assessment.',
  keywords: 'career, assessment, jobs, africa',
  ogImage: 'https://example.com/og-image.png',
  canonical: 'https://syncareer.com/assessment'
});

// Add structured data
setOrganizationSchema({
  name: 'Syncareer',
  logo: 'https://syncareer.com/logo.png',
  url: 'https://syncareer.com'
});

setBreadcrumbSchema([
  { name: 'Home', url: '/' },
  { name: 'Assessment', url: '/assessment' }
]);
```

### TODO - Integration Points:
1. Add `setMetaTags()` calls to each page component
2. Run accessibility audit with axe DevTools
3. Fix WCAG AA violations
4. Add skip-to-content link to layout
5. Test with screen reader

---

## Phase 4: Onboarding - Progressive Signup Wizard & Dashboard Tour 🚀

### TODO - Files to Create:
- `src/components/auth/SignupWizard.tsx` - Multi-step signup
- `src/hooks/useSignupForm.ts` - Signup form state management
- Dashboard onboarding mode in `src/pages/Dashboard.tsx`

### TODO - Implementation:
1. Create SignupWizard with 4 steps
2. Add tour system to guide through signup
3. Detect first login and start dashboard tour
4. Add collapsible sections to dashboard
5. Show quick win suggestions

---

## Phase 5: Retention - Progress Tracking, Notifications & Help 🚀

### Files Created:
- `src/contexts/NotificationContext.tsx` - Notification management
- `src/lib/progressCalculations.ts` - Progress tracking utilities
- `src/lib/helpContent.ts` - Centralized help content

### Usage Examples:
```tsx
import { useNotifications } from '@/contexts/NotificationContext';
const { addNotification, markAsRead } = useNotifications();

// Add notification
addNotification({
  type: 'new-job-match',
  title: 'New Job Match',
  message: 'Found 5 new roles that match your profile',
  action: { label: 'View Jobs', href: '/opportunities' }
});

// Progress tracking
import { calculateTotalProgress, getMilestones, getNextAction } from '@/lib/progressCalculations';
const total = calculateTotalProgress(userProgress);
const milestones = getMilestones(userProgress);
const nextAction = getNextAction(userProgress);

// Help content
import { getHelpContent } from '@/lib/helpContent';
const help = getHelpContent('assessment-intro');
```

### TODO - Integration Points:
1. Add NotificationProvider to App.tsx
2. Create NotificationCenter component
3. Add notification bell to dashboard header
4. Display progress radar chart
5. Show milestone badges
6. Create referral system enhancements

---

## Phase 6: Mobile - Bottom Navigation & Responsive Design 🚀

### Files Created:
- `src/components/common/MobileBottomNav.tsx` - Mobile navigation

### Usage Example:
```tsx
import { MobileBottomNav } from '@/components/common/MobileBottomNav';

// Add to layout
<MobileBottomNav />
```

### TODO - Integration:
1. Add MobileBottomNav to App.tsx or layout
2. Add padding-bottom: 4rem (md:hidden) to main dashboard
3. Update dashboard grid to be responsive
4. Test all forms on mobile
5. Ensure touch targets are 44x44px minimum

---

## Phase 7: Technical Debt - TypeScript & Error Handling ✅

### Files Created:
- `src/lib/validationSchemas.ts` - Centralized Zod validation schemas

### Usage Examples:
```tsx
import { signupFormSchema, validateForm, getFormErrorMessage } from '@/lib/validationSchemas';

// Validate form
const { success, data, errors } = await validateForm(
  signupFormSchema,
  formData
);

if (!success) {
  console.error(errors);
}

// Use pre-defined schemas
import { emailSchema, passwordSchema, phoneSchema } from '@/lib/validationSchemas';
const schema = z.object({
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema.optional()
});
```

### TODO - Implementation:
1. Enable strict TypeScript in tsconfig.json
2. Fix any type errors that appear
3. Update all forms to use validationSchemas.ts
4. Standardize error messages
5. Add FormError component

---

## Phase 8: Analytics Instrumentation - Event Tracking & Metrics 🚀

### Track These Events:
```
Page Views: 'page_view'
User Auth: 'user_signup', 'user_signin'
Features: 'feature_opened', 'assessment_started', 'cv_section_added'
Engagement: 'tour_started', 'help_tooltip_clicked', 'notification_clicked'
Errors: 'api_error', 'feature_error', 'form_error'
```

### TODO - Implementation Checklist:
- [ ] Add page view tracking to major routes
- [ ] Track feature entry points
- [ ] Monitor assessment/portfolio progress
- [ ] Track job application clicks
- [ ] Monitor tour completion rates
- [ ] Track help icon clicks
- [ ] Monitor error rates by endpoint
- [ ] Set up PostHog dashboards
- [ ] Create alerts for high error rates
- [ ] Monitor Core Web Vitals via Sentry

---

## Implementation Checklist

### Phase 1 ✅
- [x] Sentry integration
- [x] PostHog integration
- [x] Tour system
- [x] Help tooltips
- [x] Build verification

### Phase 2 ✅
- [x] Image optimization component
- [x] Skeleton loaders
- [x] API client utility
- [x] Enhanced error boundary
- [x] Build verification

### Phase 3 🚀
- [ ] SEO utilities (file created)
- [ ] Add meta tags to all pages
- [ ] Accessibility audit
- [ ] Fix WCAG violations
- [ ] Sitemap generation

### Phase 4 🚀
- [ ] Signup wizard component
- [ ] Dashboard onboarding
- [ ] Tour integration
- [ ] Test flows

### Phase 5 🚀
- [ ] NotificationProvider integration
- [ ] Notification UI component
- [ ] Progress tracking UI
- [ ] Milestone displays
- [ ] Referral enhancements

### Phase 6 🚀
- [ ] Add MobileBottomNav to layout
- [ ] Responsive dashboard grid
- [ ] Test on mobile devices

### Phase 7 ✅
- [x] Validation schemas (created)
- [ ] TypeScript strictness
- [ ] Type safety improvements

### Phase 8 🚀
- [ ] Event tracking implementation
- [ ] PostHog dashboard setup
- [ ] Performance monitoring

---

## Environment Variables Needed

```
# Sentry
VITE_SENTRY_DSN=https://key@sentry.io/project-id

# PostHog
VITE_POSTHOG_API_KEY=phc_xxxxxxxxxxxxx

# Optional
VITE_SUPPORT_EMAIL=support@syncareer.com
VITE_API_BASE_URL=https://api.syncareer.com
```

---

## Testing Strategy

### Manual Testing
- [ ] Test on Chrome, Firefox, Safari, mobile
- [ ] Verify analytics events in PostHog
- [ ] Check error tracking in Sentry
- [ ] Test tour flows
- [ ] Test on slow networks (throttle to 3G)

### Accessibility Testing
- [ ] Run axe DevTools on all pages
- [ ] Test keyboard navigation
- [ ] Screen reader testing with NVDA
- [ ] Color contrast verification

### Performance Testing
- [ ] Lighthouse audit (target: 90+ on all metrics)
- [ ] Check bundle size
- [ ] Monitor Core Web Vitals
- [ ] Test with slow hardware

---

## Success Metrics

- Performance: 30%+ reduction in dashboard load time
- Engagement: 40%+ users complete onboarding tour
- Retention: 15% improvement in week 1 retention
- Accessibility: Zero WCAG AA violations
- Monitoring: 100% of errors captured within 30 minutes
- Analytics: 95%+ event tracking success rate
