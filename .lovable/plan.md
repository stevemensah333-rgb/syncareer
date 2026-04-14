

## Plan: Admin Access Menu Item + Admin Role Management

### Problem
1. The "Admin?" footer link was removed, but there's no way for admins to reach the admin dashboard from the UI
2. Only one admin exists (Stephen Mensah), and there's no way to add more admins without direct database access

### Changes

#### 1. Add "Admin Dashboard" to account dropdown (`Navbar.tsx`)
- Add a `useEffect` that queries `user_roles` for the current user's admin role
- When `isAdmin` is true, show an "Admin Dashboard" menu item with a Shield icon in the avatar dropdown menu
- Links to `/admin/feedback`

#### 2. Add admin user management to the Users Dashboard (`UsersDashboard.tsx`)
- On the existing admin Users page, add a column or action to promote/demote users to admin
- This calls the `admin-users` Edge Function with a new `set_role` action
- Only existing admins can do this (protected by AdminRoute + passphrase)

#### 3. Update `admin-users` Edge Function
- Add a `set_role` action that inserts/deletes rows in `user_roles` for the `admin` role
- Uses service role key to bypass RLS

### How to access the admin dashboard after this change
1. Sign in with an admin account
2. Click your avatar (top right)
3. Click "Admin Dashboard"
4. Enter the passphrase on the admin page

### How to add another admin
1. Go to Admin Dashboard → Users
2. Find the user and click "Make Admin" (or "Remove Admin")

### Files modified
| File | Change |
|------|--------|
| `src/components/layout/Navbar.tsx` | Add admin menu item in dropdown |
| `src/pages/admin/UsersDashboard.tsx` | Add promote/demote admin action |
| `supabase/functions/admin-users/index.ts` | Add `set_role` action |

