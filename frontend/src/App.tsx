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
import LandingEstimate from './pages/LandingEstimate';
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
          user ? <Navigate to={user.role === 'customer' ? '/customer' : '/craftsman'} /> : <Login onLogin={login} />
        } />
        <Route path="/register" element={
          user ? <Navigate to={user.role === 'customer' ? '/customer' : '/craftsman'} /> : <Register onLogin={login} />
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

        {/* 職人ルート */}
        <Route path="/craftsman" element={
          user?.role === 'craftsman'
            ? <Layout user={user} onLogout={logout}><CraftsmanDashboard /></Layout>
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
        <Route path="/pro/jobs"           element={<ProJobs />} />
        <Route path="/craftsman/jobs"     element={<CraftsmanJobsPage />} />
        <Route path="/craftsman/dashboard"           element={<CraftsmanDashboardPage />} />
        <Route path="/request/:id/applications"    element={<RequestApplicationsPage />} />
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
        <Route path="/policy"     element={<PolicyPage />} />

        {/* ランディング：未ログインなら新トップページ、ログイン済みはダッシュボードへ */}
        <Route path="/" element={
          user
            ? <Navigate to={user.role === 'customer' ? '/customer' : '/craftsman'} />
            : <HomePage />
        } />

        <Route path="*" element={
          <Navigate to={user ? (user.role === 'customer' ? '/customer' : '/craftsman') : '/'} />
        } />
      </Routes>
    </BrowserRouter>
  );
}
