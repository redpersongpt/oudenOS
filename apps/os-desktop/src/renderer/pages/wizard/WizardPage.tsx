// ─── Wizard Page ─────────────────────────────────────────────────────────────
// Root route for /wizard. 13-step playbook-native optimization flow.

import { AnimatePresence } from "framer-motion";
import { WizardShell } from "@/components/wizard/WizardShell";
import { useWizardStore } from "@/stores/wizard-store";

import { WelcomeStep }          from "./steps/WelcomeStep";
import { AssessmentStep }       from "./steps/AssessmentStep";
import { ProfileStep }          from "./steps/ProfileStep";
import { PreservationStep }     from "./steps/PreservationStep";
import { PlaybookStrategyStep } from "./steps/PlaybookStrategyStep";
import { PlaybookReviewStep }   from "./steps/PlaybookReviewStep";
import { PersonalizationStep }  from "./steps/PersonalizationStep";
import { AppSetupStep }         from "./steps/AppSetupStep";
import { FinalReviewStep }      from "./steps/FinalReviewStep";
import { ExecutionStep }        from "./steps/ExecutionStep";
import { RebootResumeStep }     from "./steps/RebootResumeStep";
import { ReportStep }           from "./steps/ReportStep";
import { DonationStep }         from "./steps/DonationStep";
import { HandoffStep }          from "./steps/HandoffStep";

export function WizardPage() {
  const { currentStep } = useWizardStore();

  return (
    <WizardShell>
      <AnimatePresence mode="wait" initial={false}>
        {currentStep === "welcome"            && <WelcomeStep          key="welcome"            />}
        {currentStep === "assessment"         && <AssessmentStep       key="assessment"         />}
        {currentStep === "profile"            && <ProfileStep          key="profile"            />}
        {currentStep === "preservation"       && <PreservationStep     key="preservation"       />}
        {currentStep === "playbook-strategy"  && <PlaybookStrategyStep key="playbook-strategy"  />}
        {currentStep === "playbook-review"    && <PlaybookReviewStep   key="playbook-review"    />}
        {currentStep === "personalization"    && <PersonalizationStep  key="personalization"    />}
        {currentStep === "app-setup"          && <AppSetupStep         key="app-setup"          />}
        {currentStep === "final-review"       && <FinalReviewStep      key="final-review"       />}
        {currentStep === "execution"          && <ExecutionStep        key="execution"          />}
        {currentStep === "reboot-resume"      && <RebootResumeStep     key="reboot-resume"      />}
        {currentStep === "report"             && <ReportStep           key="report"             />}
        {currentStep === "donation"           && <DonationStep         key="donation"           />}
        {currentStep === "handoff"            && <HandoffStep          key="handoff"            />}
      </AnimatePresence>
    </WizardShell>
  );
}
