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
  {
    slug: 'how-to-tailor-your-cv-to-a-job-posting',
    title: 'How to tailor your CV to a specific job posting',
    description:
      'A step-by-step method for turning a job posting into a list of requirements, matching each one to evidence you already have, and adjusting your CV without rewriting it from scratch.',
    category: 'CV and applications',
    publishedAt: '2026-09-09',
    readingTime: '5 min read',
    keywords: [
      'tailor cv to job description',
      'how to match cv to job posting',
      'cv keywords job application',
      'customise cv for each job',
    ],
    cta: { label: 'Open the CV Builder', href: '/cv-builder' },
    content: (
      <>
        <p>
          Sending the same CV to every opening is the fastest way to be filtered out. But
          rewriting it from scratch for each application is not realistic either. The workable
          middle is a tailoring pass: keep one strong base CV, then adjust a small number of
          things for each posting.
        </p>

        <h2>Step one: turn the posting into a list of requirements</h2>
        <p>
          Read the job description and write out every requirement as its own line. Most postings
          mix them together, so separate them:
        </p>
        <ul>
          <li><strong>Hard requirements</strong> — a degree, a certification, a specific tool, years of experience.</li>
          <li><strong>Skills</strong> — the things you must be able to do, named directly ("data analysis", "customer support", "report writing").</li>
          <li><strong>Behaviours</strong> — phrases like "works independently", "comfortable with deadlines", "communicates with non-technical teams".</li>
        </ul>
        <p>
          A typical posting yields eight to fifteen lines. That list, not the posting, is what you
          are answering.
        </p>

        <h2>Step two: match each requirement to evidence</h2>
        <p>
          Next to each requirement, write the single strongest thing you can point to. Evidence is
          something that happened: a project, a role, a course with a graded output, a volunteer
          position, a competition. "I am a good communicator" is not evidence. "Presented weekly
          progress updates to a supervisor and two external partners for a four-month project" is.
        </p>
        <p>
          You will end up with three groups: requirements you can prove well, requirements you can
          prove weakly, and requirements you cannot prove at all. That map is more useful than the
          CV itself, because it tells you what to write, what to strengthen, and what you will be
          asked about in the interview.
        </p>

        <h2>Step three: adjust, do not rewrite</h2>
        <p>Four changes usually cover it:</p>
        <ul>
          <li><strong>Reorder.</strong> Move the experience entries that match the posting to the top of their section.</li>
          <li><strong>Rewrite two or three bullets.</strong> Use the posting's own words where they are honest. If it asks for "stakeholder reporting", and that is what you did, say "stakeholder reporting" rather than "talked to people about progress".</li>
          <li><strong>Prune.</strong> Cut bullets that answer nothing on your requirement list. Space is the scarce resource.</li>
          <li><strong>Update the summary.</strong> Two lines naming the role you are applying for and the two strongest things you bring to it.</li>
        </ul>
        <p>
          What you should not do is invent. Claiming a tool you have never opened is the one
          mistake that ends the process at the interview instead of before it.
        </p>

        <h2>On keywords, honestly</h2>
        <p>
          Screening software does look for terms from the posting. But keyword stuffing — a wall of
          technologies you have not used — reads badly to the human who opens the file next. Use the
          posting's vocabulary where it accurately describes what you did, and nowhere else.
        </p>

        <h2>What to do with the gaps</h2>
        <p>
          A gap does not disqualify you. Most entry-level candidates meet perhaps two thirds of a
          posting's requirements. Decide which gaps are closeable before you apply — a short course,
          a small project, a certificate — and which you will simply address directly if asked:
          "I have not used that tool, but here is the closest thing I have done, and here is how I
          learned the last tool I picked up."
        </p>

        <h2>How Syncareer helps</h2>
        <p>
          When you save an opportunity in{' '}
          <Link to="/opportunities">Opportunities</Link>, Syncareer breaks the posting into
          requirements and connects them to the evidence on your profile, so the match and the gaps
          are visible in one place instead of living in your head. From there the{' '}
          <Link to="/cv-builder">CV Builder</Link> keeps your base CV intact while you adjust the
          bullets that matter for that specific application, with a live preview of the page a
          recruiter will actually open.
        </p>
      </>
    ),
  },
  {
    slug: 'what-to-do-after-you-apply-for-a-job',
    title: 'What to do after you apply for a job',
    description:
      'Most candidates stop at submit. A practical guide to tracking applications, following up without being a nuisance, preparing before you are invited, and learning from rejection.',
    category: 'Job search',
    publishedAt: '2026-09-09',
    readingTime: '4 min read',
    keywords: [
      'after applying for a job',
      'how to follow up on a job application',
      'track job applications',
      'job application follow up email',
    ],
    cta: { label: 'Track your applications', href: '/applications' },
    content: (
      <>
        <p>
          Applying is the easy part. The candidates who get offers are usually not the ones who
          applied to the most places — they are the ones who kept track of where they applied,
          prepared before they were invited, and learned something from each outcome.
        </p>

        <h2>Record the application while it is fresh</h2>
        <p>For every application, keep four things:</p>
        <ul>
          <li>The link to the original posting, and a copy of the description. Postings are taken down, and you will need the requirements again before the interview.</li>
          <li>The exact version of the CV you sent.</li>
          <li>The date you applied and any deadline mentioned.</li>
          <li>The contact person or channel, if there was one.</li>
        </ul>
        <p>
          If you cannot answer "what did I actually send them?" two weeks later, you cannot prepare
          for the call when it comes.
        </p>

        <h2>Follow up once, at the right time</h2>
        <p>
          If the posting gave a decision date, wait until it passes. If it did not, wait seven to
          ten working days. Then send one short message — four or five sentences: who you are, the
          role and the date you applied, one line on why you are a fit, and a polite request for an
          update. Do not attach your CV again. Do not follow up weekly.
        </p>
        <p>
          One well-timed follow-up is professional. Three is a reason to stop reading.
        </p>

        <h2>Prepare before you are invited, not after</h2>
        <p>
          Interview invitations often arrive with two or three days' notice, and sometimes less.
          The preparation you do in that window is rushed. The preparation you do in the quiet
          period after applying is not.
        </p>
        <p>
          Pick your three or four strongest applications and, for each one, write out answers to
          the obvious questions from that posting's requirements. Practise saying them out loud.
          By the time the invitation arrives, you are revising rather than starting.
        </p>

        <h2>Treat rejection as information</h2>
        <p>
          Most rejections come with no explanation, and asking rarely produces a real answer. What
          you can do is look at your own record. If you are applying and hearing nothing, the
          problem is usually the CV or the fit of the roles you are choosing. If you are reaching
          interviews and stopping there, the problem is how you talk about your experience. Those
          are two different fixes, and you can only tell them apart if you are tracking outcomes.
        </p>

        <h2>Know when to stop waiting</h2>
        <p>
          Silence after three weeks and one follow-up is an answer. Mark it closed and put the
          energy into the next application. Keeping a dead application open is how a search stalls.
        </p>

        <h2>How Syncareer helps</h2>
        <p>
          Syncareer keeps each application in one place: the original posting, its requirements,
          the CV you sent, the stage it is at, and the next action. When an interview is scheduled,
          the requirements from that specific posting feed your practice in the{' '}
          <Link to="/interview-simulator">Interview Simulator</Link>, so you are preparing for that
          role rather than for interviews in general.
        </p>
      </>
    ),
  },
  {
    slug: 'finding-entry-level-jobs-in-ghana',
    title: 'Finding entry-level jobs in Ghana as a recent graduate',
    description:
      'Where entry-level roles are actually advertised in Ghana, how National Service fits into a job search, what employers ask of graduates, and how to build a search that does not depend on luck.',
    category: 'Job search',
    publishedAt: '2026-09-09',
    readingTime: '6 min read',
    keywords: [
      'entry level jobs in ghana',
      'graduate jobs ghana',
      'jobs for national service personnel',
      'how to find a job in ghana after university',
    ],
    cta: { label: 'Browse opportunities', href: '/opportunities' },
    content: (
      <>
        <p>
          A Ghanaian graduate job search has a shape of its own: National Service sits between
          university and full employment, a large share of hiring happens through people rather
          than postings, and the roles that are advertised attract very high volumes of applicants.
          Understanding that shape is more useful than any list of websites.
        </p>

        <h2>Where roles are actually advertised</h2>
        <ul>
          <li><strong>Job boards.</strong> Jobberman Ghana, Ghanajob, and similar boards carry the bulk of publicly advertised roles. Useful, but every posting is seen by thousands.</li>
          <li><strong>Company career pages.</strong> Banks, telecoms, FMCG companies, and the larger NGOs post graduate schemes and internships on their own sites, often before or instead of a board.</li>
          <li><strong>LinkedIn.</strong> Increasingly where Accra-based professional roles are posted, and where recruiters look. A complete profile matters more here than in most markets, because it is often the only thing a recruiter sees before deciding to contact you.</li>
          <li><strong>Development organisations and donor programmes.</strong> Their roles are advertised on their own sites and on sector-specific boards, and they hire graduates for research, monitoring, and coordination positions.</li>
          <li><strong>University career offices and departmental noticeboards.</strong> Underused. Employers who want graduates from a specific programme frequently go straight to the department.</li>
        </ul>

        <h2>National Service is part of the search, not a pause in it</h2>
        <p>
          Your service posting is a year of real work experience and, in many cases, the strongest
          route to your first permanent role — organisations retain service personnel they already
          trust. Treat it accordingly:
        </p>
        <ul>
          <li>Ask for work beyond your assigned tasks, and keep a record of what you delivered.</li>
          <li>Write down numbers as they happen — files processed, sessions run, reports produced. You will not remember them in eleven months.</li>
          <li>Raise the question of retention before your final quarter, not after it.</li>
          <li>Leave with a reference in writing from someone who saw your work.</li>
        </ul>

        <h2>Referrals are not cheating</h2>
        <p>
          A large share of roles are filled through someone who already knows the candidate. This
          is not something to resent; it is something to participate in honestly. Lecturers, your
          service supervisor, alumni from your department, and people two or three years ahead of
          you are all reachable. A short, specific message — who you are, what you studied, what
          kind of role you are looking for, and one concrete question — gets replies. A generic
          "please help me find a job" does not.
        </p>

        <h2>What Ghanaian employers ask graduates for</h2>
        <p>
          Across sectors, the same requirements recur: a first degree in a named field, National
          Service completion, comfort with Excel and basic reporting, clear written English, and
          evidence that you can work without close supervision. Where candidates lose out is
          usually not the degree — it is the last two. Anything that demonstrates independent work
          with a visible output carries weight: a research project, a small business, a data
          analysis you did for a department, a community programme you ran.
        </p>

        <h2>Build a search you can sustain</h2>
        <p>
          Applying to eighty roles in a week produces eighty generic applications and no interviews.
          A better rhythm is five to eight applications a week, each one tailored, each one
          recorded, with a follow-up scheduled. That is sustainable for months, and months is
          realistically what the first search takes.
        </p>
        <p>
          Two habits make the difference: apply within the first few days of a posting appearing,
          and verify every listing against the employer's own site or page before you send anything
          personal. Recruitment scams that ask for a "processing fee", "training fee", or bank
          details are common in this market. A legitimate employer never asks you to pay to be
          considered.
        </p>

        <h2>How Syncareer helps</h2>
        <p>
          Syncareer's <Link to="/opportunities">Opportunities</Link> page aggregates listings from
          multiple external sources and keeps the original link on every one, so you can verify a
          posting at its source before you apply. Saving an opportunity connects its requirements
          to your profile and CV, so you can see what you can already prove and what you need to
          build — and your applications stay tracked in one place instead of across a notebook,
          your inbox, and memory.
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
