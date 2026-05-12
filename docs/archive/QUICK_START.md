# Syncareer Improvements - Quick Start Guide

## 1. Environment Setup

First, add the required environment variables to your Vercel project or `.env` file:

```bash
# Sentry Configuration
VITE_SENTRY_DSN=https://your-key@sentry.io/your-project-id

# PostHog Configuration  
VITE_POSTHOG_API_KEY=your-posthog-api-key
VITE_POSTHOG_API_HOST=https://us.posthog.com
```

## 2. Install Dependencies

Dependencies have already been installed, but to verify:

```bash
cd artifacts/syncareer
pnpm install
```

## 3. Build and Test

```bash
# Build the project
PORT=3000 BASE_PATH="/" pnpm build

# Start dev server
pnpm dev
```

## 4. Key Features to Test

### Feature Tour System
- Create a new user account
- The tour should automatically start on first login
- Click through the tour steps or skip

### Analytics
- Check PostHog dashboard for user events
- Check Sentry for any error tracking

### Onboarding
- New users are guided through signup wizard
- Progress is tracked and saved
- Dashboard shows completed milestones

### Mobile Navigation
- Open app on mobile or use browser dev tools
- Bottom navigation should appear on small screens

### Error Handling
- Errors are captured in Sentry automatically
- User-friendly error messages are displayed

### SEO
- Check Landing page title and meta tags
- Assessment page has breadcrumb schema

## 5. New Components to Integrate

### Using OptimizedImage
```tsx
import { OptimizedImage } from '@/components/common/OptimizedImage';

<OptimizedImage
  src="/images/hero.png"
  alt="Hero image"
  width={1200}
  height={600}
/>
```

### Using SkeletonCard
```tsx
import { SkeletonCard } from '@/components/common/SkeletonCard';

<SkeletonCard variant="card" count={3} />
```

### Using HelpTooltip
```tsx
import { HelpTooltip } from '@/components/common/HelpTooltip';

<div className="flex items-center gap-2">
  <label>Feature Name</label>
  <HelpTooltip 
    title="Feature Help"
    content="This is what this feature does..."
  />
</div>
```

### Using Notifications
```tsx
import { useNotification } from '@/contexts/NotificationContext';

const { addNotification } = useNotification();

addNotification({
  type: 'success',
  title: 'Success',
  message: 'Action completed successfully',
});
```

### Tracking Events
```tsx
import { trackEvent, EVENTS } from '@/lib/analyticsEvents';

// Track feature usage
trackEvent(EVENTS.FEATURE_ACCESSED, { feature: 'cv-builder' });

// Or use specific helpers
import { trackAssessmentCompleted, trackJobApply } from '@/lib/analyticsEvents';

trackAssessmentCompleted(85, 600);
trackJobApply('job-123', 'Senior Developer');
```

### Page Tracking
```tsx
import { usePageTracking } from '@/hooks/usePageTracking';

export function MyPage() {
  usePageTracking(); // Automatically tracks page views
  
  return <div>Page content</div>;
}
```

## 6. Monitoring & Analytics

### Sentry Dashboard
- View errors and exceptions in real-time
- Set up alerts for critical errors
- Review session replays

### PostHog Analytics
- Monitor user behavior and events
- Create funnels to track user flows
- Set up feature flags for A/B testing
- View retention and engagement metrics

### Core Web Vitals
- Check performance.json in PostHog
- Monitor LCP, FID, CLS metrics
- Optimize based on data

## 7. TypeScript Changes

With strict mode enabled, you may see additional type errors. To fix:

1. Add proper type annotations to functions
2. Use `as const` for literal types
3. Check null/undefined explicitly
4. Use type guards for narrowing

Example:
```tsx
// Before
function process(data) {
  return data.id;
}

// After  
function process(data: { id: string }): string {
  return data.id;
}
```

## 8. Form Validation

Use the centralized schemas:

```tsx
import { signupFormSchema } from '@/lib/validationSchemas';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const form = useForm({
  resolver: zodResolver(signupFormSchema),
});
```

## 9. Error Handling

Always use the error utilities:

```tsx
import { normalizeError, logErrorToSentry, getUserFriendlyMessage } from '@/lib/errorHandling';

try {
  // API call
} catch (error) {
  const appError = normalizeError(error, 'context');
  logErrorToSentry(appError);
  
  const userMessage = getUserFriendlyMessage(appError);
  // Show to user
}
```

## 10. Deployment Checklist

- [ ] Add Sentry DSN to environment variables
- [ ] Add PostHog API key to environment variables
- [ ] Run `pnpm build` successfully
- [ ] Test tour system on staging
- [ ] Verify analytics data flow to PostHog
- [ ] Check error tracking in Sentry
- [ ] Test mobile navigation on device
- [ ] Validate SEO with Google Rich Snippets
- [ ] Run accessibility audit (axe DevTools)
- [ ] Monitor performance metrics

## 11. Support & Troubleshooting

### PostHog not capturing events
- Check environment variables are set correctly
- Verify API key is valid
- Check browser console for errors

### Sentry not capturing errors
- Check Sentry DSN is set in environment
- Verify Sentry project exists
- Check network tab for Sentry requests

### Tour not showing
- Check TourProvider is wrapping app
- Verify tour data is loaded
- Check browser localStorage for tour completion status

### Images not loading
- Verify image paths are correct
- Check for CORS issues
- Ensure WebP support or fallback in place

## Questions or Issues?

Refer to the comprehensive documentation in `IMPLEMENTATION_GUIDE.md` or `COMPLETE_IMPROVEMENT_SUMMARY.md`.
