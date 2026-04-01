// Wizard Page
// Root wizard route. Renders WizardShell with the active step component.
// AnimatePresence handles horizontal slide transitions between steps.

import { AnimatePresence } from "framer-motion";
import { WizardShell } from "@/components/wizard/WizardShell";
import { useWizardStore } from "@/stores/wizard-store";
import { WelcomeStep }        from "./steps/WelcomeStep";
import { AnalysisStep }       from "./steps/AnalysisStep";
import { ProfileStep }        from "./steps/ProfileStep";
import { CleanupStep }        from "./steps/CleanupStep";
import { ServicesStep }       from "./steps/ServicesStep";
import { PerformanceStep }    from "./steps/PerformanceStep";
import { InfrastructureStep } from "./steps/InfrastructureStep";
import { AppHubStep }         from "./steps/AppHubStep";
import { BenchmarkStep }      from "./steps/BenchmarkStep";
import { SummaryStep }        from "./steps/SummaryStep";
import { BiosStep }           from "./steps/BiosStep";
import { ApplyPrepStep }      from "./steps/ApplyPrepStep";
import { ExecutionStep }      from "./steps/ExecutionStep";
import { RebootStep }         from "./steps/RebootStep";
import { ReportStep }         from "./steps/ReportStep";

// Wizard Page

export function WizardPage() {
  const currentStep = useWizardStore((s) => s.currentStep);

  return (
    <WizardShell>
      <AnimatePresence mode="wait">
        {currentStep === "welcome" && (
          <WelcomeStep key="welcome" />
        )}
        {currentStep === "analysis" && (
          <AnalysisStep key="analysis" />
        )}
        {currentStep === "profile" && (
          <ProfileStep key="profile" />
        )}
        {currentStep === "cleanup" && (
          <CleanupStep key="cleanup" />
        )}
        {currentStep === "services" && (
          <ServicesStep key="services" />
        )}
        {currentStep === "performance" && (
          <PerformanceStep key="performance" />
        )}
        {currentStep === "infrastructure" && (
          <InfrastructureStep key="infrastructure" />
        )}
        {currentStep === "apphub" && (
          <AppHubStep key="apphub" />
        )}
        {currentStep === "benchmark" && (
          <BenchmarkStep key="benchmark" />
        )}
        {currentStep === "summary" && (
          <SummaryStep key="summary" />
        )}
        {currentStep === "bios" && (
          <BiosStep key="bios" />
        )}
        {currentStep === "apply-prep" && (
          <ApplyPrepStep key="apply-prep" />
        )}
        {currentStep === "execution" && (
          <ExecutionStep key="execution" />
        )}
        {currentStep === "reboot" && (
          <RebootStep key="reboot" />
        )}
        {currentStep === "report" && (
          <ReportStep key="report" />
        )}
      </AnimatePresence>
    </WizardShell>
  );
}
