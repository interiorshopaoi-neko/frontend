import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import NewEstimate from './pages/customer/NewEstimate';
import EstimateDetail from './pages/customer/EstimateDetail';
import CraftsmanDashboard from './pages/craftsman/CraftsmanDashboard';
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
import JobsLockedPreview from './components/JobsLockedPreview';
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
          user ? <Navigate to={user.role === 'customer' ? '/corporate' : '/craftsman'} /> : <Login onLogin={login} />
        } />
        <Route path="/register" element={
          user ? <Navigate to={user.role === 'customer' ? '/corporate' : '/craftsman'} /> : <Register onLogin={login} />
        } />

        {/* お客様ルート — 現在の MVP では顧客の主導線は /corporate (依頼フォーム)。
            旧 CustomerDashboard (Layout 経由・旧 backend api.get('/estimates/my') 依存)
            は本番導線から外し、customer role が /customer に来た場合は /corporate へ
            リダイレクトする。未認証は従来通り /login へ。 */}
        <Route path="/customer" element={
          user?.role === 'customer'
            ? <Navigate to="/corporate" replace />
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

        {/* 職人ルート — /craftsman は最新の BottomNav 付き UI (/craftsman/jobs) へリダイレクト。
            旧 CraftsmanDashboard (Layout 経由・BottomNav なし) は import は残すが
            このルートからは参照されない（直リンクは無いので事実上の deprecate）。
            未認証は従来通り /login へ。 */}
        <Route path="/craftsman" element={
          user?.role === 'craftsman'
            ? <Navigate to="/craftsman/jobs" replace />
            : <Navigate to="/login" />
        } />
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
        <Route path="/pro/jobs"           element={
          user?.role === 'craftsman' ? <ProJobs /> : <JobsLockedPreview />
        } />
        <Route path="/craftsman/jobs"     element={
          user?.role === 'craftsman' ? <CraftsmanJobsPage /> : <JobsLockedPreview />
        } />
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
        <Route path="/for-pros"   element={<ProSignupPage />} />
        <Route path="/policy"     element={<PolicyPage />} />
        <Route path="/faq"        element={<FaqPage />} />
        <Route path="/support"    element={<SupportPage />} />
        <Route path="/terms"      element={<TermsPage />} />
        <Route path="/privacy"    element={<PrivacyPage />} />
        <Route path="/legal"      element={<LegalPage />} />

        {/* ランディング：未ログインなら新トップページ、ログイン済みは role 別の主導線へ。
            customer は /corporate (依頼フォーム)、craftsman は /craftsman (→/craftsman/jobs)。 */}
        <Route path="/" element={
          user
            ? <Navigate to={user.role === 'customer' ? '/corporate' : '/craftsman'} />
            : <HomePage />
        } />

        <Route path="*" element={
          <Navigate to={user ? (user.role === 'customer' ? '/corporate' : '/craftsman') : '/'} />
        } />
      </Routes>
    </BrowserRouter>
  );
}
