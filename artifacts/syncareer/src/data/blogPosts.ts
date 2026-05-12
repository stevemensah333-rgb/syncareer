export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  category: string;
  content: string; // simple HTML
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "ats-cv-mistakes-african-graduates",
    title: "5 ATS CV Mistakes Costing African Graduates Interviews",
    description: "Most graduate CVs get rejected by Applicant Tracking Systems before a human ever reads them. Here's what to fix.",
    date: "2026-02-10",
    readTime: "6 min read",
    category: "CV & Resume",
    content: `
      <p>Over 75% of medium and large employers in Africa now use Applicant Tracking Systems (ATS) to filter CVs before a recruiter sees them. If your CV isn't ATS-friendly, you're invisible.</p>
      <h2>1. Using tables, columns, or text boxes</h2>
      <p>ATS parsers read top-to-bottom, left-to-right. Multi-column layouts scramble your information. Stick to a single-column layout.</p>
      <h2>2. Putting contact info in the header</h2>
      <p>Many ATS strip out the document header entirely. Place your name, email, and phone in the body of the document.</p>
      <h2>3. Saving as image-based PDF</h2>
      <p>Export from Word or Google Docs as a text-based PDF. Scanned or screenshot PDFs are unreadable to ATS.</p>
      <h2>4. Missing keywords from the job description</h2>
      <p>ATS rank CVs by keyword match. Mirror the language of the job posting — if they say "stakeholder management," don't write "client relations."</p>
      <h2>5. Creative fonts and graphics</h2>
      <p>Use Arial, Calibri, or Times New Roman. No icons, no photos, no charts. Save the design for your portfolio site.</p>
      <p><strong>Want this done for you?</strong> Syncareer's CV Builder generates ATS-optimized CVs scored against the job you're applying to.</p>
    `,
  },
  {
    slug: "riasec-career-assessment-explained",
    title: "What Is RIASEC? The Career Assessment Behind Smart Recommendations",
    description: "The science of matching personality to career — and why generic 'what should I be?' quizzes get it wrong.",
    date: "2026-02-12",
    readTime: "5 min read",
    category: "Career Assessment",
    content: `
      <p>RIASEC is a six-factor model developed by psychologist John Holland that maps personality to work environments. It powers the assessment used by Syncareer and most professional career counsellors worldwide.</p>
      <h2>The six types</h2>
      <ul>
        <li><strong>Realistic</strong> — practical, hands-on, tools and machines (engineers, technicians)</li>
        <li><strong>Investigative</strong> — analytical, scientific, problem-solving (researchers, data scientists)</li>
        <li><strong>Artistic</strong> — creative, expressive, unstructured (designers, writers)</li>
        <li><strong>Social</strong> — helping, teaching, serving others (teachers, counsellors, nurses)</li>
        <li><strong>Enterprising</strong> — leading, persuading, business (entrepreneurs, sales, managers)</li>
        <li><strong>Conventional</strong> — organized, detail-oriented, data (accountants, analysts)</li>
      </ul>
      <h2>Why your top three matter</h2>
      <p>Your three highest scores form your "Holland Code." Careers that align with all three predict higher job satisfaction and longer tenure than careers picked by salary or prestige alone.</p>
      <p>Take the free Syncareer assessment to find your code in 15 minutes.</p>
    `,
  },
  {
    slug: "interview-preparation-graduates",
    title: "How to Prepare for Your First Graduate Interview in Ghana",
    description: "A structured 7-day prep plan covering research, STAR answers, and the questions Ghanaian recruiters actually ask.",
    date: "2026-02-15",
    readTime: "8 min read",
    category: "Interviews",
    content: `
      <p>Your first graduate interview is rarely about technical knowledge — it's about communication, fit, and self-awareness. Here's a 7-day plan.</p>
      <h2>Day 1–2: Research the company</h2>
      <p>Read their website, LinkedIn, and last 3 months of news. Identify their values and a recent achievement you can reference.</p>
      <h2>Day 3–4: Master the STAR method</h2>
      <p><strong>S</strong>ituation, <strong>T</strong>ask, <strong>A</strong>ction, <strong>R</strong>esult. Prepare 5 stories that you can adapt to any behavioural question.</p>
      <h2>Day 5: Common questions</h2>
      <ul>
        <li>Tell me about yourself (90 seconds, present-past-future)</li>
        <li>Why this company?</li>
        <li>Tell me about a time you led without authority</li>
        <li>What's your biggest weakness? (one real one, plus how you address it)</li>
        <li>Where do you see yourself in 5 years?</li>
      </ul>
      <h2>Day 6: Mock interview</h2>
      <p>Practise with Syncareer's SynAssist voice simulator or a friend. Record yourself.</p>
      <h2>Day 7: Logistics</h2>
      <p>Confirm location/link, prepare two questions to ask, lay out your outfit, sleep early.</p>
    `,
  },
  {
    slug: "skills-vs-degree-2026",
    title: "Skills vs Degree: What African Employers Actually Hire For in 2026",
    description: "Companies are increasingly skill-first. Here's what to build alongside (or instead of) the certificate.",
    date: "2026-02-20",
    readTime: "5 min read",
    category: "Career Strategy",
    content: `
      <p>The "no experience required" graduate role is becoming rare. Employers in Ghana, Nigeria, Kenya, and South Africa increasingly screen for demonstrable skills before they look at the degree.</p>
      <h2>Skills that beat a generic degree</h2>
      <ul>
        <li><strong>Data literacy</strong> — Excel formulas, basic SQL, reading dashboards</li>
        <li><strong>Written communication</strong> — clear emails, structured reports</li>
        <li><strong>One technical specialty</strong> — Python, design tools, accounting software, content production</li>
        <li><strong>Project evidence</strong> — a portfolio link beats a transcript</li>
      </ul>
      <h2>How to build proof</h2>
      <p>Publish three small projects on a public portfolio. Volunteer for a real organization. Take a recognized certification (Google, Meta, AWS, ALX). Write about what you learned.</p>
      <p>Your degree gets you the interview. Your skills get you the offer.</p>
    `,
  },
  {
    slug: "first-90-days-graduate-job",
    title: "Your First 90 Days in a Graduate Job: A Survival Guide",
    description: "How to make a great first impression, learn fast, and avoid the mistakes that derail new hires.",
    date: "2026-02-25",
    readTime: "7 min read",
    category: "Career Growth",
    content: `
      <p>The first 90 days set the tone for your entire tenure. Here's how to start strong.</p>
      <h2>Days 1–30: Listen and learn</h2>
      <p>Meet everyone you can. Take notes. Ask "how does this team measure success?" Resist the urge to suggest changes — earn the right first.</p>
      <h2>Days 31–60: Deliver one visible win</h2>
      <p>Find a small problem nobody owns and solve it. Document it. Share it with your manager.</p>
      <h2>Days 61–90: Build your reputation</h2>
      <p>Be the person who replies fast, meets deadlines, and never has to be reminded twice. Boring? Yes. Career-defining? Also yes.</p>
      <h2>Things that quietly kill careers</h2>
      <ul>
        <li>Showing up late to virtual meetings</li>
        <li>Not asking questions when stuck (then missing the deadline)</li>
        <li>Gossiping about colleagues</li>
        <li>Treating your manager as your only relationship in the company</li>
      </ul>
      <p>The graduates who get promoted in year two are the ones who treated year one as an apprenticeship, not a destination.</p>
    `,
  },
];
