# Syncareer - Phase 1: Analytics & Tour System - Environment Variables

This phase requires the following environment variables to be set in your Vercel project:

## Sentry (Error Tracking)
- `VITE_SENTRY_DSN` - Your Sentry DSN for error tracking (get from https://sentry.io)

## PostHog (Analytics)
- `VITE_POSTHOG_API_KEY` - Your PostHog API key (get from https://posthog.com)

## How to add environment variables:
1. Go to your Vercel project settings
2. Navigate to "Environment Variables" section
3. Add each variable with its corresponding value
4. Redeploy your application

## Optional Features Enabled:
- **Error Tracking**: Automatic error capture and reporting via Sentry
- **Analytics**: User behavior tracking and event monitoring via PostHog
- **Tour System**: Interactive guided tours for user onboarding
- **Help Tooltips**: Contextual help icons throughout the app
