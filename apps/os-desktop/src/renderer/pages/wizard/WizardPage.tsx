// ─── Wizard Page ─────────────────────────────────────────────────────────────
// Root route for /wizard. 10-step playbook-native transformation flow.

import { AnimatePresence } from "framer-motion";
import { WizardShell } from "@/components/wizard/WizardShell";
import { useWizardStore } from "@/stores/wizard-store";

import { WelcomeStep }          from "./steps/WelcomeStep";
import { AssessmentStep }       from "./steps/AssessmentStep";
import { ProfileStep }          from "./steps/ProfileStep";
import { PreservationStep }     from "./steps/PreservationStep";
import { PlaybookReviewStep }   from "./steps/PlaybookReviewStep";
import { PersonalizationStep }  from "./steps/PersonalizationStep";
import { AppSetupStep }         from "./steps/AppSetupStep";
import { FinalReviewStep }      from "./steps/FinalReviewStep";
import { ExecutionStep }        from "./steps/ExecutionStep";
import { ReportStep }           from "./steps/ReportStep";

export function WizardPage() {
  const { currentStep } = useWizardStore();

  return (
    <WizardShell>
      <AnimatePresence mode="wait" initial={false}>
        {currentStep === "welcome"          && <WelcomeStep          key="welcome"          />}
        {currentStep === "assessment"       && <AssessmentStep       key="assessment"       />}
        {currentStep === "profile"          && <ProfileStep          key="profile"          />}
        {currentStep === "preservation"     && <PreservationStep     key="preservation"     />}
        {currentStep === "playbook-review"  && <PlaybookReviewStep   key="playbook-review"  />}
        {currentStep === "personalization"  && <PersonalizationStep  key="personalization"  />}
        {currentStep === "app-setup"        && <AppSetupStep         key="app-setup"        />}
        {currentStep === "final-review"     && <FinalReviewStep      key="final-review"     />}
        {currentStep === "execution"        && <ExecutionStep        key="execution"        />}
        {currentStep === "report"           && <ReportStep           key="report"           />}
      </AnimatePresence>
    </WizardShell>
  );
}
