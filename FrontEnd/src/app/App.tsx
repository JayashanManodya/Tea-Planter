import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn, useAuth, useUser } from "@clerk/clerk-react";
import { LanguageProvider } from '@/contexts/LanguageContext';
import { LandingPage } from './pages/LandingPage';
import { DashboardLayout } from './components/DashboardLayout';
import { WorkerLayout } from './components/WorkerLayout';
import { OwnerDashboard } from './pages/OwnerDashboard';
import { WorkerDashboard } from './pages/WorkerDashboard';
import { WorkerFinancial } from './pages/WorkerFinancial';
import { WorkerTasks } from './pages/WorkerTasks';
import { WorkerHarvests } from './pages/WorkerHarvests';
import { PlotsPage } from './pages/PlotsPage';
import { WorkforcePage } from './pages/WorkforcePage';
import { HarvestPage } from './pages/HarvestPage';
import { InventoryPage } from './pages/InventoryPage';
import { AttendancePage } from './pages/AttendancePage';
import { FinancialPage } from './pages/FinancialPage';
import { DiseaseScannerPage } from './pages/DiseaseScannerPage';
import { DeliveriesPage } from './pages/DeliveriesPage';
import { FactoriesPage } from './pages/FactoriesPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { ReportsPage } from './pages/ReportsPage';
import { WorkerReportsPage } from './pages/WorkerReportsPage';
import { TasksPage } from './pages/TasksPage';
import { SettingsPage } from './pages/SettingsPage';

interface PrivateRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('owner' | 'clerk' | 'worker')[];
}

function PrivateRoute({ children, allowedRoles }: PrivateRouteProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  if (!isLoaded) return <div>Loading...</div>;

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  // Role check logic: default to worker if no role is set in metadata
  const userRole = (user?.publicMetadata?.role as 'owner' | 'clerk' | 'worker') || 'worker';

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to={userRole === 'worker' ? '/worker-dashboard' : '/dashboard'} />;
  }

  return <>{children}</>;
}

function DynamicRoleLayout() {
  const { user } = useUser();
  const userRole = (user?.publicMetadata?.role as 'owner' | 'clerk' | 'worker') || 'worker';

  return userRole === 'worker' ? <WorkerLayout /> : <DashboardLayout />;
}

function AppRoutes() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  const userRole = (user?.publicMetadata?.role as 'owner' | 'clerk' | 'worker') || 'worker';

  const getHomeRoute = () => {
    return userRole === 'worker' ? '/worker-dashboard' : '/dashboard';
  };

  return (
    <Routes>
      <Route path="/" element={isSignedIn ? <Navigate to={getHomeRoute()} /> : <LandingPage />} />

      {/* Worker Pages - With WorkerLayout */}
      <Route
        element={
          <PrivateRoute allowedRoles={['worker']}>
            <WorkerLayout />
          </PrivateRoute>
        }
      >
        <Route path="/worker-dashboard" element={<WorkerDashboard />} />
        <Route path="/worker-financial" element={<WorkerFinancial />} />
        <Route path="/worker-tasks" element={<WorkerTasks />} />
        <Route path="/worker-harvest" element={<WorkerHarvests />} />
        <Route path="/worker-reports" element={<WorkerReportsPage />} />
      </Route>

      {/* Shared Pages using Dynamic Layout */}
      <Route
        element={
          <PrivateRoute>
            <DynamicRoleLayout />
          </PrivateRoute>
        }
      >
        <Route path="disease-scanner" element={
          <PrivateRoute allowedRoles={['owner', 'clerk', 'worker']}>
            <DiseaseScannerPage />
          </PrivateRoute>
        } />
        <Route path="ai-assistant" element={
          <PrivateRoute allowedRoles={['owner', 'clerk', 'worker']}>
            <AIAssistantPage />
          </PrivateRoute>
        } />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route
        element={
          <PrivateRoute>
            <DashboardLayout />
          </PrivateRoute>
        }
      >
        <Route path="dashboard" element={
          <PrivateRoute allowedRoles={['owner', 'clerk']}>
            <OwnerDashboard />
          </PrivateRoute>
        } />

        <Route path="plots" element={
          <PrivateRoute allowedRoles={['owner']}>
            <PlotsPage />
          </PrivateRoute>
        } />
        <Route path="workforce" element={
          <PrivateRoute allowedRoles={['owner']}>
            <WorkforcePage />
          </PrivateRoute>
        } />
        <Route path="harvest" element={
          <PrivateRoute allowedRoles={['owner', 'clerk']}>
            <HarvestPage />
          </PrivateRoute>
        } />
        <Route path="inventory" element={
          <PrivateRoute allowedRoles={['owner', 'clerk']}>
            <InventoryPage />
          </PrivateRoute>
        } />
        <Route path="attendance" element={
          <PrivateRoute allowedRoles={['owner', 'clerk']}>
            <AttendancePage />
          </PrivateRoute>
        } />
        <Route path="financial" element={
          <PrivateRoute allowedRoles={['owner', 'worker']}>
            <FinancialPage />
          </PrivateRoute>
        } />
        <Route path="deliveries" element={
          <PrivateRoute allowedRoles={['owner', 'clerk']}>
            <DeliveriesPage />
          </PrivateRoute>
        } />
        <Route path="factories" element={
          <PrivateRoute allowedRoles={['owner']}>
            <FactoriesPage />
          </PrivateRoute>
        } />
        <Route path="tasks" element={
          <PrivateRoute allowedRoles={['owner', 'clerk', 'worker']}>
            <TasksPage />
          </PrivateRoute>
        } />
        <Route path="reports" element={
          <PrivateRoute allowedRoles={['owner']}>
            <ReportsPage />
          </PrivateRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to={getHomeRoute()} />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AppRoutes />
      </LanguageProvider>
    </BrowserRouter>
  );
}