import { lazy, Suspense, useLayoutEffect } from "react";
import { Routes, Route, useLocation, Navigate, useParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import ScrollToTop from "./components/layout/ScrollToTop";
import PageTransition from "./components/layout/PageTransition";
import PageLoader from "./components/layout/PageLoader";
import TrailingSlashRedirect from "./components/layout/TrailingSlashRedirect";
import PageSEO from "./components/seo/PageSEO";
import AdminLayout from "./admin/components/layout/AdminLayout";
import ProtectedRoute from "./admin/components/ProtectedRoute";
import GuestRoute from "./admin/components/GuestRoute";
import UnauthorizedRoute from "./admin/components/UnauthorizedRoute";
import { LocationProvider, useLocationSelection } from "./context/LocationContext";
import { PageContentProvider } from "./context/PageContentContext";
import { usePageTracking } from "./hooks/usePageTracking";
import { MenuExperienceSwitch } from "./demo/menuExperience";
import { isLocationId, resolvePublicLocationId } from "./config/locations";

const AdminLoginPage = lazy(() => import("./admin/pages/LoginPage"));
const AdminUnauthorizedPage = lazy(() => import("./admin/pages/UnauthorizedPage"));
const AdminDashboardPage = lazy(() => import("./admin/pages/DashboardPage"));
const AdminInsightsPage = lazy(() => import("./admin/pages/InsightsPage"));
const AdminHomepagePage = lazy(() => import("./admin/pages/HomepagePage"));
const AdminPagesPage = lazy(() => import("./admin/pages/PagesPage"));
const AdminOffersPage = lazy(() => import("./admin/pages/OffersManagementPage"));
const AdminGalleryPage = lazy(() => import("./admin/pages/GalleryPage"));
const AdminChefGaaIntegrationPage = lazy(() => import("./admin/pages/ChefGaaIntegrationPage"));
const AdminReviewsPage = lazy(() => import("./admin/pages/ReviewsPage"));
const AdminSettingsPage = lazy(() => import("./admin/pages/SettingsPage"));
const AdminSeoPage = lazy(() => import("./admin/pages/SeoPage"));
const AdminProfilePage = lazy(() => import("./admin/pages/ProfilePage"));

const LocationGatePage = lazy(() => import("./pages/LocationGatePage"));
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
const OfferDetailPage = lazy(() => import("./pages/OfferDetailPage"));
const ReservationPage = lazy(() => import("./pages/ReservationPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const TermsConditionsPage = lazy(() => import("./pages/TermsConditionsPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

/** Redirects a legacy segment (e.g. /order/) to its renamed path, preserving location + query. */
function LegacySegmentRedirect({ to }: { to: string }) {
  const { locationId } = useParams<{ locationId: string }>();
  const { search, hash } = useLocation();
  return <Navigate to={`/${locationId}/${to}/${search}${hash}`} replace />;
}

/** Redirects legacy /offers/:slug detail links to /special-offers/:slug. */
function LegacyOfferDetailRedirect() {
  const { locationId, slug } = useParams<{ locationId: string; slug: string }>();
  const { search, hash } = useLocation();
  return <Navigate to={`/${locationId}/special-offers/${slug}/${search}${hash}`} replace />;
}

/** Page routes for a single location, matched relative to `/:locationId/`. */
function LocationPageRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes key={location.pathname}>
        <Route
          index
          element={
            <PageTransition>
              <HomePage />
            </PageTransition>
          }
        />
        <Route
          path="about"
          element={
            <PageTransition>
              <AboutPage />
            </PageTransition>
          }
        />
        <Route
          path="menu"
          element={
            <PageTransition>
              <MenuPage />
            </PageTransition>
          }
        />
        <Route
          path="catering"
          element={
            <PageTransition>
              <CateringPage />
            </PageTransition>
          }
        />
        <Route
          path="parties"
          element={
            <PageTransition>
              <PartiesPage />
            </PageTransition>
          }
        />
        <Route
          path="testimonials"
          element={
            <PageTransition>
              <TestimonialsPage />
            </PageTransition>
          }
        />
        <Route
          path="contact"
          element={
            <PageTransition>
              <ContactPage />
            </PageTransition>
          }
        />
        <Route
          path="online-ordering"
          element={
            <PageTransition>
              <OrderPage />
            </PageTransition>
          }
        />
        <Route path="order" element={<LegacySegmentRedirect to="online-ordering" />} />
        <Route
          path="gallery"
          element={
            <PageTransition>
              <GalleryPage />
            </PageTransition>
          }
        />
        <Route
          path="special-offers"
          element={
            <PageTransition>
              <OffersPage />
            </PageTransition>
          }
        />
        <Route
          path="special-offers/:slug"
          element={
            <PageTransition>
              <OfferDetailPage />
            </PageTransition>
          }
        />
        <Route path="offers" element={<LegacySegmentRedirect to="special-offers" />} />
        <Route path="offers/:slug" element={<LegacyOfferDetailRedirect />} />
        <Route
          path="privacy-policy"
          element={
            <PageTransition>
              <PrivacyPolicyPage />
            </PageTransition>
          }
        />
        <Route
          path="terms-conditions"
          element={
            <PageTransition>
              <TermsConditionsPage />
            </PageTransition>
          }
        />
        <Route
          path="reservation"
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

function PublicSiteChrome() {
  usePageTracking();

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
        <LocationPageRoutes />
      </main>
      <Footer />
      <MenuExperienceSwitch />
    </>
  );
}

/**
 * Validates `:locationId`, syncs it into context, and renders the site chrome.
 * Any invalid segment (including legacy flat links like `/menu` left over
 * from before location-prefixed routing) redirects to the same path under
 * the visitor's stored or default location, so no internal link ever
 * dead-ends into a blank page.
 */
function LocationSiteShell() {
  const { locationId } = useParams<{ locationId: string }>();
  const location = useLocation();
  const { syncLocationFromUrl } = useLocationSelection();
  const valid = !!locationId && isLocationId(locationId);

  useLayoutEffect(() => {
    if (valid && locationId) {
      syncLocationFromUrl(locationId);
    }
  }, [locationId, syncLocationFromUrl, valid]);

  if (!valid) {
    const resolved = resolvePublicLocationId(null);
    return <Navigate to={`/${resolved}${location.pathname}`} replace />;
  }

  return (
    <PageContentProvider>
      <PublicSiteChrome />
    </PageContentProvider>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <TrailingSlashRedirect />
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
          <Route path="insights" element={<AdminInsightsPage />} />
          <Route path="homepage" element={<AdminHomepagePage />} />
          <Route path="pages" element={<AdminPagesPage />} />
          <Route path="offers" element={<AdminOffersPage />} />
          <Route path="gallery" element={<AdminGalleryPage />} />
          <Route path="integrations/chefgaa" element={<AdminChefGaaIntegrationPage />} />
          <Route path="reviews" element={<AdminReviewsPage />} />
          <Route path="seo" element={<AdminSeoPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="profile" element={<AdminProfilePage />} />
        </Route>

        <Route
          path="*"
          element={
            <LocationProvider>
              <Routes>
                <Route path="/" element={<LocationGatePage />} />
                <Route path=":locationId/*" element={<LocationSiteShell />} />
              </Routes>
            </LocationProvider>
          }
        />
      </Routes>
    </Suspense>
  );
}
