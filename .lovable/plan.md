

# Adding Real Job Listings from Ghanaian Job Boards

## The Problem
Your `job_postings` table only has jobs posted by employers on Syncareer. Without external job data, the platform feels empty and theoretical.

## The Approach

There is no free, reliable API for Jobberman Ghana, BrightSpire, or LinkedIn. The practical solution is **web scraping via Firecrawl** + an edge function that runs on a schedule to populate your existing `job_postings` table with external listings.

### Architecture

```text
[Scheduled Cron] → [Edge Function: scrape-jobs]
                         │
                         ├── Firecrawl scrape Jobberman Ghana
                         ├── Firecrawl scrape BrightSpire
                         └── Parse & insert into job_postings table
                                (with source tracking)
```

## What Needs to Happen

### 1. Connect Firecrawl
Firecrawl is available as a connector. We need to link it to the project so the edge function can scrape job board pages. You'll be prompted to set up a Firecrawl account (free tier gives 500 credits/month — enough for daily scrapes of a few pages).

### 2. Database Changes
Add columns to `job_postings` to track external listings:
- `source` (text) — e.g. "jobberman", "brightspire", "syncareer"
- `source_url` (text) — link to the original posting
- `external_id` (text) — deduplicate on re-scrape
- `is_external` (boolean, default false) — distinguish from employer-posted jobs
- A system employer account to own external listings (since `employer_id` is required)

### 3. Edge Function: `scrape-jobs`
- Scrapes entry-level/graduate job pages from Jobberman Ghana and BrightSpire using Firecrawl
- Parses the scraped markdown/HTML to extract job title, location, company, description, requirements, skills
- Uses AI (Lovable AI Gateway) to structure messy scraped data into clean job records
- Inserts into `job_postings` with `is_external = true` and `source` set
- Deduplicates using `external_id` to avoid re-inserting the same jobs

### 4. Scheduled Cron Job
Run the scrape function daily using `pg_cron` + `pg_net` to keep listings fresh.

### 5. UI Updates
- `Markets.tsx`: Show source badge on external jobs (e.g. "via Jobberman")
- External jobs link to the original posting via `source_url`
- "Apply with Syncareer" stays for internal jobs; external jobs get "Apply on Jobberman" linking out

## Prerequisites Before Implementation

1. **Firecrawl connector** — needs to be connected first (you'll be prompted)
2. **Firecrawl has a free tier** (500 scrapes/month). Daily scrapes of 2-3 pages ≈ 60-90 credits/month — well within limits

## What You'll Get

- Fresh entry-level jobs from Ghanaian job boards appearing in your Opportunities tab daily
- CV Builder and Interview Simulator can reference real open positions
- Students have a reason to check the app every day
- Zero manual effort after setup — fully automated

Shall I proceed with this plan?

