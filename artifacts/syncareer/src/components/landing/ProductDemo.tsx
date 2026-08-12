import ApplicationRecord, {
  APPLICATION_STAGES,
  type ApplicationStage,
} from "./ApplicationRecord";

export const DEMO_STEPS = APPLICATION_STAGES;
export type DemoStep = ApplicationStage;

interface ProductDemoProps {
  activeStep?: DemoStep;
  onStepChange?: (step: DemoStep) => void;
  autoProgress?: boolean;
  showStageControls?: boolean;
  className?: string;
  idPrefix?: string;
}

/**
 * Compatibility surface for older internal imports. The landing page itself
 * uses ApplicationRecord directly so every public product state is the same
 * coherent record rather than a second demo grammar.
 */
export default function ProductDemo({
  activeStep,
  onStepChange,
  autoProgress,
  showStageControls,
  className,
  idPrefix,
}: ProductDemoProps) {
  return (
    <ApplicationRecord
      activeStage={activeStep}
      onStageChange={onStepChange}
      autoProgress={autoProgress}
      showControls={showStageControls}
      className={className}
      idPrefix={idPrefix}
    />
  );
}
