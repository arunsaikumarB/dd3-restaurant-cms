import { lazy, Suspense } from "react";
import { ORDER_OPTIONS } from "../data/orderPage";
import PageHero from "../components/ui/PageHero";
import OrderOptionCard from "../components/order/OrderOptionCard";
import FeatureGrid from "../components/order/FeatureGrid";
import SectionPlaceholder from "../components/ui/SectionPlaceholder";
import "../components/order/order.css";

const ReservationCTA = lazy(() => import("../components/order/ReservationCTA"));

export default function OrderPage() {
  return (
    <div className="order-page">
      <PageHero
        label="Order Online"
        title="Order Online"
        subtitle="Order authentic Indian food from Desi Dhamaka. Choose pickup or delivery — freshly prepared, delivered your way."
        backgroundImage="/showcase/biryani.jpg"
        backgroundVideo="/hero/videoplayback.mp4"
        breadcrumbItems={[
          { label: "Home", to: "/" },
          { label: "Order Online" },
        ]}
      />

      <section
        className="order-options page-content-start"
        aria-labelledby="order-options-heading"
      >
        <div className="order-page__texture" aria-hidden />
        <div className="order-options__inner">
          <h2 id="order-options-heading" className="sr-only">
            Choose your ordering method
          </h2>
          <div className="order-options__grid">
            {ORDER_OPTIONS.map((option, index) => (
              <OrderOptionCard key={option.id} option={option} index={index} />
            ))}
          </div>
        </div>
      </section>

      <FeatureGrid />
      <Suspense fallback={<SectionPlaceholder minHeight="320px" />}>
        <ReservationCTA />
      </Suspense>
    </div>
  );
}
