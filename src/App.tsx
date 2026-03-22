import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import { AssistantProvider, useAssistant } from "./context/AssistantContext";
import Assistant3D from "./components/Assistant3D";
import BankScene3D from "./components/BankScene3D";

const GlobalAssistant = () => {
  const { status } = useAssistant();
  return <Assistant3D status={status} />;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AssistantProvider>
        <Toaster />
        <Sonner />
        <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
          <BankScene3D />
        </div>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AssistantProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
