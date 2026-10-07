import { Automation } from './pages/Automation';
import { AppLayout } from './components/AppLayout';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { StoreLayout } from './components/StoreLayout';
import { Shop, ProductDetail } from './pages/Shop';
import { Membership } from './pages/Membership';
import { Landing, StartBusiness, OwnerSetup } from './pages/Onboarding';

import { Access } from './lib/session';

import { SignIn, Preferences } from './pages/Account';

import { CustomerChat, Orders, OrderDetail } from './pages/Customer';
import { Checkout } from './pages/Checkout';
import { Agents, OwnerAssistant, EthicsControls } from './pages/Agents';
import { StockForecast, SalesPage, Members, BusinessSettings } from './pages/Business';
import { Campaigns, ContentStudio, RiskReview, CustomerInbox } from './pages/Growth';
import { CalendarPage } from './pages/Calendar';

import {
  OwnerOverview,
  OwnerReviews,
  OwnerCustomers,
  OwnerKnowledge,
  OwnerCapacity,
  OwnerEvidence,
} from './pages/Owner';

function OwnerShell() {
  return (
    <>
      <Routes>
        <Route index element={<OwnerOverview />} />
        <Route path="setup" element={<OwnerSetup />} />
        <Route path="agents" element={<Agents />} />
        <Route path="assistant" element={<OwnerAssistant />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="members" element={<Members />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="stock" element={<StockForecast />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="content" element={<ContentStudio />} />
        <Route path="risks" element={<RiskReview />} />
        <Route path="ethics" element={<EthicsControls />} />
        <Route path="business" element={<BusinessSettings />} />
        <Route path="orders" element={<Orders owner />} />
        <Route path="orders/:id" element={<OrderDetail owner />} />
        <Route path="reviews" element={<OwnerReviews />} />
        <Route path="customers" element={<OwnerCustomers />} />
        <Route path="knowledge" element={<OwnerKnowledge />} />
        <Route path="capacity" element={<OwnerCapacity />} />
        <Route path="automation" element={<Automation />} />
        <Route path="evidence" element={<OwnerEvidence />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

function NotFound() {
  return (
    <section className="panel">
      <h1>Page not found</h1>
      <p>Choose a workspace page from the navigation.</p>
      <Link className="button button-secondary" to="/">
        Back to workspace
      </Link>
    </section>
  );
}

export default function App() {
  const { pathname } = useLocation();
  const Layout = pathname.startsWith('/owner') ? AppLayout : StoreLayout;
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/start-business" element={<StartBusiness />} />
        <Route path="/b/:bakerySlug" element={<Shop />} />
        <Route path="/products" element={<Shop />} />
        <Route path="/b/:bakerySlug/products/:sku" element={<ProductDetail />} />
        <Route
          path="/account/membership"
          element={
            <Access role="customer">
              <Membership />
            </Access>
          }
        />
        <Route
          path="/b/:bakerySlug/chat"
          element={
            <Access role="customer">
              <CustomerChat />
            </Access>
          }
        />
        <Route path="/sign-in" element={<SignIn />} />
        <Route
          path="/checkout"
          element={
            <Access role="customer">
              <Checkout />
            </Access>
          }
        />
        <Route
          path="/account/inbox"
          element={
            <Access role="customer">
              <CustomerInbox />
            </Access>
          }
        />
        <Route
          path="/account/orders"
          element={
            <Access role="customer">
              <Orders />
            </Access>
          }
        />
        <Route
          path="/account/orders/:id"
          element={
            <Access role="customer">
              <OrderDetail />
            </Access>
          }
        />
        <Route
          path="/account/preferences"
          element={
            <Access role="customer">
              <Preferences />
            </Access>
          }
        />
        <Route
          path="/owner/*"
          element={
            <Access role="owner">
              <OwnerShell />
            </Access>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
