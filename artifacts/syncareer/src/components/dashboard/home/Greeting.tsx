import React from 'react';

interface GreetingProps {
  fullName?: string | null;
  major?: string | null;
  school?: string | null;
}

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function Greeting({ fullName, major, school }: GreetingProps) {
  const firstName = fullName?.trim().split(/\s+/)[0] ?? '';
  const time = getTimeOfDay();

  return (
    <div className="min-w-0">
      <p className="type-label">{firstName ? `${time}, ${firstName}` : time}</p>
      <h1 className="type-page-title mt-1">
        Application Desk
      </h1>
      {major && (
        <p className="mt-1 text-[13px] text-muted-foreground">
          {major}
          {school ? ` · ${school}` : ''}
        </p>
      )}
    </div>
  );
}

export default Greeting;
