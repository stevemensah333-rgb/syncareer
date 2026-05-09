import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { trackEvent } from '@/services/analytics';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string; // CSS selector for the element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'; // Tooltip position
  actionText?: string; // CTA button text
  skipText?: string;
  onAction?: () => void | Promise<void>;
  highlightPadding?: number; // Extra padding around highlighted element
}

export type TourType = 'landing' | 'signup' | 'dashboard' | 'assessment' | 'portfolio' | 'job-matching';

export interface TourFlow {
  type: TourType;
  steps: TourStep[];
  autoStart?: boolean;
}

interface TourContextType {
  // Current tour state
  currentTourType: TourType | null;
  currentStepIndex: number;
  isVisible: boolean;
  currentStep: TourStep | null;
  currentTour?: TourFlow | undefined;
  
  // Tour management
  startTour: (tourType: TourType) => void;
  nextStep: () => Promise<void>;
  previousStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  
  // Tracking
  completedTours: TourType[];
  isTourCompleted: (tourType: TourType) => boolean;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const useTourGuide = () => {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTourGuide must be used within a TourProvider');
  }
  return context;
};

interface TourProviderProps {
  children: ReactNode;
  tours: TourFlow[];
}

export const TourProvider: React.FC<TourProviderProps> = ({ children, tours }) => {
  const [currentTourType, setCurrentTourType] = useState<TourType | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [completedTours, setCompletedTours] = useState<TourType[]>(() => {
    // Load completed tours from localStorage
    try {
      const stored = localStorage.getItem('syncareer:tours-completed');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const currentTour = useMemo(() => {
    return tours.find(t => t.type === currentTourType);
  }, [currentTourType, tours]);

  const currentStep = useMemo(() => {
    if (!currentTour || currentStepIndex >= currentTour.steps.length) {
      return null;
    }
    return currentTour.steps[currentStepIndex];
  }, [currentTour, currentStepIndex]);

  const startTour = useCallback((tourType: TourType) => {
    setCurrentTourType(tourType);
    setCurrentStepIndex(0);
    setIsVisible(true);

    // Track tour start
    trackEvent({
      event: 'tour_started',
      properties: { tour_type: tourType },
    });
  }, []);

  const nextStep = useCallback(async () => {
    if (!currentTour) return;

    // Execute step action if any
    if (currentStep?.onAction) {
      try {
        await currentStep.onAction();
      } catch (error) {
        console.error('[Tour] Error executing step action:', error);
      }
    }

    if (currentStepIndex < currentTour.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      // Tour completed
      completeTour();
    }
  }, [currentTour, currentStep, currentStepIndex]);

  const previousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  const skipTour = useCallback(() => {
    if (!currentTourType) return;

    // Track tour skipped
    trackEvent({
      event: 'tour_skipped',
      properties: { 
        tour_type: currentTourType,
        step_current: currentStepIndex,
      },
    });

    setIsVisible(false);
    setCurrentTourType(null);
    setCurrentStepIndex(0);
  }, [currentTourType, currentStepIndex]);

  const completeTour = useCallback(() => {
    if (!currentTourType) return;

    // Track tour completed
    trackEvent({
      event: 'tour_completed',
      properties: { 
        tour_type: currentTourType,
        steps_completed: currentStepIndex + 1,
      },
    });

    // Mark tour as completed
    setCompletedTours(prev => {
      const updated = [...new Set([...prev, currentTourType])];
      localStorage.setItem('syncareer:tours-completed', JSON.stringify(updated));
      return updated;
    });

    setIsVisible(false);
    setCurrentTourType(null);
    setCurrentStepIndex(0);
  }, [currentTourType, currentStepIndex]);

  const isTourCompleted = useCallback((tourType: TourType) => {
    return completedTours.includes(tourType);
  }, [completedTours]);

  const value: TourContextType = useMemo(() => ({
    currentTourType,
    currentStepIndex,
    isVisible,
    currentStep,
    currentTour,
    startTour,
    nextStep,
    previousStep,
    skipTour,
    completeTour,
    completedTours,
    isTourCompleted,
  }), [currentTourType, currentStepIndex, isVisible, currentStep, currentTour, startTour, nextStep, previousStep, skipTour, completeTour, completedTours, isTourCompleted]);

  return (
    <TourContext.Provider value={value}>
      {children}
    </TourContext.Provider>
  );
};
