import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import FamilyMembers from "./pages/FamilyMembers";
import Record from "./pages/Record";
import Stories from "./pages/Stories";
import Conversations from "./pages/Conversations";
import Chat from "./pages/Chat";
import FamilyTree from "./pages/FamilyTree";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/family-members" element={<FamilyMembers />} />
        <Route path="/record" element={<Record />} />
         <Route path="/stories" element={<Stories />} />
         <Route path="/conversations" element={<Conversations />} />
         <Route path="/chat/:conversationId" element={<Chat />} />
         <Route path="/family-tree" element={<FamilyTree />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
