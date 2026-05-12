# Counsellor Interface - Improvement Recommendations

## Current State Analysis

### What Exists
The counsellor interface has 3 main pages:
1. **Counsellor Dashboard** (`/counsellor-dashboard`) - Profile management, earnings, reviews, bookings
2. **Availability Management** (`/counsellor-availability`) - Calendar-based availability setup
3. **Sessions Manager** (`/counsellor-sessions`) - View and manage bookings

### Current Features
- Profile setup (bio, specialization, pricing, location, avatar)
- Earnings tracking (total earnings, completed/pending sessions)
- Client reviews and ratings
- Booking history
- Availability calendar (set working hours)
- Session management

---

## Issues & Gaps

### 🔴 CRITICAL GAPS

1. **No Session Communication/Messaging**
   - No way to message clients before/after sessions
   - No integrated meeting link management
   - No ability to send follow-up notes
   - Students can request counsellor but can't communicate

2. **No Client Management Dashboard**
   - Can't see historical client interactions
   - No client profiles or notes
   - No repeat client tracking
   - Can't personalize follow-ups

3. **No Income Analytics**
   - Earnings show only totals, no breakdown
   - No payment history
   - No monthly/weekly trends
   - No earning projections

4. **Limited Session Workflow**
   - Can't set meeting links/Zoom URLs
   - No pre-session preparation templates
   - No session notes/feedback capture
   - No post-session follow-up reminders

5. **No Rating/Review Management**
   - Can see reviews but can't respond
   - No review moderation
   - No way to improve based on feedback

---

## Recommended Improvements (Priority Order)

### TIER 1: Critical (Complete within 2 weeks)

#### 1.1 Session Communication System
**What**: Add messaging between counsellor and client

**Implementation**:
- Add messaging tab in CounsellorSessions
- Real-time chat component (reuse from AskCounsellorDialog if possible)
- Pre-meeting messaging (confirm, send meeting link)
- Post-meeting follow-up messages
- Message history per client

**User Benefit**: Counsellors can communicate directly without leaving app

**Effort**: Medium (requires new DB table: `counsellor_messages`)

---

#### 1.2 Meeting Link Management
**What**: Add ability to set and share video call links

**Implementation**:
- Add field to `counsellor_details` table: `meeting_platform` (Zoom, Google Meet, Teams, Custom)
- Add field: `meeting_link` or `meeting_link_template`
- Auto-generate meeting links per session (if using Zoom API)
- Show link in session details for counsellor
- Include link in client notifications
- Show link in confirmation emails

**User Benefit**: Seamless video session integration

**Effort**: Medium-High (requires API integration)

---

#### 1.3 Client Management - Client Profiles
**What**: Track and view all clients with history

**Implementation**:
- New page: `/counsellor-clients` 
- Show all clients who booked with counsellor
- Client card with: name, sessions count, last session, notes
- Add "notes" field to sessions table
- Tag system for client types (job-seeker, CV-builder, interview-prep, etc.)
- Quick add notes button from session view

**User Benefit**: Build relationships, personalize guidance

**Effort**: Low-Medium

---

### TIER 2: High Value (Complete within 4 weeks)

#### 2.1 Session Notes & Templates
**What**: Capture session outcomes and create follow-ups

**Implementation**:
- Add "Session Notes" form after session ends
- Template options:
  - CV Feedback Template
  - Interview Prep Feedback
  - Career Path Recommendations
  - Action Items for Client
- Save notes to database
- Auto-email notes to client
- Create follow-up tasks from notes

**User Benefit**: Better tracking, professional service

**Effort**: Medium

---

#### 2.2 Enhanced Income Analytics
**What**: Better earnings visibility

**Implementation**:
- Dashboard card with:
  - Monthly earnings chart (7-day, 30-day view)
  - Sessions per month trend
  - Average rating trend
  - Payment breakdown (pending, processed, scheduled)
- Export earnings report (CSV/PDF)
- Earnings goal setting
- Performance vs. targets comparison

**User Benefit**: Business insights, revenue tracking

**Effort**: Medium

---

#### 2.3 Review Response System
**What**: Let counsellors respond to reviews

**Implementation**:
- Add response field to reviews table
- Show review response UI in dashboard
- Email notification when new review received
- Response appears under review for clients to see
- Option to request review removal (flag system)

**User Benefit**: Build reputation, show responsiveness

**Effort**: Low

---

### TIER 3: Nice-to-Have (Complete within 8 weeks)

#### 3.1 Session Reminders & Automation
**What**: Auto-reminders and follow-ups

**Implementation**:
- Send reminder 24h before session to both counsellor and client
- Send confirmation request 12h before session
- Auto-send post-session feedback request to client
- Scheduler: "If no message sent 24h after session, send 'how did it go?' reminder"
- Auto-mark completed sessions

**User Benefit**: Reduce no-shows, improve completion

**Effort**: Medium

---

#### 3.2 Batch Operations for Availability
**What**: Easier availability management

**Implementation**:
- "Quick Set" buttons: "Unavailable for 1 week", "Busy next weekend"
- Recurring patterns: "Every Monday 9-5", "Weekends off"
- Copy availability from last week
- Bulk import from Google Calendar

**User Benefit**: Faster setup, less clicking

**Effort**: Low-Medium

---

#### 3.3 Performance Dashboard
**What**: Counsellor success metrics

**Implementation**:
- Client satisfaction score (avg rating)
- Session completion rate
- No-show rate
- Repeat client rate
- Referral tracking (how many came from existing clients)
- Recommended actions to improve metrics

**User Benefit**: Track success, improve business

**Effort**: Low

---

## Quick Wins (1-2 days)

1. **Add Zoom/Google Meet placeholder fields** to counsellor profile
2. **Add "Session Notes" textarea** in SessionsManager (simple comment field)
3. **Show total clients served** on dashboard (count unique bookings)
4. **Add "Last 5 reviews" section** more prominently
5. **Email template** for post-session follow-ups (text only, no automation yet)

---

## UI/UX Improvements (No new features, just better design)

### Dashboard Layout Issues
- **Current**: Too many cards, overwhelming
- **Better**: Tab-based layout:
  - Overview tab (top metrics)
  - Clients tab (client list)
  - Reviews tab (all reviews)
  - Earnings tab (detailed breakdown)

### Session Manager Issues
- **Current**: List only, hard to scan
- **Better**: 
  - Kanban board: "Pending" → "Confirmed" → "Completed" → "Cancelled"
  - Color coding by session status
  - Quick action buttons: "Send Link", "Add Notes", "Message Client"

### Availability Calendar
- **Current**: Works but no context about upcoming sessions
- **Better**: Overlay bookings on calendar to see busy times

---

## Database Schema Additions

### New Tables/Fields Needed

```sql
-- Add to counsellor_details
ALTER TABLE counsellor_details ADD COLUMN meeting_platform TEXT; -- 'zoom', 'google_meet', 'custom'
ALTER TABLE counsellor_details ADD COLUMN meeting_link TEXT; -- Zoom room link
ALTER TABLE counsellor_details ADD COLUMN bio_long TEXT; -- Detailed bio

-- New: counsellor_clients (cache/index table)
CREATE TABLE counsellor_clients (
  id UUID PRIMARY KEY,
  counsellor_id UUID REFERENCES counsellor_details,
  student_id UUID REFERENCES profiles,
  sessions_count INT,
  last_session_date TIMESTAMP,
  notes TEXT,
  tags TEXT[], -- JSON tags
  created_at TIMESTAMP,
  UNIQUE(counsellor_id, student_id)
);

-- Add to bookings/sessions table
ALTER TABLE counsellor_bookings ADD COLUMN session_notes TEXT;
ALTER TABLE counsellor_bookings ADD COLUMN client_notes TEXT;
ALTER TABLE counsellor_bookings ADD COLUMN meeting_link TEXT;

-- New: counsellor_messages
CREATE TABLE counsellor_messages (
  id UUID PRIMARY KEY,
  counsellor_id UUID,
  client_id UUID,
  booking_id UUID,
  message TEXT,
  sender_type TEXT, -- 'counsellor' or 'client'
  created_at TIMESTAMP,
  read_at TIMESTAMP
);

-- New: session_feedback
CREATE TABLE session_feedback (
  id UUID PRIMARY KEY,
  booking_id UUID,
  counsellor_id UUID,
  client_id UUID,
  feedback_text TEXT,
  action_items TEXT,
  follow_up_date DATE,
  created_at TIMESTAMP
);
```

---

## Summary Prioritization

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Messaging | High | Medium | 1 |
| Meeting Links | High | Medium-High | 2 |
| Client Profiles | Medium | Low-Medium | 3 |
| Session Notes | Medium | Medium | 4 |
| Advanced Analytics | Low | Medium | 5 |
| Review Responses | Low | Low | 6 |
| Reminders/Automation | Medium | Medium | 7 |
| Performance Dashboard | Low | Low | 8 |

---

## Recommended Roadmap

**Week 1-2**: Messaging + Meeting Links (Tier 1.1 & 1.2)
**Week 3-4**: Client Profiles + Session Notes (Tier 1.3 & 2.1)
**Week 5-6**: Analytics improvements (Tier 2.2 & 2.3)
**Week 7-8**: Automation & polish (Tier 3)

