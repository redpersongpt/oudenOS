// ─── Wizard Page ─────────────────────────────────────────────────────────────
// Root route for /wizard. Renders the current step inside WizardShell,
// wrapped in AnimatePresence for smooth step transitions.

import { AnimatePresence } from "framer-motion";
import { WizardShell } from "@/components/wizard/WizardShell";
import { useWizardStore } from "@/stores/wizard-store";

import { WelcomeStep }           from "./steps/WelcomeStep";
import { AssessmentStep }        from "./steps/AssessmentStep";
import { ProfileStep }           from "./steps/ProfileStep";
import { PreservationStep }      from "./steps/PreservationStep";
import { PlanStep }              from "./steps/PlanStep";
import { PersonalizationStep }   from "./steps/PersonalizationStep";
import { ApplyStep }             from "./steps/ApplyStep";
import { ExecutionStep }         from "./steps/ExecutionStep";
import { ReportStep }            from "./steps/ReportStep";

export function WizardPage() {
  const { currentStep } = useWizardStore();

  return (
    <WizardShell>
      <AnimatePresence mode="wait" initial={false}>
        {currentStep === "welcome"      && <WelcomeStep      key="welcome"      />}
        {currentStep === "assessment"   && <AssessmentStep   key="assessment"   />}
        {currentStep === "profile"      && <ProfileStep      key="profile"      />}
        {currentStep === "preservation" && <PreservationStep key="preservation" />}
        {currentStep === "plan"            && <PlanStep            key="plan"            />}
        {currentStep === "personalization" && <PersonalizationStep key="personalization" />}
        {currentStep === "apply"           && <ApplyStep           key="apply"           />}
        {currentStep === "execution"    && <ExecutionStep    key="execution"    />}
        {currentStep === "report"       && <ReportStep       key="report"       />}
      </AnimatePresence>
    </WizardShell>
  );
}
