import PageHero from "../components/ui/PageHero";
import AnimatedContainer from "../components/ui/AnimatedContainer";
import { formatPhonesInline } from "../utils/restaurantPhones";
import { useHomepageData } from "../hooks/useHomepageData";
import { useLocationSelection } from "../context/LocationContext";
import { locPath } from "../utils/locationPaths";

export default function PrivacyPolicyPage() {
  const { bundle } = useHomepageData();
  const { selectedLocation, selectedLocationId } = useLocationSelection();
  const { settings } = bundle;

  return (
    <div className="bg-ivory">
      <PageHero
        label="Legal"
        title="Privacy Policy"
        subtitle={`How ${settings.restaurant_name}${selectedLocation ? ` ${selectedLocation.shortName}` : ""} collects, uses and protects your information.`}
        backgroundImage="/showcase/mandi.webp"
        breadcrumbItems={[
          { label: "Home", to: locPath(selectedLocationId, "/") },
          { label: "Privacy Policy" },
        ]}
      />

      <section className="page-content-start mx-auto max-w-[900px] px-6 pb-24 md:px-10">
        <AnimatedContainer>
          <div className="space-y-10 text-[15px] leading-relaxed text-cocoa/70">
            <p>
              Last updated: {new Date().getFullYear()}. This Privacy Policy explains how{" "}
              {settings.restaurant_name} ({selectedLocation?.address || settings.address}) collects,
              uses and safeguards information when you visit our website, place an order, make a
              reservation or otherwise interact with us.
            </p>

            <div>
              <h2 className="font-serif text-xl font-semibold text-cocoa">Information We Collect</h2>
              <p className="mt-3">
                We may collect information you provide directly, such as your name, email address,
                phone number and reservation or order details, as well as information collected
                automatically through cookies and similar technologies when you browse our site.
              </p>
            </div>

            <div>
              <h2 className="font-serif text-xl font-semibold text-cocoa">How We Use Information</h2>
              <p className="mt-3">
                We use the information we collect to process reservations and orders, respond to
                enquiries, improve our website and services, and — where you have consented — to send
                promotional communications about offers and events at our locations.
              </p>
            </div>

            <div>
              <h2 className="font-serif text-xl font-semibold text-cocoa">Third-Party Services</h2>
              <p className="mt-3">
                Reservations, online ordering and delivery may be handled by trusted third-party
                platforms (such as OpenTable, ChefGaa and Uber Eats). Those providers have their own
                privacy policies governing the information you share with them directly.
              </p>
            </div>

            <div>
              <h2 className="font-serif text-xl font-semibold text-cocoa">Contact Us</h2>
              <p className="mt-3">
                If you have questions about this Privacy Policy or how your information is handled,
                please contact us at{" "}
                <a href={`mailto:${settings.email}`} className="text-brand-primary underline-offset-4 hover:underline">
                  {settings.email}
                </a>{" "}
                or call {formatPhonesInline(settings.phones)}.
              </p>
            </div>
          </div>
        </AnimatedContainer>
      </section>
    </div>
  );
}
