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
import { DiagnosticsPage } from "./pages/diagnostics/DiagnosticsPage";
import { RollbackCenterPage } from "./pages/rollback-center/RollbackCenterPage";
import { SettingsPage } from "./pages/settings/SettingsPage";
import { SubscriptionPage } from "./pages/subscription/SubscriptionPage";
import { ProfilePage } from "./pages/profile/ProfilePage";
import { OnboardingPage } from "./pages/onboarding/OnboardingPage";
import { SplashPage } from "./pages/splash/SplashPage";
import { WizardPage } from "./pages/wizard/WizardPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";
import { initAuthClient } from "./stores/auth-store";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { StarField } from "./components/ui/StarField";

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
        <Route
          path="/forgot-password"
          element={
            <GuestGuard>
              <ForgotPasswordPage />
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
          <Route path="/dashboard" element={<ErrorBoundary><DashboardPage /></ErrorBoundary>} />
          <Route path="/hardware" element={<ErrorBoundary><HardwarePage /></ErrorBoundary>} />
          <Route path="/intelligence" element={<ErrorBoundary><IntelligencePage /></ErrorBoundary>} />
          <Route path="/diagnostics" element={<ErrorBoundary><DiagnosticsPage /></ErrorBoundary>} />
          <Route path="/tuning" element={<ErrorBoundary><TuningPlanPage /></ErrorBoundary>} />
          <Route path="/apply" element={<ErrorBoundary><ApplyWorkflowPage /></ErrorBoundary>} />
          <Route path="/bios" element={<ErrorBoundary><BiosGuidancePage /></ErrorBoundary>} />
          <Route path="/benchmark" element={<ErrorBoundary><BenchmarkLabPage /></ErrorBoundary>} />
          <Route path="/thermal" element={<ErrorBoundary><ThermalBottleneckPage /></ErrorBoundary>} />
          <Route path="/apps" element={<ErrorBoundary><AppHubPage /></ErrorBoundary>} />
          <Route path="/rollback" element={<ErrorBoundary><RollbackCenterPage /></ErrorBoundary>} />
          <Route path="/settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
          <Route path="/subscription" element={<ErrorBoundary><SubscriptionPage /></ErrorBoundary>} />
          <Route path="/profile" element={<ErrorBoundary><ProfilePage /></ErrorBoundary>} />
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
    <ErrorBoundary>
      <BrowserRouter>
        <StarField />
        <AnimatedRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
