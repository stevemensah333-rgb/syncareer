**Syncareer – AI-Powered Career Intelligence Platform**
**Overview**

Syncareer is an AI-powered career guidance platform designed to help African students discover personalized, actionable career pathways based on their skills, interests, and academic background.

The platform leverages AI to generate structured career recommendations, learning roadmaps, and next-step strategies tailored to each individual user.

**Problem Statement**

Across Africa, millions of students lack access to personalized career guidance. Traditional counseling systems are either unavailable, under-resourced, or not scalable.

Students often:

Choose careers based on guesswork

Lack exposure to emerging tech fields

Don’t know what skills to develop

Have no structured roadmap

This leads to underemployment and misaligned career paths.

**Solution**

Syncareer provides:

AI-generated personalized career recommendations

Structured skill development roadmaps

Required tools & certifications

Suggested learning platforms

Actionable next steps

The system transforms student inputs into structured career intelligence using AI-driven reasoning.

**Core Features**

Secure user authentication

Profile-based career analysis

AI-powered career recommendations

Structured JSON AI output parsing

Career roadmap generation

Email delivery of career reports

Saved reports dashboard

**Technical Architecture**

Frontend:

Next.js (React-based framework)

Backend:

API Routes (Node.js runtime)

Database:

PostgreSQL

AI Integration:

OpenAI API for structured career reasoning

Email Service:

Resend API

**System Flow**

User creates profile

Profile data is validated

Structured prompt is generated

OpenAI API processes request

JSON output is validated and parsed

Career report stored in database

Report displayed to user

Optional: Report emailed to user

**AI Implementation Strategy**

Syncareer uses structured prompt engineering to ensure consistent outputs.

The AI is instructed to:

Return structured JSON

Provide reasoning for recommendations

Generate actionable roadmaps

Avoid generic advice

Response validation is performed before rendering results to users.

AI coding assistants were used to accelerate development, debugging, and optimization, while core architecture and feature design were implemented by the developer.

**Project Structure**
syncareer/
│
├── app/
├── components/
├── lib/
├── prisma/
├── public/
├── docs/
├── .env.example
├── README.md
└── package.json

**Setup Instructions**

Clone the repository:

git clone https://github.com/stevemensah333-rgb/syncareer.git
cd syncareer


Install dependencies:

npm install

Create environment file:

cp .env.example .env.local


Add required keys:

OPENAI_API_KEY=
DATABASE_URL=
RESEND_API_KEY=


Run development server:

npm run dev

**Evaluation Criteria Alignment**

This project demonstrates:

Functional working prototype

Strong API integration

Structured AI architecture

Clean repository management

Production-style environment configuration

Clear documentation

**Future Improvements**

School-level analytics dashboard

Scholarship recommendation engine

Internship matching system

Multi-language support

AI interview preparation module
