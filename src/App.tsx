import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ChooseRole from "./pages/ChooseRole";
import { WhatsAppSupport } from "./components/WhatsAppSupport";
import StoreDashboard from "./pages/store/StoreDashboard";
import DriverDashboard from "./pages/driver/DriverDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ChatScreen from "./pages/ChatScreen";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { user, profile, loading } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();

  // Don't block forgot-password page with loading screen — OTP verification
  // creates a session which triggers loading, but we need to stay on the page
  const isForgotPassword = location.pathname === '/forgot-password';

  if (loading && !isForgotPassword) {
    return (
      <div className="app-container flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold">{t('common.appName')}</h1>
          <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/choose-role" element={user ? <ChooseRole /> : <Navigate to="/login" />} />
      <Route path="/store/*" element={user && profile?.role === 'store' ? <StoreDashboard /> : <Navigate to="/login" />} />
      <Route path="/driver/*" element={user && profile?.role === 'driver' ? <DriverDashboard /> : <Navigate to="/login" />} />
      <Route path="/admin/*" element={user && profile?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/login" />} />
      <Route path="/order/:orderId" element={user ? <ChatScreen /> : <Navigate to="/login" />} />
      <Route path="/" element={
        !user ? <Navigate to="/login" /> :
        !profile ? <Navigate to="/login" /> :
        !profile.role ? <Navigate to="/choose-role" /> :
        profile.role === 'store' ? <Navigate to="/store" /> :
        profile.role === 'driver' ? <Navigate to="/driver" /> :
        profile.role === 'admin' ? <Navigate to="/admin" /> :
        <Navigate to="/login" />
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <main>
            <AppRoutes />
            <WhatsAppSupport />
          </main>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
