import { motion } from "framer-motion";
import { usePageContent } from "../../context/PageContentContext";
import { useHomepageData } from "../../hooks/useHomepageData";
import { buildReservationContactCards } from "../../services/homepagePublic";
import PhoneLinks from "../ui/PhoneLinks";
import SectionHeading from "../ui/SectionHeading";
import {
  containerVariants,
  fadeUpItem,
  viewportOnce,
} from "../showcase/motion";

const contactIcons = {
  phone: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M6.5 4h3l1.5 4-2 1.5c1 2.5 2.8 4.3 5.3 5.3L16 13l4 1.5v3c0 .8-.7 1.5-1.5 1.5C9.8 19 5 14.2 5 7.5 5 6.7 5.7 6 6.5 6V4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  ),
  email: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  location: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21s7-4.5 7-11a7 7 0 10-14 0c0 6.5 7 11 7 11z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  clock: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

const CONTACT_TITLE_KEYS = {
  phone: "phoneTitle",
  email: "emailTitle",
  visit: "visitTitle",
  hours: "hoursTitle",
} as const;

export default function ContactCards() {
  const { fetchSection } = usePageContent();
  const { bundle } = useHomepageData();
  const section = fetchSection("reservation", "contact_section", {
    eyebrow: "Restaurant Information",
    title: "We're Here for You",
    subtitle: "Reach out directly or visit us — our team is ready to welcome you.",
    phoneTitle: "Call Us",
    emailTitle: "Email",
    visitTitle: "Visit Us",
    hoursTitle: "Business Hours",
  });
  const contactItems = buildReservationContactCards(bundle.settings).map((item) => {
    const titleKey = CONTACT_TITLE_KEYS[item.id as keyof typeof CONTACT_TITLE_KEYS];
    return {
      ...item,
      title: titleKey ? section[titleKey] : item.title,
    };
  });

  return (
    <section className="reservation-contact" aria-labelledby="contact-title">
      <div className="reservation-contact__inner">
        <SectionHeading
          eyebrow={section.eyebrow}
          title={section.title}
          subtitle={section.subtitle}
          align="center"
        />
        <h2 id="contact-title" className="sr-only">
          Contact information
        </h2>

        <motion.div
          className="reservation-contact__grid"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {contactItems.map((item) => (
            <motion.div key={item.id} className="reservation-contact__card" variants={fadeUpItem}>
              <div className="reservation-contact__icon">{contactIcons[item.icon]}</div>
              <h3 className="reservation-contact__title">{item.title}</h3>
              {item.id === "phone" && item.phones && item.phones.length > 1 ? (
                <PhoneLinks
                  phones={item.phones}
                  linkClassName="reservation-contact__value reservation-contact__link block"
                />
              ) : item.href ? (
                <a href={item.href} className="reservation-contact__value reservation-contact__link">
                  {item.value}
                </a>
              ) : (
                <p className="reservation-contact__value">{item.value}</p>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
