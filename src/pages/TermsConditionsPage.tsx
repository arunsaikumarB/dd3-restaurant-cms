import PageHero from "../components/ui/PageHero";
import AnimatedContainer from "../components/ui/AnimatedContainer";
import { formatPhonesInline } from "../utils/restaurantPhones";
import { useHomepageData } from "../hooks/useHomepageData";
import { useLocationSelection } from "../context/LocationContext";
import { locPath } from "../utils/locationPaths";

export default function TermsConditionsPage() {
  const { bundle } = useHomepageData();
  const { selectedLocation, selectedLocationId } = useLocationSelection();
  const { settings } = bundle;

  return (
    <div className="bg-ivory">
      <PageHero
        label="Legal"
        title="Terms & Conditions"
        subtitle={`The terms governing your use of ${settings.restaurant_name}${selectedLocation ? ` ${selectedLocation.shortName}` : ""}'s website and services.`}
        backgroundImage="/showcase/tandoori.webp"
        breadcrumbItems={[
          { label: "Home", to: locPath(selectedLocationId, "/") },
          { label: "Terms & Conditions" },
        ]}
      />

      <section className="page-content-start mx-auto max-w-[900px] px-6 pb-24 md:px-10">
        <AnimatedContainer>
          <div className="space-y-10 text-[15px] leading-relaxed text-cocoa/70">
            <p>
              Last updated: {new Date().getFullYear()}. These Terms & Conditions govern your use of
              the {settings.restaurant_name} website and any reservations, orders, offers or events
              booked through it.
            </p>

            <div>
              <h2 className="font-serif text-xl font-semibold text-cocoa">Reservations & Orders</h2>
              <p className="mt-3">
                Reservations and online orders are subject to availability and confirmation.
                Prices, menu items and offers may vary by location and are subject to change without
                notice. Special offers have their own terms, detailed on the relevant offer page.
              </p>
            </div>

            <div>
              <h2 className="font-serif text-xl font-semibold text-cocoa">Cancellations</h2>
              <p className="mt-3">
                Please contact the location directly to modify or cancel a reservation. Large party
                and private event bookings may be subject to a separate cancellation policy
                communicated at the time of booking.
              </p>
            </div>

            <div>
              <h2 className="font-serif text-xl font-semibold text-cocoa">Website Use</h2>
              <p className="mt-3">
                Content on this website is provided for general informational purposes. We make
                reasonable efforts to keep menu, pricing and location information accurate but do not
                guarantee it is free of errors or omissions.
              </p>
            </div>

            <div>
              <h2 className="font-serif text-xl font-semibold text-cocoa">Contact Us</h2>
              <p className="mt-3">
                Questions about these Terms & Conditions can be directed to{" "}
                <a href={`mailto:${settings.email}`} className="text-brand-primary underline-offset-4 hover:underline">
                  {settings.email}
                </a>{" "}
                or {formatPhonesInline(settings.phones)}.
              </p>
            </div>
          </div>
        </AnimatedContainer>
      </section>
    </div>
  );
}
