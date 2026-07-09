import PageHero from "../components/ui/PageHero";
import AnimatedContainer from "../components/ui/AnimatedContainer";
import { formatPhonesInline } from "../utils/restaurantPhones";
import { useHomepageData } from "../hooks/useHomepageData";
import { usePageContent } from "../context/PageContentContext";
import { useLocationSelection } from "../context/LocationContext";
import { locPath } from "../utils/locationPaths";

export default function PrivacyPolicyPage() {
  const { bundle } = useHomepageData();
  const { fetchSection, interpolate } = usePageContent();
  const { selectedLocation, selectedLocationId } = useLocationSelection();
  const { settings } = bundle;

  const hero = fetchSection("privacy_policy", "hero", {
    label: "Legal",
    title: "Privacy Policy",
    subtitleTemplate: "How {name} {location} collects, uses and protects your information.",
  });
  const content = fetchSection("privacy_policy", "content", {
    introTemplate:
      "Last updated: {year}. This Privacy Policy explains how {name} ({address}) collects, uses and safeguards information when you visit our website, place an order, make a reservation or otherwise interact with us.",
    sections: [
      {
        title: "Information We Collect",
        textTemplate:
          "We may collect information you provide directly, such as your name, email address, phone number and reservation or order details, as well as information collected automatically through cookies and similar technologies when you browse our site.",
      },
      {
        title: "How We Use Information",
        textTemplate:
          "We use the information we collect to process reservations and orders, respond to enquiries, improve our website and services, and — where you have consented — to send promotional communications about offers and events at our locations.",
      },
      {
        title: "Third-Party Services",
        textTemplate:
          "Reservations, online ordering and delivery may be handled by trusted third-party platforms (such as OpenTable, ChefGaa and Uber Eats). Those providers have their own privacy policies governing the information you share with them directly.",
      },
      {
        title: "Contact Us",
        textTemplate:
          "If you have questions about this Privacy Policy or how your information is handled, please contact us at {email} or call {phone}.",
      },
    ],
  });

  const extraVars = {
    year: new Date().getFullYear(),
    address: selectedLocation?.address || settings.address,
    email: settings.email,
    phone: formatPhonesInline(settings.phones),
  };

  return (
    <div className="bg-ivory">
      <PageHero
        label={hero.label}
        title={hero.title}
        subtitle={interpolate(hero.subtitleTemplate, extraVars)}
        backgroundImage="/showcase/mandi.webp"
        breadcrumbItems={[
          { label: "Home", to: locPath(selectedLocationId, "/") },
          { label: "Privacy Policy" },
        ]}
      />

      <section className="page-content-start mx-auto max-w-[900px] px-6 pb-24 md:px-10">
        <AnimatedContainer>
          <div className="space-y-10 text-[15px] leading-relaxed text-cocoa/70">
            <p>{interpolate(content.introTemplate, extraVars)}</p>

            {content.sections.map((item) => (
              <div key={item.title}>
                <h2 className="font-serif text-xl font-semibold text-cocoa">{item.title}</h2>
                <p className="mt-3">{interpolate(item.textTemplate, extraVars)}</p>
              </div>
            ))}
          </div>
        </AnimatedContainer>
      </section>
    </div>
  );
}
