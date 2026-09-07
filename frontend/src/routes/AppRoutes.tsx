import { ReactNode } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Layout } from '../components/Layout';
import { Spinner } from '../components/ui';
import { LoginPage, RegisterPage } from '../pages/AuthPages';
import { CustomerDashboard, ProvidersCatalog, MySubscriptions, MyPayments } from '../pages/customer/Index';
import { MerchantDashboard, MerchantCustomers, NewCustomerPage } from '../pages/merchant/Index';
import {
  AdminOverview, AdminProviders, AdminPackages, AdminPaymentMethods, AdminMerchants, AdminSubscriptions, AdminPayments, AdminNotifications, AdminAuditLogs,
} from '../pages/admin/Index';

function Guard({ roles, children }: { roles: string[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner className="h-screen" />;
  if (!user) return <Navigate to="/login" replace />;
  const home = user.role === 'ADMIN' ? '/admin' : user.role === 'MERCHANT' ? '/merchant' : '/';
  if (!roles.includes(user.role)) return <Navigate to={home} replace />;
  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<Guard roles={['CUSTOMER']}><Layout><Outlet /></Layout></Guard>}>
        <Route path="/" element={<CustomerDashboard />} />
        <Route path="/providers" element={<ProvidersCatalog />} />
        <Route path="/subscriptions" element={<MySubscriptions />} />
        <Route path="/payments" element={<MyPayments />} />
      </Route>

      <Route element={<Guard roles={['MERCHANT']}><Layout><Outlet /></Layout></Guard>}>
        <Route path="/merchant" element={<MerchantDashboard />} />
        <Route path="/merchant/customers" element={<MerchantCustomers />} />
        <Route path="/merchant/customers/new" element={<NewCustomerPage />} />
      </Route>

      <Route element={<Guard roles={['ADMIN']}><Layout><Outlet /></Layout></Guard>}>
        <Route path="/admin" element={<AdminOverview />} />
        <Route path="/admin/providers" element={<AdminProviders />} />
        <Route path="/admin/packages" element={<AdminPackages />} />
        <Route path="/admin/payment-methods" element={<AdminPaymentMethods />} />
        <Route path="/admin/merchants" element={<AdminMerchants />} />
        <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
        <Route path="/admin/payments" element={<AdminPayments />} />
        <Route path="/admin/notifications" element={<AdminNotifications />} />
        <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}