import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import Footer from './components/Footer';
import { RequireGuest, RequireUser, RequireAdmin, FullScreenLoader } from './components/Guards';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import LinkAccount from './pages/LinkAccount';
import Register from './pages/Register';
import LandingPage from './pages/LandingPage';
import ForgotPassword from './pages/ForgotPassword';
const Home = lazy(() => import('./pages/Home'));
const MyBots = lazy(() => import('./pages/MyBots'));
const BotDetail = lazy(() => import('./pages/BotDetail'));
const Create = lazy(() => import('./pages/Create'));
const KunlikTolov = lazy(() => import('./pages/KunlikTolov'));
const Tariflar = lazy(() => import('./pages/Tariflar'));
const Deposit = lazy(() => import('./pages/Deposit'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Team = lazy(() => import('./pages/Team'));
const JoinTeam = lazy(() => import('./pages/JoinTeam'));
const Market = lazy(() => import('./pages/Market'));
const AdminPlatform = lazy(() => import('./pages/admin/AdminPlatform'));
const AdminKartalar = lazy(() => import('./pages/admin/AdminKartalar'));
const Profil = lazy(() => import('./pages/Profil'));
const AiBuilder = lazy(() => import('./pages/AiBuilder'));
const Wallet = lazy(() => import('./pages/Wallet'));
const Referal = lazy(() => import('./pages/Referal'));
const PulIshlash = lazy(() => import('./pages/PulIshlash'));
const Chat = lazy(() => import('./pages/Chat'));
const Sozlamalar = lazy(() => import('./pages/Sozlamalar'));
const NotFound = lazy(() => import('./pages/NotFound'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminBotTariflar = lazy(() => import('./pages/admin/AdminBotTariflar'));
const AdminTariflar = lazy(() => import('./pages/admin/AdminTariflar'));
const AdminPromokodlar = lazy(() => import('./pages/admin/AdminPromokodlar'));
const AdminKanallar = lazy(() => import('./pages/admin/AdminKanallar'));
const AdminTurlar = lazy(() => import('./pages/admin/AdminTurlar'));
const AdminSorovlar = lazy(() => import('./pages/admin/AdminSorovlar'));
const AdminRozilik = lazy(() => import('./pages/admin/AdminRozilik'));
const AdminChat = lazy(() => import('./pages/admin/AdminChat'));
const AdminChatSuhbat = lazy(() => import('./pages/admin/AdminChatSuhbat'));

// Telegram Web App ichida ochilganda (initData bor) foydalanuvchi avtomatik
// akkauntiga kiradi: tanishuv sahifasida "Dashboard" tugmasini bosish shart emas.
function RootRoute() {
  const { status } = useAuth();
  const inTelegram = Boolean(window.Telegram?.WebApp?.initData);
  if (inTelegram) {
    if (status === 'loading') return <FullScreenLoader />;
    if (status === 'user') return <Navigate to="/dashboard" replace />;
    if (status === 'admin') return <Navigate to="/admin" replace />;
  }
  return <LandingPage />;
}

export default function App() {
  const { pathname } = useLocation();
  // Marketing footer (Boshlash/Narxlar/FAQ havolalari) faqat tanishuv
  // sahifasiga tegishli — ilova ichida (dashboard, botlar, chat...)
  // ko'rsatilsa, foydalanuvchi tanishuv sahifasi bilan aralashtirib
  // yuboradi. Shuning uchun faqat "/" da chiqadi.
  const showMarketingFooter = pathname === '/';

  return (
    <>
      <Suspense fallback={<FullScreenLoader />}>
      <Routes>
        <Route path="/webapp" element={<Navigate to="/dashboard" replace />} />
        <Route path="/link" element={<LinkAccount />} />
        <Route path="/panel" element={<Navigate to="/dashboard" replace />} />
        {/* Mehmon (login qilinmagan) sahifalar */}
        <Route
          path="/login"
          element={
            <RequireGuest>
              <Login />
            </RequireGuest>
          }
        />
        <Route
          path="/register"
          element={
            <RequireGuest>
              <Register />
            </RequireGuest>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <RequireGuest>
              <ForgotPassword />
            </RequireGuest>
          }
        />

        {/* Mehmon (login qilinmagan) sahifalar */}
        <Route path="/" element={<RootRoute />} />

        <Route
          element={
            <RequireUser>
              <Layout />
            </RequireUser>
          }
        >
          <Route path="/dashboard" element={<Home />} />
          <Route path="/bots" element={<MyBots />} />
          <Route path="/bots/:username" element={<BotDetail />} />
          <Route path="/bots/:username/manage" element={<Navigate to="/bots" replace />} />
          <Route path="/bots/:username/kunlik" element={<KunlikTolov />} />
          <Route path="/create" element={<Create />} />
          <Route path="/hamyon" element={<Wallet />} />
          <Route path="/vazifalar" element={<PulIshlash />} />
          <Route path="/referal" element={<Referal />} />
          <Route path="/profil" element={<Profil />} />
          <Route path="/ai" element={<AiBuilder />} />
          <Route path="/deposit" element={<Deposit />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/bots/:username/team" element={<Team />} />
          <Route path="/join" element={<JoinTeam />} />
          <Route path="/market" element={<Market />} />
          <Route path="/developer" element={<Navigate to="/dashboard" replace />} />
          <Route path="/tariflar" element={<Tariflar />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/sozlamalar" element={<Sozlamalar />} />
        </Route>

        {/* Admin sahifalari — alohida AdminLayout bilan */}
        <Route
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/platforma" element={<AdminPlatform />} />
          <Route path="/admin/kartalar" element={<AdminKartalar />} />
          <Route path="/admin/sorovlar" element={<AdminSorovlar />} />
          <Route path="/admin/rozilik" element={<AdminRozilik />} />
          <Route path="/admin/chat" element={<AdminChat />} />
          <Route path="/admin/chat/:uid" element={<AdminChatSuhbat />} />
          <Route path="/admin/tariflar" element={<AdminTariflar />} />
          <Route path="/admin/bot-tariflar" element={<AdminBotTariflar />} />
          <Route path="/admin/promokodlar" element={<AdminPromokodlar />} />
          <Route path="/admin/kanallar" element={<AdminKanallar />} />
          <Route path="/admin/turlar" element={<AdminTurlar />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>

      {showMarketingFooter && <Footer />}
    </>
  );
}
