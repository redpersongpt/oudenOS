import { Routes, Route, Navigate } from "react-router-dom";
import { WizardPage } from "./pages/wizard/WizardPage";

export function App() {
  return (
    <Routes>
      <Route path="/wizard" element={<WizardPage />} />
      <Route path="*" element={<Navigate to="/wizard" replace />} />
    </Routes>
  );
}
