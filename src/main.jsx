import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import './styles/perf-overrides.css';
import './styles/templates.css';
import './styles/theme-fixes.css';
import './styles/a11y-tokens.css';
import './styles/polish.css';
import './styles/redesign.css';
import './styles/safe-area.css';
import './styles/profile-ai.css';
import './styles/pro-modules.css';
import './styles/text-animations.css';
import './design/tokens.css';
import './design/primitives.css';
import './design/shell.css';
import './design/pages.css';
import './design/legacy-bridge.css'; // ko'chirilmagan sahifalar uchun; hammasi ko'chgach o'chiriladi
import './design/landing.css';
import App from './App.jsx';
import SmoothScroll from './components/SmoothScroll.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { I18nProvider } from './i18n';
import { ToastProvider } from './components/ui';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { initTelegramFullscreen } from './lib/telegramFullscreen.js';

try {
  initTelegramFullscreen(); // Mini Apps 2.0: to'liq ekran + safe area (Telegramdan tashqarida hech narsa qilmaydi)
} catch { /* Telegram tashqarisida ochilganda normal */ }

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <I18nProvider>
        <BrowserRouter>
          <AuthProvider>
            <ThemeProvider>
              <ToastProvider>
                <SmoothScroll>
                  <App />
                </SmoothScroll>
              </ToastProvider>
            </ThemeProvider>
          </AuthProvider>
        </BrowserRouter>
      </I18nProvider>
    </ErrorBoundary>
  </StrictMode>,
);