import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import NewEstimate from './pages/customer/NewEstimate';
import EstimateDetail from './pages/customer/EstimateDetail';
import ReviewEstimate from './pages/craftsman/ReviewEstimate';
import AdminDashboard from './pages/AdminDashboard';
import DemoLauncher from './pages/DemoLauncher';
import EstimateFlow from './pages/customer/EstimateFlow';
import CompletePage from './pages/CompletePage';
import ProSignupPage from './pages/ProSignupPage';
import PolicyPage from './pages/PolicyPage';
import CorporateRequest from './pages/corporate/CorporateRequest';
import AdminRequests from './pages/admin/AdminRequests';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import ProJobs from './pages/pro/ProJobs';
import CraftsmanJobsPage from './pages/craftsman/CraftsmanJobsPage';
import CraftsmanProfile from './pages/craftsman/CraftsmanProfile';
import HelpRequestPage from './pages/craftsman/HelpRequestPage';
import HelpListPage from './pages/craftsman/HelpListPage';
import CraftsmanApplyPage from './pages/craftsman/CraftsmanApplyPage';
import CraftsmanApplicationsPage from './pages/craftsman/CraftsmanApplicationsPage';
import CraftsmanPublicProfile from './pages/craftsman/CraftsmanPublicProfile';
import CraftsmanDashboardPage from './pages/craftsman/CraftsmanDashboardPage';
import RequestApplicationsPage from './pages/customer/RequestApplicationsPage';
import HomePage from './pages/HomePage';
import ToolsPage from './pages/ToolsPage';
import ReviewPage from './pages/customer/ReviewPage';
import FaqPage     from './pages/FaqPage';
import SupportPage from './pages/SupportPage';
import TermsPage   from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import LegalPage   from './pages/LegalPage';
import RequestExtraInfoPage from './pages/corporate/RequestExtraInfoPage';

// ─── 紹介コード捕捉（モジュール起動時 — React Router リダイレクト前に実行）────
{
  const _ref = new URLSearchParams(window.location.search).get('ref');
  if (_ref && /^PROM-[A-Z0-9]{4}$/i.test(_ref)) {
    try { localStorage.setItem('promatch_referral_code', _ref.toUpperCase()); } catch {}
  }
}

// ─── ログイン済み案内カード ──────────────────────────────────────────────────
// /login /register /for-pros にログイン済み職人が来たとき、勝手にダッシュボードへ
// 飛ばす代わりにこのカードを表示する。

function AlreadyLoggedIn({
  user,
  onLogout,
}: {
  user: ReturnType<typeof useAuth>['user'];
  onLogout: () => void;
}) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">👷</span>
          </div>
          <p className="text-sm font-bold text-slate-700">{user?.name} さん</p>
          <p className="text-xs text-slate-400 mt-0.5">すでに職人アカウントでログインしています</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-3">
          <button
            onClick={() => navigate('/craftsman/dashboard')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition active:scale-95"
          >
            案件管理を開く
          </button>
          <button
            onClick={() => navigate('/craftsman/jobs')}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition active:scale-95"
          >
            案件を探す
          </button>
          <button
            onClick={async () => { await onLogout(); navigate('/login'); }}
            className="w-full text-slate-400 hover:text-slate-600 font-medium py-2.5 text-sm transition"
          >
            ログアウトする
          </button>
        </div>
      </div>
    </div>
  );
}

function CraftsmanEstimateRoute({ user, logout }: { user: ReturnType<typeof useAuth>['user']; logout: () => void }) {
  const { id } = useParams();
  if (user?.role === 'craftsman') return <Layout user={user} onLogout={logout}><ReviewEstimate /></Layout>;
  if (id === 'demo') return <ReviewEstimate />;
  return <Navigate to="/login" />;
}

export default function App() {
  const { user, login, logout } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          user?.role === 'craftsman' ? <AlreadyLoggedIn user={user} onLogout={logout} /> :
          user?.role === 'customer'  ? <Navigate to="/customer" replace /> :
          <Login onLogin={login} />
        } />
        <Route path="/register" element={
          user?.role === 'craftsman' ? <AlreadyLoggedIn user={user} onLogout={logout} /> :
          user?.role === 'customer'  ? <Navigate to="/customer" replace /> :
          <Register onLogin={login} />
        } />

        {/* お客様ルート */}
        <Route path="/customer" element={
          user?.role === 'customer'
            ? <Layout user={user} onLogout={logout}><CustomerDashboard /></Layout>
            : <Navigate to="/login" />
        } />
        <Route path="/customer/estimate/new" element={
          user?.role === 'customer'
            ? <Layout user={user} onLogout={logout}><NewEstimate /></Layout>
            : <Navigate to="/login" />
        } />
        <Route path="/customer/estimate/flow" element={<EstimateFlow />} />
        <Route path="/customer/estimate/:id" element={
          user?.role === 'customer'
            ? <Layout user={user} onLogout={logout}><EstimateDetail /></Layout>
            : <Navigate to="/login" />
        } />

        {/* 職人ルート: 旧UI (CraftsmanDashboard) は廃止。全トラフィックを新UIへ転送 */}
        <Route path="/craftsman" element={<Navigate to="/craftsman/dashboard" replace />} />
        <Route path="/craftsman/estimate/:id" element={
          <CraftsmanEstimateRoute user={user} logout={logout} />
        } />

        {/* 管理・デモページ */}
        <Route path="/admin"           element={<AdminDashboard />} />
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/requests"  element={<AdminRequests />} />
        <Route path="/demo"       element={<DemoLauncher />} />
        <Route path="/corporate"  element={<CorporateRequest />} />

        {/* 職人向け案件ボード・プロフィール */}
        <Route path="/pro/jobs"           element={<ProJobs />} />
        <Route path="/craftsman/jobs"     element={<CraftsmanJobsPage />} />
        <Route path="/craftsman/dashboard"           element={<CraftsmanDashboardPage />} />
        <Route path="/request/:id/applications"    element={<RequestApplicationsPage />} />
        <Route path="/request/:id/review"          element={<ReviewPage />} />
        <Route path="/request/:id/extra-info"      element={<RequestExtraInfoPage />} />
        <Route path="/craftsman/profile"          element={<CraftsmanProfile />} />
        <Route path="/craftsman/profile/:userId"   element={<CraftsmanPublicProfile />} />
        <Route path="/craftsman/help"      element={<HelpRequestPage />} />
        <Route path="/craftsman/help-list" element={<HelpListPage />} />
        <Route path="/craftsman/apply/:id"    element={<CraftsmanApplyPage />} />
        <Route path="/craftsman/applications" element={<CraftsmanApplicationsPage />} />
        <Route path="/tools" element={<ToolsPage />} />

        {/* 公開ページ */}
        <Route path="/complete"   element={<CompletePage />} />
        <Route path="/pro-signup" element={<ProSignupPage />} />
        <Route path="/for-pros"   element={
          user?.role === 'craftsman' ? <AlreadyLoggedIn user={user} onLogout={logout} /> :
          <ProSignupPage />
        } />
        <Route path="/policy"     element={<PolicyPage />} />
        <Route path="/faq"        element={<FaqPage />} />
        <Route path="/support"    element={<SupportPage />} />
        <Route path="/terms"      element={<TermsPage />} />
        <Route path="/privacy"    element={<PrivacyPage />} />
        <Route path="/legal"      element={<LegalPage />} />

        {/* ランディング：ログイン状態に関わらず常にトップページを表示（職人を勝手に飛ばさない） */}
        <Route path="/" element={<HomePage />} />

        {/* 未定義ルート：安全にトップへ（role redirect は絶対かけない） */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
