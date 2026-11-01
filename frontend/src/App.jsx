import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useApp } from './state/AppContext.jsx';
import { useAuthStore } from './state/authStore.js';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { AppLayout } from './components/AppLayout.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { LoginScreen } from './screens/LoginScreen.jsx';
import { SignupScreen } from './screens/SignupScreen.jsx';
import { LanguagePickerScreen } from './screens/LanguagePickerScreen.jsx';
import { WorkflowShellScreen } from './screens/WorkflowShellScreen.jsx';
import { StyleGuideScreen } from './screens/StyleGuideScreen.jsx';
import { CitizenDashboardScreen } from './screens/CitizenDashboardScreen.jsx';
import { SchemesListScreen } from './screens/SchemesListScreen.jsx';
import { SchemeDetailScreen } from './screens/SchemeDetailScreen.jsx';
import { EligibilityCheckerScreen } from './screens/EligibilityCheckerScreen.jsx';
import { ApplySchemeWizardScreen } from './screens/ApplySchemeWizardScreen.jsx';
import { DocumentCenterScreen } from './screens/DocumentCenterScreen.jsx';
import { MyApplicationsScreen } from './screens/MyApplicationsScreen.jsx';
import { ApplicationTrackingScreen } from './screens/ApplicationTrackingScreen.jsx';
import { AiAssistantScreen } from './screens/AiAssistantScreen.jsx';
import { NotificationsScreen } from './screens/NotificationsScreen.jsx';
import { ProfileScreen } from './screens/ProfileScreen.jsx';
import { HelpSupportScreen } from './screens/HelpSupportScreen.jsx';

function RootRedirect() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const location = useLocation();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/login" state={{ from: location }} replace />;
}

export function AppRoutes() {
  const { language } = useApp();

  return (
    <ErrorBoundary language={language}>
      <AppLayout>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/signup" element={<SignupScreen />} />

          {/* Dev & Utility Routes */}
          <Route path="/dev/style-guide" element={<StyleGuideScreen />} />
          <Route path="/languages" element={<LanguagePickerScreen />} />

          {/* Protected Routes (Require Authentication) */}
          {/* 1. Citizen Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <CitizenDashboardScreen />
              </ProtectedRoute>
            }
          />

          {/* 2. All Government Schemes */}
          <Route
            path="/schemes"
            element={
              <ProtectedRoute>
                <SchemesListScreen />
              </ProtectedRoute>
            }
          />

          {/* 3. Scheme Details */}
          <Route
            path="/schemes/:id"
            element={
              <ProtectedRoute>
                <SchemeDetailScreen />
              </ProtectedRoute>
            }
          />

          {/* 4. AI Eligibility Checker */}
          <Route
            path="/eligibility"
            element={
              <ProtectedRoute>
                <EligibilityCheckerScreen />
              </ProtectedRoute>
            }
          />

          {/* 5. Apply for Scheme (9-Step Wizard with Gate 1 & Gate 2) */}
          <Route
            path="/apply/:schemeId"
            element={
              <ProtectedRoute>
                <ApplySchemeWizardScreen />
              </ProtectedRoute>
            }
          />

          {/* 6. Document Center */}
          <Route
            path="/documents"
            element={
              <ProtectedRoute>
                <DocumentCenterScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/documents"
            element={
              <ProtectedRoute>
                <DocumentCenterScreen />
              </ProtectedRoute>
            }
          />

          {/* 7. My Applications */}
          <Route
            path="/applications"
            element={
              <ProtectedRoute>
                <MyApplicationsScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/cases"
            element={
              <ProtectedRoute>
                <MyApplicationsScreen />
              </ProtectedRoute>
            }
          />

          {/* 8. Application Tracking */}
          <Route
            path="/applications/:id/tracking"
            element={
              <ProtectedRoute>
                <ApplicationTrackingScreen />
              </ProtectedRoute>
            }
          />

          {/* 9. AI Voice Assistant */}
          <Route
            path="/assistant"
            element={
              <ProtectedRoute>
                <AiAssistantScreen />
              </ProtectedRoute>
            }
          />

          {/* 10. Notifications */}
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsScreen />
              </ProtectedRoute>
            }
          />

          {/* 11. Citizen Profile */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfileScreen />
              </ProtectedRoute>
            }
          />

          {/* 12. Help & Support */}
          <Route
            path="/support"
            element={
              <ProtectedRoute>
                <HelpSupportScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/help"
            element={
              <ProtectedRoute>
                <HelpSupportScreen />
              </ProtectedRoute>
            }
          />

          {/* 16-Step Guided Workflow Shell (Ramabai Journey) */}
          <Route
            path="/workflow"
            element={
              <ProtectedRoute>
                <WorkflowShellScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <WorkflowShellScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/*"
            element={
              <ProtectedRoute>
                <WorkflowShellScreen />
              </ProtectedRoute>
            }
          />

          {/* Root Redirect based on Auth */}
          <Route path="/" element={<RootRedirect />} />

          {/* Catch-all Redirect */}
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </AppLayout>
    </ErrorBoundary>
  );
}

export default AppRoutes;
