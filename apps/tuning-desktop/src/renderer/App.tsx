import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AppLayout } from "./components/layout/AppLayout";
import { AuthGuard, GuestGuard } from "./components/auth/AuthGuard";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { HardwarePage } from "./pages/hardware/HardwarePage";
import { TuningPlanPage } from "./pages/tuning-plan/TuningPlanPage";
import { ApplyWorkflowPage } from "./pages/apply-workflow/ApplyWorkflowPage";
import { BiosGuidancePage } from "./pages/bios-guidance/BiosGuidancePage";
import { BenchmarkLabPage } from "./pages/benchmark-lab/BenchmarkLabPage";
import { ThermalBottleneckPage } from "./pages/thermal-bottleneck/ThermalBottleneckPage";
import { AppHubPage } from "./pages/app-hub/AppHubPage";
import { IntelligencePage } from "./pages/intelligence/IntelligencePage";
import { RollbackCenterPage } from "./pages/rollback-center/RollbackCenterPage";
import { SettingsPage } from "./pages/settings/SettingsPage";
import { SubscriptionPage } from "./pages/subscription/SubscriptionPage";
import { ProfilePage } from "./pages/profile/ProfilePage";
import { OnboardingPage } from "./pages/onboarding/OnboardingPage";
import { SplashPage } from "./pages/splash/SplashPage";
import { WizardPage } from "./pages/wizard/WizardPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { initAuthClient } from "./stores/auth-store";

// AnimatePresence requires a stable location key inside the router context.
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        {/* Full-screen public routes */}
        <Route path="/splash" element={<SplashPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/wizard" element={<WizardPage />} />

        {/* Auth routes (redirect away if already signed in) */}
        <Route
          path="/login"
          element={
            <GuestGuard>
              <LoginPage />
            </GuestGuard>
          }
        />
        <Route
          path="/register"
          element={
            <GuestGuard>
              <RegisterPage />
            </GuestGuard>
          }
        />

        {/* Main app with sidebar layout — requires authentication */}
        <Route
          element={
            <AuthGuard>
              <AppLayout />
            </AuthGuard>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/hardware" element={<HardwarePage />} />
          <Route path="/intelligence" element={<IntelligencePage />} />
          <Route path="/tuning" element={<TuningPlanPage />} />
          <Route path="/apply" element={<ApplyWorkflowPage />} />
          <Route path="/bios" element={<BiosGuidancePage />} />
          <Route path="/benchmark" element={<BenchmarkLabPage />} />
          <Route path="/thermal" element={<ThermalBottleneckPage />} />
          <Route path="/apps" element={<AppHubPage />} />
          <Route path="/rollback" element={<RollbackCenterPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* Default redirect — wizard is the primary entry point */}
        <Route path="*" element={<Navigate to="/wizard" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export function App() {
  useEffect(() => {
    initAuthClient();
  }, []);

  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}
