import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useCurrentUserPermissions } from "./hooks/useUserPermissions";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import PendingApproval from "./pages/PendingApproval";
import Dashboard from "./pages/Dashboard";
import AccountsPayable from "./pages/AccountsPayable";
import BankStatement from "./pages/BankStatement";
import AccountsReceivable from "./pages/AccountsReceivable";
import InvoiceBank from "./pages/InvoiceBank";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isApproved, isLoading, role } = useAuth();
  const { data: allowedPages, isLoading: permissionsLoading } = useCurrentUserPermissions();
  const location = useLocation();
  
  if (isLoading || permissionsLoading) {
    return null;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  if (!isApproved) {
    return <Navigate to="/aguardando-aprovacao" replace />;
  }

  // Admins have access to all pages
  if (role === 'admin') {
    return <>{children}</>;
  }

  // Check if user has permission to access this page
  if (allowedPages && !allowedPages.includes(location.pathname)) {
    // Redirect to first allowed page or dashboard
    const redirectTo = allowedPages[0] || '/dashboard';
    return <Navigate to={redirectTo} replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => {
  const { isAuthenticated, isApproved, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <Routes>
      <Route path="/" element={
        isAuthenticated 
          ? (isApproved ? <Navigate to="/dashboard" replace /> : <Navigate to="/aguardando-aprovacao" replace />) 
          : <Login />
      } />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/aguardando-aprovacao" element={
        isAuthenticated 
          ? (isApproved ? <Navigate to="/dashboard" replace /> : <PendingApproval />) 
          : <Navigate to="/" replace />
      } />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/contas-pagar" element={<ProtectedRoute><AccountsPayable /></ProtectedRoute>} />
      <Route path="/extrato-bancario" element={<ProtectedRoute><BankStatement /></ProtectedRoute>} />
      <Route path="/contas-receber" element={<ProtectedRoute><AccountsReceivable /></ProtectedRoute>} />
      <Route path="/banco-notas" element={<ProtectedRoute><InvoiceBank /></ProtectedRoute>} />
      <Route path="/configuracoes" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
