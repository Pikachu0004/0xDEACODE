/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { AnimatePresence } from 'motion/react';
import { Suspense, lazy, useState, useEffect } from 'react';
import Onboarding from './components/Onboarding';
import LoadingScreen from './components/LoadingScreen';
import PurpleBallCursor from './components/PurpleBallCursor';

// Lazy load pages for better performance
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ProjectChat = lazy(() => import('./pages/ProjectChat'));
const Studio = lazy(() => import('./pages/Studio'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const ARViewer = lazy(() => import('./pages/ARViewer'));
const FreelancersHub = lazy(() => import('./pages/FreelancersHub'));
const Community = lazy(() => import('./pages/Community'));
const LearnPage = lazy(() => import('./pages/LearnPage'));
const SustainabilityPage = lazy(() => import('./pages/SustainabilityPage'));
const MarketplaceProduct = lazy(() => import('./pages/MarketplaceProduct'));
const Cart = lazy(() => import('./pages/Cart'));
const PricingPage = lazy(() => import('./pages/PricingPage'));

export default function App() {
  const { user, onboardingCompleted, setOnboardingCompleted, syncProjectsFromServer } = useAppStore();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.token) void syncProjectsFromServer();
  }, [user?.token, syncProjectsFromServer]);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white/20">
      <AnimatePresence mode="wait">
        {isLoading && (
          <LoadingScreen key="loader" onComplete={() => setIsLoading(false)} />
        )}
      </AnimatePresence>

      <div 
        style={{ 
          opacity: isLoading ? 0 : 1, 
          transition: "opacity 0.5s ease-out",
          pointerEvents: isLoading ? 'none' : 'auto'
        }}
      >
        {!isLoading && <PurpleBallCursor />}
        {!onboardingCompleted && <Onboarding onComplete={() => setOnboardingCompleted(true)} />}
        <AnimatePresence mode="wait">
          <Suspense fallback={<DefaultLoader />}>
            <Routes location={location}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/dashboard" />} />
              <Route path="/signup" element={!user ? <SignupPage /> : <Navigate to="/dashboard" />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              
              {/* Protected Routes */}
              <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
              <Route path="/project/:id" element={user ? <ProjectChat /> : <Navigate to="/login" />} />
              <Route path="/studio/:id" element={user ? <Studio /> : <Navigate to="/login" />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/product/:id" element={<MarketplaceProduct />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/sustainability" element={<SustainabilityPage />} />
              <Route path="/freelancers" element={<FreelancersHub />} />
              <Route path="/learn" element={<LearnPage />} />
              <Route path="/community" element={<Community />} />
              <Route path="/try-ar" element={<ARViewer />} />
              <Route path="/ar/:id" element={<ARViewer />} />
            </Routes>
          </Suspense>
        </AnimatePresence>
      </div>
    </div>
  );
}

function DefaultLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black z-50">
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 border-4 border-white/5 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-t-brand-primary rounded-full animate-spin"></div>
      </div>
    </div>
  );
}
