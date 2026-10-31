import { Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from './state/AppContext.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { AppLayout } from './components/AppLayout.jsx';
import { LanguagePickerScreen } from './screens/LanguagePickerScreen.jsx';
import { WorkflowShellScreen } from './screens/WorkflowShellScreen.jsx';
import { StyleGuideScreen } from './screens/StyleGuideScreen.jsx';

export function AppRoutes() {
  const { language } = useApp();

  return (
    <ErrorBoundary language={language}>
      <AppLayout>
        <Routes>
          <Route path="/" element={<LanguagePickerScreen />} />
          <Route path="/app" element={<WorkflowShellScreen />} />
          <Route path="/dev/style-guide" element={<StyleGuideScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </ErrorBoundary>
  );
}

export default AppRoutes;
