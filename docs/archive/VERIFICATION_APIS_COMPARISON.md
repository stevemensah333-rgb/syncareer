# Counsellor Verification APIs - Practical Comparison

## Easiest to Implement (Start Here)

### 1. Email Verification - Kickbox
**Free Tier**: 100 emails/month
**Paid**: $0.01 per email after
**Setup Time**: 5 minutes
**Use Case**: Verify email is real and active

```typescript
import axios from 'axios';

async function verifyEmail(email: string) {
  const response = await axios.get('https://api.kickbox.com/v2/verify', {
    params: {
      email: email,
      apikey: process.env.KICKBOX_API_KEY,
    }
  });
  
  return response.data.result; // 'valid', 'invalid', 'unknown'
}
```

**Pros**: Instant, cheap, no friction
**Cons**: Only checks email validity
**Best for**: First-pass screening

---

### 2. Phone Verification - Twilio
**Free Tier**: $0
**Cost**: $0.01 per SMS
**Setup Time**: 10 minutes
**Use Case**: Verify counsellor has real phone number

```typescript
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendPhoneVerification(phoneNumber: string) {
  const verification = await client.verify
    .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
    .verifications.create({
      to: phoneNumber,
      channel: 'sms',
    });
  
  return verification.sid;
}

async function verifyPhoneCode(verificationSid: string, code: string) {
  const verification = await client.verify
    .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
    .verificationChecks.create({
      to: phoneNumber,
      code: code,
    });
  
  return verification.status === 'approved';
}
```

**Pros**: Instant, prevents fake accounts, cheap
**Cons**: Requires user interaction
**Best for**: Preventing duplicate/bot accounts

---

### 3. LinkedIn Profile Verification
**Free Tier**: Yes (requires OAuth)
**Cost**: Free (rate limited)
**Setup Time**: 30 minutes
**Use Case**: Verify LinkedIn profile exists and is legitimate

```typescript
async function verifyLinkedInProfile(accessToken: string) {
  const response = await fetch('https://api.linkedin.com/v2/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'LinkedIn-Version': '202401',
    }
  });
  
  const profile = await response.json();
  
  return {
    verified: true,
    linkedInId: profile.id,
    name: profile.localizedFirstName + ' ' + profile.localizedLastName,
  };
}
```

**Pros**: Free, shows real professional profile, LinkedIn is trusted
**Cons**: Requires counsellor to sign in with LinkedIn
**Best for**: Quick credibility check

---

## Best Value (Low Cost, High Impact)

### 4. Stripe Identity
**Cost**: $1.50 per verification
**Timeline**: Real-time
**Setup Time**: 30 minutes
**What it checks**: Government-issued ID

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function createIdentityVerification(email: string) {
  const session = await stripe.identity.verificationSessions.create({
    type: 'document',
    metadata: { email },
  });
  
  return session.client_secret;
}

async function checkIdentityStatus(sessionId: string) {
  const session = await stripe.identity.verificationSessions.retrieve(sessionId);
  
  return {
    verified: session.status === 'verified',
    status: session.status,
  };
}
```

**Pros**: Instant, high trust, reasonable price, easy UI
**Cons**: Requires government ID
**Best for**: High-value verification

---

### 5. Checkr Background Check
**Cost**: $5-15 per person
**Timeline**: 1-3 days
**Setup Time**: 1 hour
**What it checks**: Criminal history, employment, education

```typescript
async function initiateBackgroundCheck(counsellorData: {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
}) {
  const response = await fetch('https://api.checkr.com/v1/candidates', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(process.env.CHECKR_API_KEY + ':').toString('base64')}`,
    },
    body: new URLSearchParams({
      first_name: counsellorData.firstName,
      last_name: counsellorData.lastName,
      email: counsellorData.email,
      date_of_birth: counsellorData.dateOfBirth,
    }),
  });
  
  const candidate = await response.json();
  return candidate.id;
}
```

**Pros**: Most thorough, catches red flags, industry standard
**Cons**: Takes time, costs money
**Best for**: Final verification before approval

---

### 6. Onfido ID Verification
**Cost**: $2-5 per verification
**Timeline**: Real-time to 24 hours
**Setup Time**: 45 minutes
**What it checks**: ID authenticity, liveness check, document verification

```typescript
async function createOnfidoCheck(applicantId: string) {
  const response = await fetch('https://api.onfido.com/v3.6/checks', {
    method: 'POST',
    headers: {
      'Authorization': `Token token=${process.env.ONFIDO_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      applicant_id: applicantId,
      report_names: ['document', 'facial_similarity_photo'],
    }),
  });
  
  return await response.json();
}

async function getCheckStatus(checkId: string) {
  const response = await fetch(`https://api.onfido.com/v3.6/checks/${checkId}`, {
    headers: {
      'Authorization': `Token token=${process.env.ONFIDO_API_TOKEN}`,
    },
  });
  
  return await response.json();
}
```

**Pros**: Very thorough, includes liveness check (catches deepfakes), reliable
**Cons**: Slightly more complex API, moderate cost
**Best for**: High-security verification

---

## Budget Comparison

### Scenario: Verify 100 counsellors

| Approach | Setup | Per Person | Total Cost | Timeline |
|----------|-------|-----------|-----------|----------|
| Email Only | 5 min | $0 | $0 | Instant |
| Email + Phone | 15 min | $0.01 | $1 | Instant |
| Email + LinkedIn | 30 min | $0 | $0 | 5 min |
| Email + Stripe ID | 30 min | $1.50 | $150 | Real-time |
| Email + Checkr BG | 1 hr | $10 | $1,000 | 3 days |
| **Email + Phone + Checkr** | 1.5 hr | $10.01 | $1,001 | 3 days |

---

## Recommended Implementation Path

### Phase 1: Immediate (This Week)
**Cost**: Free
**Time**: 30 minutes implementation

```typescript
// 1. Email verification
async function tier1Verification(email: string) {
  const isValidEmail = await kickbox.verify(email);
  return isValidEmail;
}
```

### Phase 2: Better (Week 2)
**Cost**: ~$1 per counsellor
**Time**: 1 hour implementation

```typescript
// 1. Email verification
// 2. Phone verification
// 3. LinkedIn sign-in (optional)
async function tier2Verification(counsellor: {
  email: string;
  phone: string;
  linkedInAccessToken?: string;
}) {
  const emailValid = await kickbox.verify(counsellor.email);
  const phoneValid = await twilio.verify(counsellor.phone);
  const linkedInValid = counsellor.linkedInAccessToken 
    ? await verifyLinkedIn(counsellor.linkedInAccessToken)
    : null;
  
  return emailValid && phoneValid;
}
```

### Phase 3: Professional (Week 3)
**Cost**: ~$10 per counsellor
**Time**: 2 hours implementation

```typescript
// 1. Email + Phone
// 2. Stripe ID verification (real-time)
// 3. Checkr background check (async)
async function tier3Verification(counsellor) {
  // Immediate checks
  const emailValid = await kickbox.verify(counsellor.email);
  const phoneValid = await twilio.verify(counsellor.phone);
  
  // Real-time ID check
  const stripeSession = await stripe.identity.verify(counsellor);
  
  // Async background check (webhook)
  const checkrId = await checkr.initiate(counsellor);
  
  return {
    immediate: emailValid && phoneValid && stripeSession.verified,
    pending: checkrId, // Completes in 1-3 days
  };
}
```

---

## Free & Low-Cost Combinations

### Option A: Completely Free
- **Email**: Kickbox (100/month free)
- **Phone**: Twilio (free trial, then $0.01/SMS)
- **LinkedIn**: Free OAuth
- **Total Cost**: ~$0 for first 100, then $1 ongoing

### Option B: $1-2 Per Counsellor
- **Email**: Kickbox ($0)
- **Phone**: Twilio ($0.01)
- **LinkedIn**: Free ($0)
- **Stripe ID**: $1.50
- **Total**: ~$1.50 per counsellor

### Option C: Complete ($10+ Per Counsellor)
- **Email**: Kickbox ($0)
- **Phone**: Twilio ($0.01)
- **Stripe ID**: $1.50
- **Checkr BG**: $10
- **Total**: ~$11.50 per counsellor

---

## Implementation Priority

**Fastest to implement:**
1. Email verification (Kickbox) - 15 min
2. Phone verification (Twilio) - 15 min
3. LinkedIn OAuth - 30 min
4. Stripe Identity - 45 min
5. Checkr background - 1 hour

**Highest confidence:**
1. Checkr background check ($10, 1-3 days)
2. Stripe Identity ($1.50, real-time)
3. Onfido ($2-5, real-time)
4. LinkedIn profile ($0, instant)
5. Phone verification ($0.01, instant)

---

## Quick Start Code

```typescript
// src/lib/counsellorVerification.ts

import axios from 'axios';
import twilio from 'twilio';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function verifyEmailExists(email: string) {
  const response = await axios.get('https://api.kickbox.com/v2/verify', {
    params: {
      email,
      apikey: process.env.KICKBOX_API_KEY,
    }
  });
  return response.data.result === 'valid';
}

export async function sendPhoneVerification(phone: string) {
  const verification = await twilioClient.verify
    .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
    .verifications.create({ to: phone, channel: 'sms' });
  return verification.sid;
}

export async function createIdentityVerification(email: string) {
  const session = await stripe.identity.verificationSessions.create({
    type: 'document',
    metadata: { email },
  });
  return session.client_secret;
}

export async function runFullVerification(counsellor: any) {
  return {
    emailValid: await verifyEmailExists(counsellor.email),
    phoneVerificationSent: await sendPhoneVerification(counsellor.phone),
    idVerificationClient: await createIdentityVerification(counsellor.email),
  };
}
```

---

## My Top Recommendation

**For your 100 users:**

1. **Start with**: Email + Phone (Free/Cheap)
   - Email: Kickbox (free, catches invalid emails)
   - Phone: Twilio SMS (costs $0.01, prevents bot accounts)
   - Time: 30 minutes to implement

2. **Add in Week 2**: Stripe Identity ($1.50 each)
   - Real-time government ID verification
   - High trust for students
   - Time: 45 minutes

3. **Add in Week 3**: Checkr Background Check ($10 each)
   - Most thorough option
   - Catches red flags
   - Async via webhook
   - Time: 1 hour

**Total investment**: 2.5 hours dev + $1,150 for all 100 counsellors + gives you world-class verification

