import React, { useEffect, useRef, useState } from 'react';
import { useTourGuide } from '@/contexts/TourContext';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

export const TourOverlay: React.FC = () => {
  const { 
    currentStep, 
    isVisible, 
    currentTourType, 
    currentStepIndex, 
    currentTour,
    nextStep, 
    previousStep, 
    skipTour,
  } = useTourGuide() as any; // Type extended in component
  
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible || !currentStep) {
      setHighlightRect(null);
      return;
    }

    // Find the target element
    if (currentStep.targetSelector) {
      const element = document.querySelector(currentStep.targetSelector);
      if (element) {
        const rect = element.getBoundingClientRect();
        setHighlightRect(rect);
      }
    } else {
      // Center tour (no specific element)
      setHighlightRect(null);
    }

    // Re-check on scroll/resize
    const handleResize = () => {
      if (currentStep?.targetSelector) {
        const element = document.querySelector(currentStep.targetSelector);
        if (element) {
          setHighlightRect(element.getBoundingClientRect());
        }
      }
    };

    window.addEventListener('scroll', handleResize, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleResize, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isVisible, currentStep]);

  if (!isVisible || !currentStep) {
    return null;
  }

  const padding = currentStep.highlightPadding || 8;
  const stepCount = (currentTour?.steps.length || 0);
  const isLastStep = currentStepIndex === stepCount - 1;

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!highlightRect) {
      // Center the tooltip
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const position = currentStep.position || 'bottom';
    const tooltipWidth = 300;
    const tooltipHeight = 150;
    const gap = 16;

    switch (position) {
      case 'top':
        return {
          top: `${highlightRect.top - gap - tooltipHeight}px`,
          left: `${highlightRect.left + highlightRect.width / 2 - tooltipWidth / 2}px`,
        };
      case 'bottom':
        return {
          top: `${highlightRect.bottom + gap}px`,
          left: `${highlightRect.left + highlightRect.width / 2 - tooltipWidth / 2}px`,
        };
      case 'left':
        return {
          top: `${highlightRect.top + highlightRect.height / 2 - tooltipHeight / 2}px`,
          left: `${highlightRect.left - gap - tooltipWidth}px`,
        };
      case 'right':
        return {
          top: `${highlightRect.top + highlightRect.height / 2 - tooltipHeight / 2}px`,
          left: `${highlightRect.right + gap}px`,
        };
      default:
        return {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        };
    }
  };

  return (
    <>
      {/* Overlay background with highlight mask */}
      <div 
        className="fixed inset-0 z-[999] pointer-events-none"
        style={{
          background: 'rgba(0, 0, 0, 0.7)',
          WebkitMaskImage: highlightRect ? `radial-gradient(
            circle at ${highlightRect.left + highlightRect.width / 2}px ${highlightRect.top + highlightRect.height / 2}px,
            transparent ${Math.max(highlightRect.width, highlightRect.height) / 2 + padding}px,
            black ${Math.max(highlightRect.width, highlightRect.height) / 2 + padding + 2}px
          )` : 'none',
          maskImage: highlightRect ? `radial-gradient(
            circle at ${highlightRect.left + highlightRect.width / 2}px ${highlightRect.top + highlightRect.height / 2}px,
            transparent ${Math.max(highlightRect.width, highlightRect.height) / 2 + padding}px,
            black ${Math.max(highlightRect.width, highlightRect.height) / 2 + padding + 2}px
          )` : 'none',
        }}
        onClick={skipTour}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-[1000] bg-white rounded-lg shadow-2xl p-6 max-w-[320px] pointer-events-auto"
        style={getTooltipStyle()}
      >
        {/* Header with close button */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {currentStep.title}
            </h3>
            <span className="text-xs text-foreground/60">
              {currentStepIndex + 1} / {stepCount}
            </span>
          </div>
          <button
            onClick={skipTour}
            className="text-foreground/60 hover:text-foreground transition-colors ml-2 flex-shrink-0"
            aria-label="Close tour"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        <p className="text-sm text-foreground/70 mb-6 leading-relaxed">
          {currentStep.description}
        </p>

        {/* Action buttons */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2">
            {currentStepIndex > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={previousStep}
                className="gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            {!isLastStep ? (
              <Button
                onClick={skipTour}
                variant="ghost"
                size="sm"
                className="text-foreground/70"
              >
                {currentStep.skipText || 'Skip'}
              </Button>
            ) : null}

            <Button
              onClick={nextStep}
              size="sm"
              className="gap-1"
            >
              {isLastStep ? 'Done' : (currentStep.actionText || 'Next')}
              {!isLastStep && <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
