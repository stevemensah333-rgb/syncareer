# Counsellor Verification Strategy

## Current State
- `is_verified` field exists in `counsellor_details` table
- No verification process currently implemented
- All counsellors who sign up are immediately active

## Recommended Verification System

### Tier 1: Basic Verification (Implement First - Low Effort)

#### 1.1 Email Verification
**What**: Confirm counsellor has access to professional email
**Implementation**:
- On signup as counsellor, send verification email
- Counsellor clicks link to confirm
- Set `email_verified_at` timestamp
- Counsellor cannot see booking requests until email verified

**Files to Create/Modify**:
- Add email verification flow to auth
- Add `email_verified_at` field to `counsellor_details`

**User Experience**:
- Sign up complete
- "Verify your email to accept bookings" banner
- Click email link to verify
- Banner disappears

---

#### 1.2 Admin Dashboard
**What**: Simple admin panel to approve counsellors
**Implementation**:
- New `/admin/counsellors` page (admin-only route)
- Shows list of pending counsellors with:
  - Name, email, specialization, bio
  - Applied date
  - Approve/Reject buttons
- Once approved: `is_verified = true`
- Rejected counsellors can reapply

**Files to Create**:
- `src/pages/admin/CounsellorApprovals.tsx`
- `src/components/admin/CounsellorApprovalList.tsx`
- `src/lib/adminApi.ts` for approval operations
- Add AdminRoute component similar to RoleRoute

**Database**:
- Add columns to `counsellor_details`:
  - `is_verified` (boolean)
  - `verified_at` (timestamp)
  - `verification_status` ('pending' | 'approved' | 'rejected')

**User Experience**:
- Counsellor signs up, sees "Pending approval" status
- Cannot access sessions/bookings
- Admin reviews and approves/rejects
- Approved: Can start accepting bookings
- Rejected: Can update profile and reapply

---

### Tier 2: Enhanced Verification (Implement Week 2 - Medium Effort)

#### 2.1 Credential Upload & Verification
**What**: Counsellors upload credentials (degree, certification, license)
**Implementation**:
- New step in counsellor onboarding
- Upload document (PDF, image)
- Store in Vercel Blob storage
- Admin can view and verify documents
- Add notes about verification

**Files to Create**:
- `src/components/counsellor/CredentialUpload.tsx`
- `src/pages/admin/CredentialReview.tsx`
- `src/lib/credentialApi.ts`

**Database**:
- New table: `counsellor_credentials`
  - counsellor_id, document_type, file_url, verified, verified_by, notes

---

#### 2.2 LinkedIn/Social Verification
**What**: Quick LinkedIn check for legitimacy
**Implementation**:
- Admin can link to counsellor's LinkedIn profile
- Manual check for:
  - Real profile picture
  - Career history in counselling/HR
  - Recommendations from students
  - Activity/posting (shows legitimacy)

**User Experience**:
- Admin notes in approval: "LinkedIn profile verified"
- Helps catch fake profiles

---

### Tier 3: Advanced Verification (Implement Week 3+ - High Effort)

#### 3.1 Automated Credential Verification
**What**: Integrate with credential verification services
**Services**:
- Checkr / Stripe Identity for background checks
- LinkedIn API integration for profile verification
- Degree verification with universities

**Cost**: $5-50 per counsellor depending on service
**Timeline**: 1-7 days per verification

---

#### 3.2 Rating & Reputation Lock
**What**: Require minimum rating before being recommended
**Implementation**:
- Counsellors start with 0 rating
- First 5 sessions require explicit student feedback
- Only show in "featured counsellors" after 4+ rating
- Show in main list with note: "New counsellor"

---

## Recommended Implementation Plan

### Week 1 (MVP - Do This First)
1. **Email Verification** (2 days)
   - Verify counsellors confirm their email
   - Prevents invalid emails

2. **Admin Panel** (3 days)
   - Simple approval workflow
   - Manually review counsellor profiles
   - Approve or reject

3. **Verification Badge** (1 day)
   - Show "Verified" badge on verified counsellor profiles
   - Students see who is verified

### Week 2 (Enhanced)
4. **Credential Upload** (2 days)
   - Counsellors upload documents
   - Admin reviews credentials

5. **Counsellor Onboarding** (2 days)
   - Guided flow: signup → complete profile → upload credentials → await approval
   - Show progress at each step

### Week 3+ (Advanced)
6. **Third-party Verification** (ongoing)
   - Background checks
   - Credential verification services
   - LinkedIn integration

---

## UI Mockup: Counsellor Verification Status

### On Counsellor Profile
```
Status: ✓ Verified
Verified: March 15, 2024
Badge: "Verified Counsellor"

OR

Status: ⏳ Pending Approval
Applied: March 10, 2024
Message: "Your profile is under review. 
          We typically review within 24-48 hours."

OR

Status: ❌ Verification Needed
Action: Upload credentials to get verified
Button: "Complete Verification"
```

### On Student Booking Page
```
Available Counsellors
├── Sarah Johnson ✓ Verified
│   ⭐ 4.8 (12 reviews)
│   Specialization: Career transitions
│   Sessions: 150+
│
├── Ahmed Hassan ⏳ New
│   ⭐ 4.9 (2 reviews)
│   Specialization: CV optimization
│   Sessions: 5+
│
└── Zainab Smith ✓ Verified
    ⭐ 4.6 (8 reviews)
    Specialization: Interview prep
    Sessions: 45+
```

---

## Database Schema Additions

```sql
-- Add to counsellor_details table
ALTER TABLE counsellor_details ADD COLUMN (
  is_verified BOOLEAN DEFAULT FALSE,
  verification_status TEXT CHECK (verification_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  verified_at TIMESTAMP,
  email_verified_at TIMESTAMP,
  verification_notes TEXT,
  verified_by UUID REFERENCES auth.users(id)
);

-- New credentials table
CREATE TABLE counsellor_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counsellor_id UUID NOT NULL REFERENCES counsellor_details(id) ON DELETE CASCADE,
  credential_type TEXT NOT NULL,
  document_url TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES auth.users(id),
  verification_notes TEXT,
  uploaded_at TIMESTAMP DEFAULT now(),
  verified_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_counsellor_verification ON counsellor_details(is_verified);
CREATE INDEX idx_counsellor_pending ON counsellor_details(verification_status) 
  WHERE verification_status = 'pending';
```

---

## API Endpoints Needed

```typescript
// Admin approval
POST /api/admin/counsellors/:id/approve
POST /api/admin/counsellors/:id/reject

// Counsellor verification
POST /api/counsellor/verify-email
GET /api/counsellor/verification-status
POST /api/counsellor/upload-credentials

// Public
GET /api/counsellors?verified_only=true
GET /api/counsellor/:id (includes verification info)
```

---

## Trust & Safety Principles

1. **Transparency**: Students see verification status clearly
2. **Speed**: Approval within 24-48 hours
3. **Fairness**: Clear criteria for approval
4. **Reversibility**: Can reject and allow reapplication
5. **Escalation**: Serious concerns go to higher review

---

## Rejection Reasons (for counsellors)

1. **Incomplete Profile** - "Please fill in all required fields"
2. **Suspicious Information** - "Profile information doesn't match"
3. **Invalid Credentials** - "Credentials could not be verified"
4. **Policy Violation** - "Profile violates our community guidelines"
5. **Other** - "Please contact support"

---

## Quick Start (This Week)

**Minimum viable verification:**

1. Add `is_verified` boolean check to booking flow
   - Show message: "Counsellor verification in progress"
   - All new counsellors get `is_verified = false`

2. Create simple admin approval list
   - Show pending counsellors
   - Approve with one click
   - Set `is_verified = true`

3. Add verification badge to profiles
   - Show next to name: ✓ Verified

**This gives you:**
- ✓ Control over who can counsel students
- ✓ Safety mechanism
- ✓ Trust building for students
- ✓ Takes ~1 day to implement

---

## Summary

**Implement in this order:**
1. Email verification (prevents spam)
2. Admin approval panel (controls quality)
3. Verification badge (shows status to students)
4. Credential upload (validates expertise)
5. Advanced checks (third-party services)

This creates a trustworthy platform while keeping implementation simple and fast.

