# URL Guide - Credential Verification System

## 🎯 Public Routes (No Auth Needed)
- `/` - Landing page
- `/pricing` - Pricing page
- `/onboarding` - Signup flow

---

## 👨‍💼 Counsellor Routes (Auth Required + Counsellor Role)

### Main Dashboard
- `/counsellor-dashboard` - Main counsellor dashboard
- `/counsellor-availability` - Manage availability
- `/counsellor-sessions` - View sessions
- `/counsellor-clients` - View clients

### ✨ NEW - Credential Verification
**`/counsellor/complete-credentials`** ← You are here!

This is where counsellors:
- Upload their 4 credentials
- See verification status
- Reupload if rejected

**Access**: Protected route, counsellor-only
**Who can access**: Any signed-up counsellor
**What they see**:
  - Credential type selector
  - File upload (drag-drop)
  - Issuer name + dates
  - Status badges (pending/approved/rejected)
  - Progress tracker

**Example Flow**:
```
1. Counsellor signs up
2. System redirects to /counsellor/complete-credentials
3. They upload degree, license, etc.
4. Status shows "⏳ Pending Review"
5. Admin approves
6. Status shows "✓ Approved"
7. They can now accept bookings
```

---

## 🔐 Admin Routes (Auth Required + Admin Role)

### Existing Admin Pages
- `/admin/feedback` - User feedback dashboard
- `/admin/users` - User management

### ✨ NEW - Credential Review
**`/admin/credentials`** ← Your admin panel!

This is where YOU:
- Review all pending credentials
- See stats (total, pending, approved, rejected)
- Search by counsellor name
- Filter by type or status
- View documents
- Approve/reject credentials

**Access**: Protected route, admin-only
**Who can access**: Users with `admin` role only
**What you see**:
  - Statistics cards (total, pending, approved, rejected)
  - Filter panel (search, status, type)
  - Credentials table
  - Click "View" to review details
  - Modal with:
    - Counsellor profile
    - Credential details
    - Download button for document
    - Approve/Reject buttons with notes

**Example Admin Workflow**:
```
1. Admin logs in
2. Goes to /admin/credentials
3. Sees: 5 pending, 2 approved, 1 rejected
4. Filters to "pending" status
5. Clicks "View" on a credential
6. Modal shows counsellor profile + credential details
7. Downloads document to verify
8. Clicks "Approve" with optional notes
9. Status updates to "approved"
10. Counsellor sees "✓ Approved" in their upload page
```

---

## 🔄 Data Flow

```
Counsellor Flow:
/counsellor-dashboard (logged in)
  → Click "Complete Credentials"
  → /counsellor/complete-credentials
  → Upload files
  → POST /api/credentials (via credentialApi)
  → Database stores as 'pending'
  → See status "⏳ Pending"

Admin Flow:
/admin/users or /admin/feedback (logged in as admin)
  → Click "Credentials" in nav
  → /admin/credentials
  → GET /api/admin/credentials (via credentialApi)
  → See all credentials with stats
  → Click View on any credential
  → Modal opens
  → Click Approve/Reject
  → PATCH /api/credentials/:id
  → Status updates
```

---

## 📱 Mobile Access

All routes work on mobile:
- `/counsellor/complete-credentials` - Mobile upload form
- `/admin/credentials` - Mobile dashboard (responsive table)

---

## 🛡️ Security

### Who can access what:

| Route | Requires Auth | Requires Admin | Requires Counsellor |
|-------|--------------|----------------|-------------------|
| `/counsellor/complete-credentials` | ✅ | ❌ | ✅ |
| `/admin/credentials` | ✅ | ✅ | ❌ |

Protected by:
- ✅ `ProtectedRoute` - Checks authentication
- ✅ `RoleRoute` - Checks user type (counsellor/student)
- ✅ `AdminRoute` - Checks admin role from `user_roles` table

---

## API Endpoints (Internal)

These are called automatically by the UI:

```
GET /api/credentials/counsellor/:counsellorId
  → Get all credentials for a counsellor

POST /api/credentials/upload
  → Upload a new credential
  → Body: { counsellorId, type, file, issuerName, dates }

GET /api/admin/credentials?status=pending&type=license
  → Get credentials for admin review
  → Optional filters: status, type

PATCH /api/admin/credentials/:id/approve
  → Approve a credential
  → Body: { notes? }

PATCH /api/admin/credentials/:id/reject
  → Reject a credential
  → Body: { notes }
```

(These are handled by `credentialApi.ts`)

---

## 🔗 Navigation

### In Navbar/Menu
- Add link to `/admin/credentials` in admin section
- Counsellors already see `/counsellor/complete-credentials` in their dashboard

### Direct URLs
- Counsellor: `yoursite.com/counsellor/complete-credentials`
- Admin: `yoursite.com/admin/credentials`

---

## 🚀 Deployment

The routes work the same in:
- Local development (http://localhost:3000)
- Preview branches
- Production (yoursite.com)

---

## ✨ Key Points

1. **Credential Upload**: `/counsellor/complete-credentials`
   - Protected (counsellors only)
   - Drag-drop upload
   - Progress tracking

2. **Admin Review**: `/admin/credentials`
   - Protected (admin only)
   - Statistics dashboard
   - Approve/reject workflow
   - Document download

3. **Both routes**:
   - Mobile responsive
   - Production ready
   - Fully secured
   - Error handling included

---

## Quick Reference

| Page | URL | Who | Purpose |
|------|-----|-----|---------|
| Counsellor Upload | `/counsellor/complete-credentials` | Counsellors | Upload credentials |
| Admin Review | `/admin/credentials` | Admins | Review & approve |

That's it! Simple and straightforward.
