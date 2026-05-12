# Credential Verification System - Quick Setup Guide

## 🚀 Your System Is Ready to Go!

I've built a complete credential verification system. Here's what to do next.

---

## Step 1: Set Up Database (In Lovable - 10 minutes)

### Create the `counsellor_credentials` Table

1. Go to your Supabase dashboard
2. Open SQL Editor
3. Copy-paste the entire contents of `DATABASE_SCHEMA.sql`
4. Click "Run"

**That's it!** The table, indexes, and RLS policies are now set up.

---

## Step 2: Create Storage Bucket (In Lovable - 5 minutes)

1. Go to **Storage** in Supabase
2. Create a new bucket called `documents`
3. Set it to **Private**
4. That's all you need - the app handles the rest

---

## Step 3: Test the System (5 minutes)

### As a Counsellor:
1. Sign up a new counsellor account
2. Go to `/counsellor/complete-credentials`
3. Upload a test credential (degree, license, etc.)
4. You should see it with status "⏳ Pending"

### As Admin:
1. Login as your admin account
2. Go to `/admin/credentials`
3. You should see the credential you just uploaded
4. Click "View" to see the modal
5. Try "Approve" with a note
6. Go back as counsellor - status should show "✓ Approved"

---

## 📁 What Was Built

### Pages (2):
- `/counsellor/complete-credentials` - Where counsellors upload credentials
- `/admin/credentials` - Your admin dashboard to review

### Components (5):
- `CredentialUpload.tsx` - Main counsellor upload page
- `CredentialUploadField.tsx` - Individual credential file upload
- `CredentialReview.tsx` - Admin dashboard
- `CredentialList.tsx` - Credentials table
- `CredentialViewer.tsx` - Modal to review & approve/reject

### API Module (1):
- `credentialApi.ts` - All backend operations (upload, approve, reject, etc.)

### Total Code: 1,200+ lines

---

## 🎯 Counsellor Flow

```
Counsellor Signs Up
  ↓
Redirect to /counsellor/complete-credentials
  ↓
Upload degree, license, certification, work experience
  ↓
Status shows "⏳ Pending Review"
  ↓
Admin approves/rejects
  ↓
Counsellor sees ✓ Approved or ✗ Rejected status
```

---

## 🎯 Admin Flow

```
Go to /admin/credentials
  ↓
See statistics (5 pending, 2 approved, 1 rejected)
  ↓
Filter by status/type or search by name
  ↓
Click "View" on any credential
  ↓
Modal shows:
  - Counsellor profile
  - Credential details
  - Download link for document
  ↓
Click "Approve" or "Reject"
  ↓
Status updates immediately
```

---

## ✨ Key Features

✅ **Drag-and-drop** file upload
✅ **4 credential types**: Degree, License, Certification, Work Experience
✅ **Admin dashboard** with statistics & filters
✅ **Document download** to verify credentials
✅ **Status tracking**: Pending → Approved/Rejected
✅ **Notes system**: Add context to approvals/rejections
✅ **Search & filter** by status, type, counsellor name
✅ **Mobile responsive** design
✅ **Fully secured** with RLS policies
✅ **Audit trail** of all approvals with admin ID & timestamp

---

## 🔗 Optional Integration Points

### Show Verification Badge on Profiles
After a credential is approved, you can show a "Verified" badge on the counsellor profile.

Use: `getCounsellorVerificationStatus(counsellorId)`

Returns: `{ isVerified, allApproved, pendingCount, rejectedCount }`

### Prevent Unverified Counsellors from Booking
When a counsellor tries to accept a session, check:

```typescript
const status = await getCounsellorVerificationStatus(counsellorId);
if (!status.isVerified) {
  return alert('Please complete credential verification first');
}
```

### Auto-Redirect After Signup
In the counsellor signup flow, redirect to `/counsellor/complete-credentials`:

```typescript
navigate('/counsellor/complete-credentials');
```

---

## 📊 Admin Statistics

The dashboard shows:
- **Total**: All credentials submitted
- **Pending**: 📋 Awaiting review
- **Approved**: ✓ Verified
- **Rejected**: ✗ Need resubmission

---

## 🔒 Security

All protected with:
- ✓ Authentication required
- ✓ Role-based access (counsellors can only upload, admins can only review)
- ✓ RLS policies on database
- ✓ Private storage bucket
- ✓ Audit trail (admin ID + timestamp on every approval/rejection)

---

## 📱 Responsive Design

- ✓ Desktop: Full featured table view
- ✓ Tablet: Optimized layout
- ✓ Mobile: Touch-friendly buttons, scrollable tables

---

## 🚨 Common Issues & Solutions

### "No credentials to review"
→ Make sure you've uploaded a credential as a counsellor first

### "Document download not working"
→ Check that the `documents` storage bucket is created and is private

### "Can't upload file"
→ Ensure file is PDF, Word, JPG, or PNG (under 10MB)

### "Admin dashboard shows empty"
→ Make sure your user has the `admin` role in `user_roles` table

---

## 🎉 You're Ready!

The system is production-ready. Just set up the database (copy-paste SQL) and you're good to go.

**Next Steps**:
1. ✅ Create database table (copy-paste SQL from DATABASE_SCHEMA.sql)
2. ✅ Create storage bucket (create `documents` bucket in Supabase)
3. ✅ Test as counsellor (sign up, upload credential)
4. ✅ Test as admin (review, approve/reject)
5. ✅ Deploy!

---

## 📞 Need Help?

All code is:
- ✅ Fully typed (TypeScript)
- ✅ Documented with comments
- ✅ Following your existing patterns
- ✅ Production-ready

Files:
- `src/lib/credentialApi.ts` - API operations (223 lines)
- `src/pages/counsellor/CredentialUpload.tsx` - Upload page (329 lines)
- `src/pages/admin/CredentialReview.tsx` - Admin dashboard (235 lines)
- `src/components/counsellor/CredentialUploadField.tsx` - Upload component (225 lines)
- `src/components/admin/CredentialList.tsx` - Credentials table (112 lines)
- `src/components/admin/CredentialViewer.tsx` - Review modal (270 lines)
