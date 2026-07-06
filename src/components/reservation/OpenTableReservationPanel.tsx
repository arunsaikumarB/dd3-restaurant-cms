import { motion } from "framer-motion";
import { Calendar, Clock, ExternalLink, MapPin, Phone } from "lucide-react";
import { usePageContent } from "../../context/PageContentContext";
import { useLocationSelection } from "../../context/LocationContext";
import { useHomepageData } from "../../hooks/useHomepageData";
import { formatOpeningHoursRows } from "../../services/homepagePublic";
import { getLocationConfig, resolvePublicLocationId } from "../../config/locations";
import { EASE_POWER3, viewportOnce } from "../showcase/motion";
import PhoneLinks from "../ui/PhoneLinks";

type Props = {
  openTableUrl: string;
};

export default function OpenTableReservationPanel({ openTableUrl }: Props) {
  const { fetchSection } = usePageContent();
  const { selectedLocationId } = useLocationSelection();
  const { bundle } = useHomepageData();
  const location = getLocationConfig(resolvePublicLocationId(selectedLocationId));
  const hoursRows = formatOpeningHoursRows(bundle.settings.opening_hours);

  const copy = fetchSection("reservation", "opentable_panel", {
    step: "Reserve Online",
    title: "Book Your Table on OpenTable",
    subtitle:
      "Secure your table in seconds. Choose your date, time, and party size through our trusted OpenTable partner.",
    ctaLabel: "Reserve on OpenTable",
    callLabel: "Or Call to Reserve",
    perks: [
      "Instant confirmation",
      "Modify or cancel anytime",
      "Special requests welcome",
    ],
  });

  const openOpenTable = () => {
    window.open(openTableUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <motion.div
      className="reservation-form-wrap"
      initial={{ opacity: 0, x: 24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.9, ease: EASE_POWER3 }}
    >
      <div className="reservation-form reservation-opentable">
        <div className="reservation-form__header">
          <p className="reservation-form__step">{copy.step}</p>
          <h2 className="reservation-form__title">{copy.title}</h2>
          <p className="reservation-form__subtitle">{copy.subtitle}</p>
        </div>

        <div className="reservation-opentable__location">
          <div className="reservation-opentable__location-row">
            <MapPin size={18} aria-hidden />
            <div>
              <p className="reservation-opentable__location-label">Location</p>
              <p className="reservation-opentable__location-value">{location.name}</p>
              <p className="reservation-opentable__location-meta whitespace-pre-line">
                {bundle.settings.address?.trim() || location.address}
              </p>
            </div>
          </div>

          <div className="reservation-opentable__location-row">
            <Phone size={18} aria-hidden />
            <div>
              <p className="reservation-opentable__location-label">{copy.callLabel}</p>
              <PhoneLinks
                phones={
                  bundle.settings.phones.length > 0
                    ? bundle.settings.phones
                    : [bundle.settings.phone]
                }
                linkClassName="reservation-opentable__phone"
              />
            </div>
          </div>

          {hoursRows.length > 0 ? (
            <div className="reservation-opentable__location-row">
              <Clock size={18} aria-hidden />
              <div>
                <p className="reservation-opentable__location-label">Hours</p>
                <ul className="reservation-opentable__hours">
                  {hoursRows.map((row) => (
                    <li key={row.days}>
                      <span>{row.days}</span>
                      <span>{row.time}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>

        <ul className="reservation-opentable__perks" aria-label="Reservation benefits">
          {copy.perks.map((perk) => (
            <li key={perk}>
              <Calendar size={16} aria-hidden />
              {perk}
            </li>
          ))}
        </ul>

        <div className="reservation-opentable__actions">
          <button type="button" className="reservation-opentable__cta" onClick={openOpenTable}>
            {copy.ctaLabel}
            <ExternalLink size={16} aria-hidden />
          </button>
          <p className="reservation-opentable__note">
            Opens OpenTable in a new tab — powered by OpenTable
          </p>
        </div>
      </div>
    </motion.div>
  );
}
