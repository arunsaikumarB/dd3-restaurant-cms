import { lazy, Suspense } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import ScrollToTop from "./components/layout/ScrollToTop";
import PageTransition from "./components/layout/PageTransition";
import PageLoader from "./components/layout/PageLoader";
import PageSEO from "./components/seo/PageSEO";
import AdminLayout from "./admin/components/layout/AdminLayout";
import ProtectedRoute from "./admin/components/ProtectedRoute";
import GuestRoute from "./admin/components/GuestRoute";
import UnauthorizedRoute from "./admin/components/UnauthorizedRoute";

const AdminLoginPage = lazy(() => import("./admin/pages/LoginPage"));
const AdminUnauthorizedPage = lazy(() => import("./admin/pages/UnauthorizedPage"));
const AdminDashboardPage = lazy(() => import("./admin/pages/DashboardPage"));
const AdminHomepagePage = lazy(() => import("./admin/pages/HomepagePage"));
const AdminMenuPage = lazy(() => import("./admin/pages/MenuPage"));
const AdminCategoriesPage = lazy(() => import("./admin/pages/CategoriesPage"));
const AdminOffersPage = lazy(() => import("./admin/pages/OffersPage"));
const AdminGalleryPage = lazy(() => import("./admin/pages/GalleryPage"));
const AdminReservationsPage = lazy(() => import("./admin/pages/ReservationsPage"));
const AdminReviewsPage = lazy(() => import("./admin/pages/ReviewsPage"));
const AdminSettingsPage = lazy(() => import("./admin/pages/SettingsPage"));
const AdminProfilePage = lazy(() => import("./admin/pages/ProfilePage"));

const HomePage = lazy(() => import("./pages/HomePage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const MenuPage = lazy(() => import("./pages/MenuPage"));
const CateringPage = lazy(() => import("./pages/CateringPage"));
const PartiesPage = lazy(() => import("./pages/PartiesPage"));
const TestimonialsPage = lazy(() => import("./pages/TestimonialsPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const OrderPage = lazy(() => import("./pages/OrderPage"));
const GalleryPage = lazy(() => import("./pages/GalleryPage"));
const OffersPage = lazy(() => import("./pages/OffersPage"));
const ReservationPage = lazy(() => import("./pages/ReservationPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

function PublicRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <PageTransition>
              <HomePage />
            </PageTransition>
          }
        />
        <Route
          path="/about"
          element={
            <PageTransition>
              <AboutPage />
            </PageTransition>
          }
        />
        <Route
          path="/menu"
          element={
            <PageTransition>
              <MenuPage />
            </PageTransition>
          }
        />
        <Route
          path="/catering"
          element={
            <PageTransition>
              <CateringPage />
            </PageTransition>
          }
        />
        <Route
          path="/parties"
          element={
            <PageTransition>
              <PartiesPage />
            </PageTransition>
          }
        />
        <Route
          path="/testimonials"
          element={
            <PageTransition>
              <TestimonialsPage />
            </PageTransition>
          }
        />
        <Route
          path="/contact"
          element={
            <PageTransition>
              <ContactPage />
            </PageTransition>
          }
        />
        <Route
          path="/order"
          element={
            <PageTransition>
              <OrderPage />
            </PageTransition>
          }
        />
        <Route
          path="/gallery"
          element={
            <PageTransition>
              <GalleryPage />
            </PageTransition>
          }
        />
        <Route
          path="/offers"
          element={
            <PageTransition>
              <OffersPage />
            </PageTransition>
          }
        />
        <Route
          path="/reservation"
          element={
            <PageTransition>
              <ReservationPage />
            </PageTransition>
          }
        />
        <Route
          path="*"
          element={
            <PageTransition>
              <NotFoundPage />
            </PageTransition>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

function PublicSiteShell() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-saffron focus:px-4 focus:py-2 focus:text-cocoa"
      >
        Skip to main content
      </a>
      <PageSEO />
      <ScrollToTop />
      <Navbar />
      <main id="main-content">
        <PublicRoutes />
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route
          path="/admin/login"
          element={
            <GuestRoute>
              <AdminLoginPage />
            </GuestRoute>
          }
        />
        <Route
          path="/admin/unauthorized"
          element={
            <UnauthorizedRoute>
              <AdminUnauthorizedPage />
            </UnauthorizedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="homepage" element={<AdminHomepagePage />} />
          <Route path="menu" element={<AdminMenuPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="offers" element={<AdminOffersPage />} />
          <Route path="gallery" element={<AdminGalleryPage />} />
          <Route path="reservations" element={<AdminReservationsPage />} />
          <Route path="reviews" element={<AdminReviewsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="profile" element={<AdminProfilePage />} />
        </Route>
        <Route path="*" element={<PublicSiteShell />} />
      </Routes>
    </Suspense>
  );
}
