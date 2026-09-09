import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  category: string;
  publishedAt: string;
  readingTime: string;
  keywords: string[];
  cta: { label: string; href: string };
}

export interface BlogPost extends BlogPostMeta {
  content: ReactNode;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'how-to-write-a-cv-that-gets-read',
    title: 'How to write a CV that gets read',
    description:
      'A practical guide to writing a CV that passes screening and reaches a human. Structure, bullet points, and what to leave out — written for students and recent graduates with limited experience.',
    category: 'CV and applications',
    publishedAt: '2026-09-08',
    readingTime: '4 min read',
    keywords: ['how to write a cv', 'cv for job application', 'cv examples', 'cv template'],
    cta: { label: 'Try the CV Builder', href: '/cv-builder' },
    content: (
      <>
        <p>
          Most CVs never reach a human. They are parsed by software that extracts text, sorts it
          into fields, and ranks candidates before anyone reads a word. A CV that is hard to parse
          — columns, graphics, images, tables — can be silently discarded. The goal is not to look
          impressive on paper. It is to be read.
        </p>

        <h2>What a CV is actually for</h2>
        <p>
          A CV is not your life story. It is a structured answer to one question: can this person
          do the job? Everything on the page should help a recruiter or hiring manager answer that
          question in under thirty seconds. If a section does not serve that question, it is
          taking space from something that does.
        </p>

        <h2>The structure that works</h2>
        <p>
          Use a single column. Reading order should be top-to-bottom, left-to-right. The standard
          sections for a recent graduate are:
        </p>
        <ul>
          <li><strong>Contact</strong> — full name, phone, email, and one link (LinkedIn, GitHub, or portfolio). No photo, no full address.</li>
          <li><strong>Summary</strong> — two lines stating what you do and what you are looking for. Skip it if you cannot fill it with something specific.</li>
          <li><strong>Experience</strong> — roles in reverse chronological order. Each entry has a title, organisation, dates, and bullet points.</li>
          <li><strong>Education</strong> — degree, institution, and dates. Include relevant coursework, projects, or honours only if they are specific.</li>
          <li><strong>Skills</strong> — listed clearly, grouped if there are many. Skills are read, not admired — commas are fine.</li>
        </ul>

        <h2>Writing bullet points that prove impact</h2>
        <p>
          A weak bullet point describes a task. A strong one describes a result. The difference is
          measurable.
        </p>
        <p>Compare these two:</p>
        <ul>
          <li><em>Weak:</em> "Responsible for social media accounts."</li>
          <li><strong>Strong:</strong> "Grew the organisation's Instagram following from 400 to 2,100 over six months by posting three times weekly."</li>
        </ul>
        <p>
          Start with an action verb. Include a number when you can — followers, respondents, hours,
          budget, percentage. If you cannot quantify, describe the scope: "the only student
          selected from 80 applicants" or "led a team of five." What matters is that the reader can
          picture what you did.
        </p>

        <h2>The one-page discipline</h2>
        <p>
          If you are a student or recent graduate, one page is enough. Two pages of thin content
          signals that you cannot prioritise. If you are struggling to fill one page, add detail to
          the experience you do have rather than adding sections that do not serve the role.
        </p>

        <h2>What to leave out</h2>
        <ul>
          <li>Photos — they are not read and can introduce bias.</li>
          <li>Full address — city and country are enough.</li>
          <li>References — available on request, not listed.</li>
          <li>Graphics, icons, or progress bars for skills — they are not parsed and they take space.</li>
          <li>Every job you have ever had — include what is relevant.</li>
        </ul>

        <h2>How Syncareer helps</h2>
        <p>
          Syncareer's <Link to="/cv-builder">CV Builder</Link> uses an ATS-friendly template —
          single column, clean typography, parsed easily by screening software. The live preview
          shows what a recruiter will see as you type, and a strength score flags missing
          elements: bullet points without numbers, a summary that says nothing, skills that are
          too vague. You can export to PDF in one page, ready to submit.
        </p>
        <p>
          The point is not to produce a beautiful document. It is to produce one that gets read.
        </p>
      </>
    ),
  },
  {
    slug: 'how-to-prepare-for-a-job-interview',
    title: 'How to prepare for a job interview without memorising answers',
    description:
      'A practical guide to interview preparation: researching the role, structuring answers with STAR, practicing with questions you will actually face, and talking about limited experience honestly.',
    category: 'Interviews',
    publishedAt: '2026-09-08',
    readingTime: '5 min read',
    keywords: ['how to prepare for an interview', 'interview tips', 'job interview questions and answers', 'interview preparation'],
    cta: { label: 'Try the Interview Simulator', href: '/interview-simulator' },
    content: (
      <>
        <p>
          Interview preparation is not memorisation. If you memorise answers, you will sound
          rehearsed and fall apart when the question changes. The goal is to walk in knowing what
          the role asks for, what you can point to in your own experience, and how to structure
          what you say so it is clear and complete.
        </p>

        <h2>Research the company and the role</h2>
        <p>
          Read the job description carefully. What are the three things the role actually requires?
          Those are the questions you will be asked — rephrased, combined, or disguised. For each
          requirement, identify something from your experience that demonstrates it.
        </p>
        <p>
          Look at the company's website, but also their recent news, their products, and their
          competitors. You do not need to know everything. You need to know enough to explain why
          this company and this role — not just any job.
        </p>

        <h2>Structure your answers with STAR</h2>
        <p>
          Behavioral questions ask about past situations: "Tell me about a time you faced a
          challenge." The STAR framework keeps your answer complete without rambling:
        </p>
        <ul>
          <li><strong>Situation</strong> — set the context in one or two sentences.</li>
          <li><strong>Task</strong> — what was your responsibility in that situation?</li>
          <li><strong>Action</strong> — what did you do? Be specific. "We" is not an answer; "I" is.</li>
          <li><strong>Result</strong> — what happened? Use numbers when possible.</li>
        </ul>
        <p>
          Prepare five or six stories from your experience that cover different skills: a
          challenge, a mistake, a collaboration, a leadership moment, a success. You can adapt
          these to most behavioral questions.
        </p>

        <h2>Practice with questions you will actually face</h2>
        <p>
          Generic interview question lists are everywhere. They are also generic. A marketing
          role asks different questions than a data analyst role. A graduate programme asks
          different questions than a technical interview.
        </p>
        <p>
          Practice with questions tied to the role you are applying for. If you have a saved
          opportunity or an application in progress, use its requirements to guide what you
          practice. The best preparation is answering the specific questions this role will ask,
          not the most popular questions on a list.
        </p>

        <h2>Talking about limited experience</h2>
        <p>
          If you are a student or recent graduate, you may feel you have nothing to say. You do.
          Coursework, group projects, internships, volunteer work, part-time jobs, and
          extracurricular activities all count. The interviewer knows you are early in your
          career — they are looking for potential, self-awareness, and the ability to learn, not
          ten years of experience.
        </p>
        <p>
          Be honest. If you do not know something, say so and describe how you would learn it. An
          honest "I have not worked with that tool, but I learned Python in university and could
          pick it up" is stronger than a bluff that falls apart under a follow-up question.
        </p>

        <h2>How Syncareer helps</h2>
        <p>
          Syncareer's <Link to="/interview-simulator">Interview Simulator</Link> asks
          role-specific questions based on the opportunity you are applying for, not a generic
          list. You answer, and the feedback tells you what was strong, what was missing, and
          what to improve — structured, specific, and tied to the role's requirements. You can
          practice as many times as you need, and each session is grounded in your actual
          application.
        </p>
        <p>
          The goal is not to walk in with memorised lines. It is to walk in having already
          answered the questions that matter.
        </p>
      </>
    ),
  },
  {
    slug: 'where-to-find-entry-level-jobs',
    title: 'Where to find real entry-level jobs as a recent graduate',
    description:
      'Big job boards are overwhelming and full of recycled postings. Here is how to find real entry-level opportunities, organise your search, and connect what employers ask for to what you can prove.',
    category: 'Job search',
    publishedAt: '2026-09-08',
    readingTime: '4 min read',
    keywords: ['entry level jobs', 'entry level jobs for graduates', 'jobs for recent graduates', 'entry level positions'],
    cta: { label: 'Explore opportunities', href: '/opportunities' },
    content: (
      <>
        <p>
          The hardest part of a job search is not finding postings — there are thousands. It is
          finding the right ones, understanding what they actually ask for, and keeping track of
          what you have applied to. Most graduates scatter applications across a dozen job boards
          and lose track of what they sent, where, and what the employer asked for.
        </p>

        <h2>The problem with big job boards</h2>
        <p>
          Large job boards have volume, but also noise. Postings are recycled, stale, or
          duplicated across sites. The same role appears five times under different titles. Some
          have already been filled. Others were never real — they are lead-generation pages
          collecting resumes. You can spend hours scrolling and apply to nothing that moves you
          forward.
        </p>

        <h2>Better sources</h2>
        <ul>
          <li>
            <strong>Company career pages</strong> — the most reliable source. If you know which
            companies hire graduates in your field, go to their websites. The posting is real,
            current, and specific.
          </li>
          <li>
            <strong>University career offices</strong> — many universities maintain job boards or
            employer partnerships that are not listed publicly. These are often less competitive
            because the applicant pool is smaller.
          </li>
          <li>
            <strong>Alumni networks</strong> — a graduate from your university who works at a
            company you are interested in can tell you whether they are hiring and what the role
            actually involves. LinkedIn is the simplest way to find them.
          </li>
          <li>
            <strong>Professional networks</strong> — industry-specific groups on LinkedIn,
            WhatsApp, or Telegram often share openings before they reach job boards.
          </li>
          <li>
            <strong>Aggregated listings</strong> — a curated feed that pulls from real sources,
            removes duplicates, and shows the original posting link so you can verify it.
          </li>
        </ul>

        <h2>Organise your search</h2>
        <p>
          The difference between a productive search and a scattered one is organisation. For
          each opportunity you find, you should know:
        </p>
        <ul>
          <li>What the role asks for — the actual requirements, not just the title.</li>
          <li>Where you found it and the original source link.</li>
          <li>What stage you are at — saved, preparing, applied, interviewed, offered, closed.</li>
          <li>What evidence you have that matches the requirements.</li>
        </ul>
        <p>
          Without this, you will forget what you applied to, miss deadlines, and fail to prepare
          for interviews because you cannot remember what the role asked for.
        </p>

        <h2>Connect requirements to evidence</h2>
        <p>
          The strongest applications are not the ones that list the most skills. They are the
          ones that connect each requirement to something specific you can point to. "Excellent
          communication skills" in a posting is not answered by writing "excellent communication
          skills" on your CV. It is answered by describing a time you communicated clearly — a
          presentation, a report, a project where you coordinated with a team.
        </p>
        <p>
          When you save an opportunity, read its requirements. For each one, identify evidence
          from your experience that supports it. If you cannot find evidence for a requirement,
          that is a gap — and gaps are where you focus your preparation.
        </p>

        <h2>How Syncareer helps</h2>
        <p>
          Syncareer's <Link to="/opportunities">Opportunities</Link> page aggregates real external
          listings from multiple sources and keeps the original posting link, so you can verify
          every opportunity before you apply. When you save one, its requirements are connected
          to your profile, CV, and evidence — so you can see exactly what you can prove and
          where the gaps are. Your applications are tracked in one place, with their status and
          next steps, so nothing falls through.
        </p>
        <p>
          The search is not about volume. It is about finding the right opportunity and preparing
          a response you can stand behind.
        </p>
      </>
    ),
  },
];

export const BLOG_POST_METAS: BlogPostMeta[] = BLOG_POSTS.map(
  ({ content: _content, ...meta }) => meta,
);

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}

export function getRelatedPosts(slug: string, limit = 2): BlogPostMeta[] {
  return BLOG_POST_METAS.filter((post) => post.slug !== slug).slice(0, limit);
}
