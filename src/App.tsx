import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthGate } from "@/components/AuthGate";
import { AuthCallbackPage, ChangeEmailPage, ForgotPasswordPage, ResetPasswordPage } from "@/components/AuthFlows";
import Index from "./pages/Index";
import IA from "./pages/IA";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth/confirm" element={<AuthCallbackPage />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/change-email" element={<ChangeEmailPage />} />
          <Route path="*" element={<AuthGate>
            {(access) => <Routes>
              <Route path="/" element={<Index access={access} />} />
              <Route path="/ia" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>}
          </AuthGate>} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
