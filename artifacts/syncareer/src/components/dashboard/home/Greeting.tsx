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
    <div className="flex flex-col gap-1">
      <h1 className="text-[22px] md:text-[26px] font-semibold tracking-[-0.02em] leading-tight text-foreground">
        {firstName ? (
          <>
            {time}, <span className="text-primary">{firstName}</span>
          </>
        ) : (
          <>{time}</>
        )}
      </h1>
      {major && (
        <p className="text-[13px] text-muted-foreground">
          {major}
          {school ? ` · ${school}` : ''}
        </p>
      )}
    </div>
  );
}

export default Greeting;
