import PageHero from "../components/ui/PageHero";
import AnimatedContainer from "../components/ui/AnimatedContainer";
import { formatPhonesInline } from "../utils/restaurantPhones";
import { useHomepageData } from "../hooks/useHomepageData";
import { usePageContent } from "../context/PageContentContext";
import { useLocationSelection } from "../context/LocationContext";
import { locPath } from "../utils/locationPaths";

export default function TermsConditionsPage() {
  const { bundle } = useHomepageData();
  const { fetchSection, interpolate } = usePageContent();
  const { selectedLocationId } = useLocationSelection();
  const { settings } = bundle;

  const hero = fetchSection("terms_conditions", "hero", {
    label: "Legal",
    title: "Terms & Conditions",
    subtitleTemplate: "The terms governing your use of {name} {location}'s website and services.",
  });
  const content = fetchSection("terms_conditions", "content", {
    introTemplate:
      "Last updated: {year}. These Terms & Conditions govern your use of the {name} website and any reservations, orders, offers or events booked through it.",
    sections: [
      {
        title: "Reservations & Orders",
        textTemplate:
          "Reservations and online orders are subject to availability and confirmation. Prices, menu items and offers may vary by location and are subject to change without notice. Special offers have their own terms, detailed on the relevant offer page.",
      },
      {
        title: "Cancellations",
        textTemplate:
          "Please contact the location directly to modify or cancel a reservation. Large party and private event bookings may be subject to a separate cancellation policy communicated at the time of booking.",
      },
      {
        title: "Website Use",
        textTemplate:
          "Content on this website is provided for general informational purposes. We make reasonable efforts to keep menu, pricing and location information accurate but do not guarantee it is free of errors or omissions.",
      },
      {
        title: "Contact Us",
        textTemplate:
          "Questions about these Terms & Conditions can be directed to {email} or {phone}.",
      },
    ],
  });

  const extraVars = {
    year: new Date().getFullYear(),
    email: settings.email,
    phone: formatPhonesInline(settings.phones),
  };

  return (
    <div className="bg-ivory">
      <PageHero
        label={hero.label}
        title={hero.title}
        subtitle={interpolate(hero.subtitleTemplate, extraVars)}
        backgroundImage="/showcase/tandoori.webp"
        breadcrumbItems={[
          { label: "Home", to: locPath(selectedLocationId, "/") },
          { label: "Terms & Conditions" },
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
