# 🚀 Credential Verification System - Launch Checklist

## Pre-Launch Setup (Do This First)

### Phase 1: Database Setup (10 minutes)
- [ ] Open Supabase dashboard
- [ ] Go to SQL Editor
- [ ] Open `DATABASE_SCHEMA.sql` file
- [ ] Copy entire contents
- [ ] Paste into SQL Editor
- [ ] Click "Run"
- [ ] Verify: No errors, table created

### Phase 2: Storage Setup (5 minutes)
- [ ] Go to Storage in Supabase
- [ ] Create new bucket
- [ ] Name: `documents`
- [ ] Set to Private
- [ ] Save

### Phase 3: Test Build (5 minutes)
- [ ] Run `pnpm build` locally
- [ ] Verify: No TypeScript errors
- [ ] Check: Build completes successfully

**Total Setup Time**: ~20 minutes

---

## Launch Tests (Do This Before Going Live)

### Test 1: Counsellor Upload Flow
**What to test**: Can counsellors upload credentials?

- [ ] Sign up as test counsellor account
- [ ] Navigate to `/counsellor/complete-credentials`
- [ ] Fill in form for 1 credential type
- [ ] Upload a PDF file
- [ ] Click "Submit for Verification"
- [ ] See success message
- [ ] Verify credential appears in database
- [ ] Status shows "⏳ Pending"

### Test 2: Admin Review Dashboard
**What to test**: Can admin see and review credentials?

- [ ] Log in as admin (must have admin role)
- [ ] Navigate to `/admin/credentials`
- [ ] See statistics (should show 1 pending)
- [ ] See credential in table
- [ ] Click "View" button
- [ ] Modal opens with credential details
- [ ] Can see counsellor profile
- [ ] Can see credential info
- [ ] Download button works

### Test 3: Approval Workflow
**What to test**: Can admin approve credentials?

- [ ] Still in credential modal
- [ ] Fill in approval notes (optional)
- [ ] Click "Approve" button
- [ ] See success toast notification
- [ ] Modal closes
- [ ] Credential status changes to "Approved" in table
- [ ] Go back to counsellor account
- [ ] Refresh `/counsellor/complete-credentials`
- [ ] Credential now shows "✓ Approved"

### Test 4: Rejection Workflow
**What to test**: Can admin reject credentials?

- [ ] Upload another test credential as counsellor
- [ ] Go to admin dashboard
- [ ] Click "View" on new credential
- [ ] Fill in rejection reason
- [ ] Click "Reject" button
- [ ] See success toast
- [ ] Modal closes
- [ ] Credential shows "Rejected" in table
- [ ] Counsellor sees "✗ Rejected" status
- [ ] Can reupload credential

### Test 5: Filtering
**What to test**: Do filters work?

- [ ] Upload 2-3 more test credentials (different types)
- [ ] Go to admin dashboard
- [ ] Filter by status: Try "pending", "approved", "rejected"
  - [ ] Each filter shows correct credentials
- [ ] Filter by type: Try "degree", "license", "certification"
  - [ ] Each type shows correct credentials
- [ ] Search by name: Type test counsellor name
  - [ ] Shows only that counsellor's credentials
- [ ] Clear filters: All credentials visible again

### Test 6: Mobile Responsiveness
**What to test**: Does it work on mobile?

Counsellor Page:
- [ ] View on phone/tablet (use DevTools)
- [ ] Form is readable
- [ ] Upload button works
- [ ] Can scroll through all fields

Admin Dashboard:
- [ ] View on phone/tablet
- [ ] Statistics cards visible
- [ ] Filters responsive
- [ ] Table scrollable
- [ ] View modal works

### Test 7: Security
**What to test**: Are permissions working?

- [ ] Try accessing `/admin/credentials` as counsellor
  - [ ] Should redirect to counsellor dashboard
- [ ] Try accessing `/counsellor/complete-credentials` as student
  - [ ] Should redirect to student dashboard
- [ ] Log out and try accessing routes
  - [ ] Should redirect to login

### Test 8: Error Handling
**What to test**: Do errors show properly?

- [ ] Try uploading without selecting a file
  - [ ] Should show error: "Please upload at least one credential"
- [ ] Try uploading large file (over limit)
  - [ ] Should show error about file size
- [ ] Try submitting empty issuer name
  - [ ] Should prompt for issuer name
- [ ] Try invalid date
  - [ ] Should show date validation error

### Test 9: Statistics Accuracy
**What to test**: Do numbers match?

- [ ] Upload 3 credentials (all pending)
- [ ] Go to admin dashboard
- [ ] "Pending" count should be 3
- [ ] "Total" count should be 3
- [ ] Approve 1 credential
- [ ] "Pending" should now be 2
- [ ] "Approved" should now be 1
- [ ] "Total" should still be 3

### Test 10: Documentation Download
**What to test**: Can admin download documents?

- [ ] Go to admin dashboard
- [ ] View a credential
- [ ] Click "Download Document"
- [ ] File should download/open

---

## Pre-Production Checklist

### Code Quality
- [ ] No TypeScript errors (`pnpm build` passes)
- [ ] All components have JSDoc comments
- [ ] Error handling implemented
- [ ] Loading states shown
- [ ] Toast notifications working
- [ ] Console has no errors

### Database
- [ ] `counsellor_credentials` table created
- [ ] All columns present (id, counsellor_id, credential_type, etc.)
- [ ] Indexes created
- [ ] RLS policies active
- [ ] `documents` storage bucket created

### Security
- [ ] Routes protected with ProtectedRoute
- [ ] Admin routes require admin role
- [ ] Counsellor routes require counsellor role
- [ ] RLS policies prevent unauthorized access
- [ ] Storage bucket is private

### Performance
- [ ] Page loads quickly (< 3 seconds)
- [ ] No N+1 queries
- [ ] Images optimized
- [ ] Bundle size acceptable
- [ ] Mobile performance good

### User Experience
- [ ] Clear error messages
- [ ] Success confirmations
- [ ] Loading indicators
- [ ] Mobile responsive
- [ ] Intuitive navigation
- [ ] Accessible (keyboard, screen reader)

---

## Deployment Steps

### Step 1: Final Build
```bash
cd artifacts/syncareer
pnpm build
# Should complete with no errors
```

### Step 2: Deploy to Vercel
```bash
# Option 1: Using Vercel CLI
vercel --prod

# Option 2: Push to GitHub, auto-deploy via GitHub integration
git push origin main
```

### Step 3: Post-Deployment Tests
- [ ] Test counsellor upload on live site
- [ ] Test admin review on live site
- [ ] Test all filters
- [ ] Check mobile responsiveness
- [ ] Verify error handling

### Step 4: Announce to Counsellors
- [ ] Send email about credential verification
- [ ] Include link to `/counsellor/complete-credentials`
- [ ] Explain why verification is needed
- [ ] Set deadline for submission

---

## Post-Launch Monitoring

### Week 1
- [ ] Monitor database for credential uploads
- [ ] Check error logs
- [ ] Respond to any user issues
- [ ] Verify email notifications work (if added)

### Ongoing
- [ ] Review approval/rejection metrics
- [ ] Check for unusual patterns
- [ ] Monitor performance
- [ ] Gather user feedback

---

## Rollback Plan (If Needed)

If something goes wrong:

1. Revert routes in `App.tsx`:
   - Remove the 2 new routes (credential-related)
   - Redeploy

2. Keep database table for data preservation:
   - Don't delete `counsellor_credentials` table
   - Can restore feature later without losing data

3. Contact support if database issues occur

---

## Success Criteria

✅ System is "live" when:
- [ ] Database table created and verified
- [ ] Storage bucket created and tested
- [ ] All 10 tests pass
- [ ] Security checklist complete
- [ ] Build passes with no errors
- [ ] Deployed to production
- [ ] Counsellors can upload credentials
- [ ] Admin can approve/reject
- [ ] No console errors on live site

---

## Support & Troubleshooting

### Common Issues

**"Table doesn't exist" error**
→ Run DATABASE_SCHEMA.sql in Supabase SQL Editor

**"Can't upload file"**
→ Check `documents` storage bucket exists and is private

**"Admin dashboard empty"**
→ Verify user has `admin` role in `user_roles` table

**"Page loads but nothing shows"**
→ Check browser console for errors
→ Verify authentication working
→ Check database connection

**"Download not working"**
→ Verify storage bucket is accessible
→ Check RLS policies on storage

---

## Final Checklist

Before going live:

- [ ] Database setup complete
- [ ] Storage bucket created
- [ ] All 10 tests passed
- [ ] Build successful (no errors)
- [ ] Security verified
- [ ] Mobile tested
- [ ] Error handling verified
- [ ] Deployed to production
- [ ] Tested on live site
- [ ] Ready to announce!

---

## 🎉 You're Ready to Launch!

Once all items above are checked, your credential verification system is live and ready to use.

**Total time to production**: ~1 hour (including testing)

Good luck! 🚀
