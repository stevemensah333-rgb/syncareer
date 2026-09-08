import React, { forwardRef } from 'react';
import type { CVData } from '@/features/cv-builder/types';

interface CVPreviewProps {
  data: CVData;
}

/**
 * Print-faithful, deliberately dense one-page CV. Section wrappers carry
 * `data-cv-section` so the live editor can scroll the page to whatever the
 * user is currently editing.
 */
const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <div className="font-bold uppercase border-b border-black mb-1 pb-[1px]" style={{ fontSize: '11pt' }}>
    {children}
  </div>
);

const Bullets = ({ items }: { items: string[] }) => {
  const filled = items.filter((item) => item.trim());
  if (filled.length === 0) return null;
  return (
    <ul className="list-disc ml-4">
      {filled.map((bullet, index) => (
        <li key={index} className="pl-0">{bullet}</li>
      ))}
    </ul>
  );
};

export const CVPreview = forwardRef<HTMLDivElement, CVPreviewProps>(({ data }, ref) => {
  const { personal, education, achievements, experience, projects, activities, skills, references } = data;

  return (
    <div
      ref={ref}
      className="bg-white text-black w-full max-w-[210mm] mx-auto"
      style={{
        fontFamily: 'Times New Roman, serif',
        fontSize: '10pt',
        lineHeight: '1.22',
        minHeight: '297mm',
        padding: '12mm 13mm',
      }}
    >
      <header data-cv-section="personal" className="text-center mb-2">
        <div className="font-bold uppercase tracking-wide" style={{ fontSize: '15pt', lineHeight: 1.1 }}>
          {personal.firstName || 'FIRSTNAME'} {personal.lastName || 'LAST NAME'}
        </div>
        <div style={{ fontSize: '9.5pt' }}>
          <p>
            {personal.phone || '+23300000000'}
            {personal.nationality ? ` / ${personal.nationality}` : ''}
          </p>
          <p className="underline">
            {personal.email || 'email@gmail.com'}
            {personal.schoolEmail ? ` / ${personal.schoolEmail}` : ''}
          </p>
          {personal.linkedIn && <p className="underline">{personal.linkedIn}</p>}
        </div>
      </header>

      <section data-cv-section="education" className="mb-2">
        <SectionHeading>Education</SectionHeading>
        <div className="flex justify-between gap-4">
          <p className="font-bold">{education.university || 'University Name'}</p>
          <p className="font-bold whitespace-nowrap">{education.location || 'Location'}</p>
        </div>
        <div className="flex justify-between gap-4">
          <p className="font-bold">{education.degree || 'Degree Program'}</p>
          <p className="font-bold whitespace-nowrap">{education.graduationDate || 'Month Year'}</p>
        </div>
        {education.gpa && <p>Cumulative GPA: {education.gpa}</p>}
      </section>

      {achievements.length > 0 && (
        <section data-cv-section="achievements" className="mb-2">
          <SectionHeading>Achievements/Awards</SectionHeading>
          {achievements.map((achievement) => (
            <div key={achievement.id} className="flex justify-between gap-4">
              <p>
                <span className="font-bold">{achievement.title}</span>
                {achievement.organization && `, ${achievement.organization}`}
              </p>
              {achievement.date && <p className="font-bold whitespace-nowrap">{achievement.date}</p>}
            </div>
          ))}
        </section>
      )}

      {experience.length > 0 && (
        <section data-cv-section="experience" className="mb-2">
          <SectionHeading>Work Experience</SectionHeading>
          {experience.map((exp) => (
            <div key={exp.id} className="mb-1.5 last:mb-0">
              <div className="flex justify-between gap-4">
                <p className="font-bold">
                  {exp.company}
                  {exp.location && <span className="font-normal"> - {exp.location}</span>}
                </p>
                <p className="font-bold whitespace-nowrap">{exp.date}</p>
              </div>
              <p className="font-bold">{exp.role}</p>
              <Bullets items={exp.bullets} />
            </div>
          ))}
        </section>
      )}

      {projects.length > 0 && (
        <section data-cv-section="projects" className="mb-2">
          <SectionHeading>Project and Research</SectionHeading>
          {projects.map((project) => (
            <div key={project.id} className="mb-1.5 last:mb-0">
              <div className="flex justify-between gap-4">
                <p className="font-bold">{project.projectName || project.organization}</p>
                <p className="font-bold whitespace-nowrap">{project.date}</p>
              </div>
              <p className="font-bold">{project.role}</p>
              <Bullets items={project.bullets} />
            </div>
          ))}
        </section>
      )}

      {activities.length > 0 && (
        <section data-cv-section="activities" className="mb-2">
          <SectionHeading>Co-curricular Activities</SectionHeading>
          {activities.map((activity) => (
            <div key={activity.id} className="mb-1.5 last:mb-0">
              <div className="flex justify-between gap-4">
                <p className="font-bold">
                  {activity.organization}
                  {activity.activity && `, ${activity.activity}`}
                </p>
                <p className="font-bold whitespace-nowrap">{activity.date}</p>
              </div>
              <p className="font-bold">{activity.role}</p>
              <Bullets items={activity.bullets} />
            </div>
          ))}
        </section>
      )}

      {skills.length > 0 && (
        <section data-cv-section="skills" className="mb-2">
          <SectionHeading>Skills</SectionHeading>
          <Bullets items={skills} />
        </section>
      )}

      <section data-cv-section="references">
        <SectionHeading>References</SectionHeading>
        <p>{references || 'Available upon request'}</p>
      </section>
    </div>
  );
});

CVPreview.displayName = 'CVPreview';
