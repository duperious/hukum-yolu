import { useEffect } from 'react';
import {
  HashRouter,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './components/ui/Toast';
import GuidePage from './pages/GuidePage';
import HomePage from './pages/HomePage';
import JoinPage from './pages/JoinPage';
import LocalPage from './pages/LocalPage';
import NotFoundPage from './pages/NotFoundPage';
import RoomPage from './pages/RoomPage';
import SetupPage from './pages/SetupPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ToastProvider>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/guide" element={<GuidePage />} />
            <Route path="/local" element={<LocalPage />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/join" element={<JoinPage />} />
            <Route path="/join/:code" element={<JoinPage />} />
            <Route path="/room/:code" element={<RoomPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ToastProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
