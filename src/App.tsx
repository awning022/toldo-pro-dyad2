import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthGate from "@/components/AuthGate";
import Index from "./pages/Index";
import IA from "./pages/IA";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthGate>
            {(user, demo) => (
              <Routes>
                <Route path="/" element={<Index user={user} demo={demo} />} />
                <Route path="/ia" element={<IA user={user} demo={demo} />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            )}
          </AuthGate>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}