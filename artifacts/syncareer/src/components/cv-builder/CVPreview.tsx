import React, { forwardRef } from 'react';
import type { CVData } from '@/pages/CVBuilder';

interface CVPreviewProps {
  data: CVData;
}

export const CVPreview = forwardRef<HTMLDivElement, CVPreviewProps>(({ data }, ref) => {
  const { personal, education, achievements, experience, projects, activities, skills, references } = data;

  return (
    <div 
      ref={ref}
      className="bg-white text-black p-8 w-full max-w-[210mm] mx-auto"
      style={{ 
        fontFamily: 'Times New Roman, serif',
        fontSize: '11pt',
        lineHeight: '1.3',
        minHeight: '297mm',
      }}
    >
      {/* Header - Name */}
      <div className="text-center mb-2">
        <h1 
          className="font-bold uppercase tracking-wide"
          style={{ fontSize: '16pt' }}
        >
          {personal.firstName || 'FIRSTNAME'} {personal.lastName || 'LAST NAME'}
        </h1>
      </div>

      {/* Contact Info */}
      <div className="text-center mb-4" style={{ fontSize: '10pt' }}>
        <p>
          {personal.phone || '+23300000000'} / {personal.nationality || 'Ghanaian'}
        </p>
        <p>
          {personal.email || 'email@gmail.com'} / {personal.schoolEmail || 'email@school.edu'}
        </p>
        {personal.linkedIn && (
          <p>{personal.linkedIn}</p>
        )}
      </div>

      {/* Education Section */}
      <div className="mb-4">
        <h2 className="font-bold border-b border-black mb-2 pb-0.5" style={{ fontSize: '12pt' }}>
          EDUCATION
        </h2>
        <div className="flex justify-between">
          <div>
            <p className="font-bold">{education.university || 'University Name'}, {education.location || 'Location'}</p>
            <p className="italic">{education.degree || 'Degree Program'}</p>
          </div>
        </div>
        <p>Expected Date of Graduation: {education.graduationDate || 'Month Year'}</p>
        <p>Cumulative GPA: {education.gpa || '0.00/4.00'}</p>
      </div>

      {/* Achievements Section */}
      {achievements.length > 0 && (
        <div className="mb-4">
          <h2 className="font-bold border-b border-black mb-2 pb-0.5" style={{ fontSize: '12pt' }}>
            ACHIEVEMENTS/AWARDS
          </h2>
          {achievements.map((achievement) => (
            <p key={achievement.id}>
              <span className="font-bold">{achievement.title}</span>
              {achievement.organization && `, ${achievement.organization}`}
              {achievement.date && `, ${achievement.date}`}
            </p>
          ))}
        </div>
      )}

      {/* Work Experience Section */}
      {experience.length > 0 && (
        <div className="mb-4">
          <h2 className="font-bold border-b border-black mb-2 pb-0.5" style={{ fontSize: '12pt' }}>
            WORK EXPERIENCE
          </h2>
          {experience.map((exp) => (
            <div key={exp.id} className="mb-3">
              <div className="flex justify-between">
                <p className="font-bold">{exp.company} – {exp.location}</p>
                <p>{exp.date}</p>
              </div>
              <p className="italic">{exp.role}</p>
              <ul className="list-disc ml-6">
                {exp.bullets.filter(b => b.trim()).map((bullet, i) => (
                  <li key={i}>{bullet}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Projects Section */}
      {projects.length > 0 && (
        <div className="mb-4">
          <h2 className="font-bold border-b border-black mb-2 pb-0.5" style={{ fontSize: '12pt' }}>
            PROJECT AND RESEARCH
          </h2>
          {projects.map((project) => (
            <div key={project.id} className="mb-3">
              <div className="flex justify-between">
                <p className="font-bold">{project.organization}</p>
                <p>{project.date}</p>
              </div>
              <p className="italic">{project.projectName} - {project.role}</p>
              <ul className="list-disc ml-6">
                {project.bullets.filter(b => b.trim()).map((bullet, i) => (
                  <li key={i}>{bullet}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Activities Section */}
      {activities.length > 0 && (
        <div className="mb-4">
          <h2 className="font-bold border-b border-black mb-2 pb-0.5" style={{ fontSize: '12pt' }}>
            CO-CURRICULAR ACTIVITIES
          </h2>
          {activities.map((activity) => (
            <div key={activity.id} className="mb-3">
              <div className="flex justify-between">
                <p className="font-bold">{activity.organization}, {activity.activity}</p>
                <p>{activity.date}</p>
              </div>
              <p className="italic">{activity.role}</p>
              <ul className="list-disc ml-6">
                {activity.bullets.filter(b => b.trim()).map((bullet, i) => (
                  <li key={i}>{bullet}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Skills Section */}
      {skills.length > 0 && (
        <div className="mb-4">
          <h2 className="font-bold border-b border-black mb-2 pb-0.5" style={{ fontSize: '12pt' }}>
            SKILLS
          </h2>
          <ul className="list-disc ml-6">
            {skills.map((skill, index) => (
              <li key={index}>{skill}</li>
            ))}
          </ul>
        </div>
      )}

      {/* References Section */}
      <div className="mb-4">
        <h2 className="font-bold border-b border-black mb-2 pb-0.5" style={{ fontSize: '12pt' }}>
          REFERENCES
        </h2>
        <p>{references || 'Available upon request'}</p>
      </div>
    </div>
  );
});

CVPreview.displayName = 'CVPreview';
