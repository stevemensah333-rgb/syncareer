# Automated Counsellor Verification - Implementation Guide

## Overview
Automated verification uses third-party services to validate counsellor credentials, identity, and background without manual review.

---

## Option 1: Background Checks (Recommended for MVP)

### Service: Checkr
**Cost**: $5-15 per person
**Timeline**: 1-3 days
**What it checks**: Criminal history, employment history, education verification

#### Implementation Steps

1. **Sign up for Checkr API**
   - Go to https://checkr.com
   - Create account and get API key
   - Add to environment: `CHECKR_API_KEY`

2. **Install Checkr SDK**
   ```bash
   npm install checkr-node
   ```

3. **Create verification trigger**
   ```typescript
   // src/lib/backgroundCheckApi.ts
   
   import { Checkr } from 'checkr-node';
   
   const checkr = new Checkr(process.env.CHECKR_API_KEY);
   
   export async function initiateBackgroundCheck(counsellorData: {
     firstName: string;
     lastName: string;
     email: string;
     dateOfBirth: string;
     phoneNumber: string;
   }) {
     try {
       const candidate = await checkr.candidates.create({
         first_name: counsellorData.firstName,
         last_name: counsellorData.lastName,
         email: counsellorData.email,
         phone_number: counsellorData.phoneNumber,
         date_of_birth: counsellorData.dateOfBirth,
       });
       
       // Store candidate ID in database
       return candidate.id;
     } catch (error) {
       console.error('[Checkr] Failed to create candidate:', error);
       throw error;
     }
   }
   
   export async function getBackgroundCheckStatus(candidateId: string) {
     const candidate = await checkr.candidates.retrieve(candidateId);
     return {
       status: candidate.status, // 'clear', 'consider', 'adverse'
       reports: candidate.reports,
       completedAt: candidate.completed_at,
     };
   }
   ```

4. **Add webhook handler**
   ```typescript
   // src/pages/api/webhooks/checkr.ts
   
   import { NextRequest, NextResponse } from 'next/server';
   import { supabase } from '@/integrations/supabase/client';
   
   export async function POST(request: NextRequest) {
     const event = await request.json();
     
     if (event.type === 'candidate.completed') {
       const { candidate_id, status } = event.data;
       
       // Update counsellor verification status
       await supabase
         .from('counsellor_details')
         .update({
           background_check_status: status,
           background_check_completed_at: new Date(),
           verification_status: status === 'clear' ? 'approved' : 'rejected',
         })
         .eq('background_check_candidate_id', candidate_id);
     }
     
     return NextResponse.json({ ok: true });
   }
   ```

5. **Add to counsellor onboarding**
   ```typescript
   // In CounsellorDashboard or onboarding flow
   
   async function startBackgroundCheck() {
     const checkId = await initiateBackgroundCheck({
       firstName: profile.first_name,
       lastName: profile.last_name,
       email: profile.email,
       dateOfBirth: profile.date_of_birth,
       phoneNumber: profile.phone_number,
     });
     
     // Save check ID to database
     await supabase
       .from('counsellor_details')
       .update({ background_check_candidate_id: checkId })
       .eq('id', profile.id);
     
     return checkId;
   }
   ```

6. **Database schema**
   ```sql
   ALTER TABLE counsellor_details ADD COLUMN (
     background_check_candidate_id TEXT,
     background_check_status TEXT, -- 'pending', 'clear', 'consider', 'adverse'
     background_check_completed_at TIMESTAMP
   );
   ```

---

## Option 2: LinkedIn Verification

### Implementation: LinkedIn Sign-In Integration

1. **Install LinkedIn SDK**
   ```bash
   npm install @react-oauth/google  # or linkedin SDK
   ```

2. **Verify LinkedIn Profile**
   ```typescript
   // src/lib/linkedinVerification.ts
   
   export async function verifyLinkedInProfile(linkedInUrl: string) {
     try {
       // Call LinkedIn API to verify profile
       const response = await fetch(
         `https://api.linkedin.com/v2/me?oauth2_access_token=${token}`
       );
       
       const profile = await response.json();
       
       return {
         verified: true,
         name: profile.localizedFirstName + ' ' + profile.localizedLastName,
         headline: profile.headline,
         profileUrl: linkedInUrl,
       };
     } catch (error) {
       return { verified: false, error: error.message };
     }
   }
   ```

3. **Admin checks**
   - Ask for LinkedIn URL in counsellor profile
   - Admin manually verifies:
     - Profile exists and is active
     - Career history matches claims
     - No red flags in profile

---

## Option 3: Education Verification

### Service: Parchment or National Student Clearinghouse

**Cost**: Free - $3 per verification
**Timeline**: 1-7 days

1. **Sign up**
   - Parchment: https://www.parchment.com
   - National Student Clearinghouse: https://www.studentclearinghouse.org

2. **Implementation**
   ```typescript
   // src/lib/educationVerification.ts
   
   export async function verifyEducation(counsellorData: {
     universityName: string;
     degree: string;
     graduationYear: string;
     studentName: string;
   }) {
     const response = await fetch('https://api.parchment.com/verify', {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${process.env.PARCHMENT_API_KEY}`,
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         institution: counsellorData.universityName,
         degree: counsellorData.degree,
         year_graduated: counsellorData.graduationYear,
         student_name: counsellorData.studentName,
       }),
     });
     
     return await response.json();
   }
   ```

---

## Option 4: ID Verification

### Service: Stripe Identity or AWS Rekognition

**Cost**: $1.50 - $5 per verification
**Timeline**: Real-time to 24 hours

1. **Using Stripe Identity** (Recommended)
   ```typescript
   // src/lib/idVerification.ts
   
   import Stripe from 'stripe';
   
   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
   
   export async function createIdentitySession(email: string) {
     const session = await stripe.identity.verificationSessions.create({
       type: 'document',
       metadata: {
         user_email: email,
       },
     });
     
     return session.client_secret;
   }
   
   export async function checkIdentityStatus(sessionId: string) {
     const session = await stripe.identity.verificationSessions.retrieve(sessionId);
     
     return {
       status: session.status, // 'requires_input', 'processing', 'verified', 'unverified'
       verified: session.status === 'verified',
       evidence: session.evidence,
     };
   }
   ```

2. **Add to UI**
   ```typescript
   // src/components/counsellor/IDVerificationForm.tsx
   
   import { EmbeddedVerificationForm } from '@stripe/identity-react';
   
   export function IDVerificationForm({ clientSecret }: { clientSecret: string }) {
     return (
       <EmbeddedVerificationForm clientSecret={clientSecret} />
     );
   }
   ```

---

## Option 5: Professional License Verification

### Service: AAMFT, ACA, or state boards

**Cost**: Free - $50
**Timeline**: 1-7 days

```typescript
// src/lib/licenseVerification.ts

export async function verifyProfessionalLicense(licenseData: {
  licenseNumber: string;
  licenseType: string; // 'LMHC', 'LCPC', 'LCSW', etc.
  state: string;
}) {
  // Query state licensing board API
  // Example: AAMFT license lookup
  
  const url = `https://www.aamft.org/MemberServices/member_search.asp?id=${licenseData.licenseNumber}`;
  
  try {
    const response = await fetch(url);
    const html = await response.text();
    
    // Parse response to verify license exists
    const isValid = html.includes(licenseData.licenseNumber);
    
    return {
      verified: isValid,
      licenseNumber: licenseData.licenseNumber,
      licenseType: licenseData.licenseType,
    };
  } catch (error) {
    return { verified: false, error: error.message };
  }
}
```

---

## Recommended Implementation Flow

### Step 1: Email Verification (Immediate)
- When counsellor signs up
- Send verification email
- No delay

### Step 2: Document Review (24-48 hours)
- Admin manually approves
- Keeps you in control

### Step 3: Automated Background Check (1-3 days)
- Once admin approves
- Asynchronous webhook handles results
- Takes time but very thorough

### Step 4: Education Verification (1-7 days)
- Run in parallel with background check
- Optional but builds trust

### Step 5: ID Verification (Real-time)
- Optional add-on if needed
- For high-value counsellors

---

## Counsellor Status Flow

```
Sign Up
  ↓
Email Verification ← IMMEDIATE (user action)
  ↓
Profile Review
  ↓
Admin Approval ← 24-48 hours (manual)
  ↓
Background Check ← 1-3 days (automated)
  ↓
Education Verification ← 1-7 days (automated)
  ↓
Licensed & Verified ✓
```

**Total Time**: 2-10 days depending on service speeds

---

## Database Schema for All Checks

```sql
ALTER TABLE counsellor_details ADD COLUMN (
  -- Email verification
  email_verified_at TIMESTAMP,
  
  -- Background check (Checkr)
  background_check_candidate_id TEXT,
  background_check_status TEXT,
  background_check_completed_at TIMESTAMP,
  background_check_result JSONB,
  
  -- Education verification (Parchment)
  education_verified BOOLEAN,
  education_verified_at TIMESTAMP,
  education_verification_result JSONB,
  
  -- ID verification (Stripe)
  id_verified BOOLEAN,
  id_verified_at TIMESTAMP,
  stripe_verification_session_id TEXT,
  
  -- Professional license
  license_verified BOOLEAN,
  license_verified_at TIMESTAMP,
  professional_license TEXT,
  professional_license_state TEXT,
  
  -- Overall status
  verification_status TEXT, -- 'pending', 'approved', 'rejected', 'flagged'
  verification_completed_at TIMESTAMP,
  verification_notes TEXT
);

-- Create indexes
CREATE INDEX idx_counsellor_verification_status ON counsellor_details(verification_status);
CREATE INDEX idx_counsellor_background_check ON counsellor_details(background_check_status);
```

---

## Cost Breakdown

| Service | Cost | Timeline | Effort |
|---------|------|----------|--------|
| Email Verification | Free | Immediate | 1 day |
| Manual Admin Approval | Free | 24-48h | 1 day |
| Background Check (Checkr) | $5-15 | 1-3 days | 2 days |
| Education Verification | Free-$3 | 1-7 days | 2 days |
| ID Verification (Stripe) | $1.50-5 | Real-time | 2 days |
| Professional License | Free-$50 | 1-7 days | 1 day |

**Total for full verification**: $12-73 per counsellor

---

## Quick Start (This Week)

**Easiest high-impact automation:**

1. **Implement Checkr** (2 days of dev work, $10/counsellor)
   - Gets 90% of value
   - Most straightforward API
   - Webhook-based so hands-off after setup
   - Catches red flags immediately

2. **Add Email Verification** (1 day)
   - Free and fast
   - Weeds out invalid emails

3. **Keep Manual Admin Review** (0 dev work)
   - Final human check
   - Catches edge cases

**This gives you:**
- ✓ Automated background checks
- ✓ Fast email verification
- ✓ Human judgment
- ✓ Professional platform
- ✓ Takes ~3 days to build

---

## Security Best Practices

1. **Never store sensitive data** - Keep third-party IDs only, not full check results
2. **GDPR compliant** - Clear data after decision
3. **Audit trail** - Log all verifications and decisions
4. **Webhook validation** - Verify webhook signatures from services
5. **Encryption** - Encrypt sensitive fields in database

---

## Webhook Security Example

```typescript
// src/pages/api/webhooks/checkr.ts

import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const signature = request.headers.get('X-Checkr-Signature');
  const body = await request.text();
  
  // Verify webhook signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.CHECKR_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex');
  
  if (signature !== expectedSignature) {
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 401 }
    );
  }
  
  const event = JSON.parse(body);
  // Process event...
}
```

---

## Recommendation

**For your 100 users, implement in this order:**

1. **Week 1**: Email verification + Manual approval (no cost, full control)
2. **Week 2**: Add Checkr background checks ($10/person, automated)
3. **Week 3**: Add LinkedIn verification (manual but adds credibility)
4. **Week 4+**: Add other checks as needed (ID, education, etc.)

This gives you a trusted platform that:
- ✓ Scales automatically
- ✓ Catches bad actors
- ✓ Takes ~2 weeks to build
- ✓ Costs ~$10 per counsellor

