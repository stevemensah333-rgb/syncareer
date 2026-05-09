import React from 'react';

interface SkeletonCardProps {
  className?: string;
  variant?: 'card' | 'chart' | 'list' | 'text';
  lines?: number;
}

const SkeletonLine: React.FC<{ width?: string; height?: string; className?: string }> = ({
  width = 'w-full',
  height = 'h-4',
  className = '',
}) => (
  <div className={`${width} ${height} bg-muted rounded animate-pulse ${className}`} />
);

/**
 * Skeleton loader component for displaying loading states
 */
export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  className = '',
  variant = 'card',
  lines = 3,
}) => {
  if (variant === 'chart') {
    return (
      <div className={`${className} p-6 bg-background rounded-lg border border-border`}>
        <SkeletonLine width="w-1/3" height="h-6" className="mb-4" />
        <div className="space-y-2 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonLine key={i} width={`w-${[2, 3, 4][i % 3]}/5`} height="h-3" />
          ))}
        </div>
        <div className="h-48 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className={`${className} space-y-3`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="p-4 bg-background rounded-lg border border-border space-y-2">
            <SkeletonLine width="w-2/3" height="h-4" />
            <SkeletonLine width="w-1/2" height="h-3" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className={`${className} space-y-2`}>
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonLine key={i} width={i === lines - 1 ? 'w-4/5' : 'w-full'} height="h-3" />
        ))}
      </div>
    );
  }

  // Default card variant
  return (
    <div className={`${className} p-6 bg-background rounded-lg border border-border space-y-4`}>
      <SkeletonLine width="w-2/5" height="h-6" />
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonLine key={i} width={i === lines - 1 ? 'w-4/5' : 'w-full'} height="h-4" />
        ))}
      </div>
      <div className="pt-4">
        <SkeletonLine width="w-1/3" height="h-10" className="rounded-full" />
      </div>
    </div>
  );
};
