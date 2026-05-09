import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { trackEvent } from '@/services/analytics';

interface HelpTooltipProps {
  tooltipId: string;
  featureName: string;
  content: string;
  docLink?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  tooltipId,
  featureName,
  content,
  docLink,
  position = 'top',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    setIsOpen(!isOpen);
    
    if (!isOpen) {
      trackEvent({
        event: 'help_tooltip_clicked',
        properties: {
          tooltip_id: tooltipId,
          feature_name: featureName,
        },
      });
    }
  };

  const handleClickOutside = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[role="tooltip"]')) {
      return;
    }
    setIsOpen(false);
  };

  const positionClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2',
  };

  const arrowClasses = {
    top: 'top-full border-t-white border-l-transparent border-r-transparent',
    bottom: 'bottom-full border-b-white border-l-transparent border-r-transparent',
    left: 'left-full border-l-white border-t-transparent border-b-transparent',
    right: 'right-full border-r-white border-t-transparent border-b-transparent',
  };

  return (
    <div className={`relative inline-block ${className}`} onClick={handleClickOutside}>
      <button
        onClick={handleClick}
        className="inline-flex items-center justify-center text-foreground/60 hover:text-foreground transition-colors rounded-full hover:bg-foreground/10 p-1"
        aria-label={`Help: ${featureName}`}
        title={featureName}
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          role="tooltip"
          className={`absolute z-50 ${positionClasses[position]} left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-lg border border-border p-3 max-w-xs`}
        >
          <p className="text-sm text-foreground mb-2">
            {content}
          </p>
          {docLink && (
            <a
              href={docLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              Learn more →
            </a>
          )}
          <div
            className={`absolute w-2 h-2 bg-white border-l border-t border-border ${arrowClasses[position]}`}
            style={{
              [position === 'top' || position === 'bottom' ? 'left' : 'top']: '50%',
              transform: position === 'top' || position === 'bottom' 
                ? 'translateX(-50%)' 
                : 'translateY(-50%)',
            }}
          />
        </div>
      )}
    </div>
  );
};
