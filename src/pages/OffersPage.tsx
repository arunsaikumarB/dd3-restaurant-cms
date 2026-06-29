import PageHero from "../components/ui/PageHero";
import OffersGrid from "../components/offers/OffersGrid";
import { OffersPageSkeleton } from "../components/offers/OffersPageSkeleton";
import { useOffersData } from "../hooks/useOffersData";

export default function OffersPage() {
  const { offers, loading } = useOffersData();

  return (
    <div className="bg-ivory">
      <PageHero
        label="Offers"
        title="Special Offers"
        subtitle="Discover limited-time deals and exclusive promotions at Desi Dhamaka."
        backgroundImage="/showcase/tandoori.jpg"
        breadcrumbItems={[
          { label: "Home", to: "/" },
          { label: "Offers" },
        ]}
      />

      <section className="page-content-start mx-auto max-w-[1400px] px-6 pb-20 md:px-10 lg:px-16">
        {loading ? <OffersPageSkeleton /> : <OffersGrid offers={offers} />}
      </section>
    </div>
  );
}
