import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import type { LocationId } from "../../config/locations";
import type { LocationOffer } from "../../data/offers/types";
import {
  getOfferDetailPath,
  getOfferOrderPath,
  isInternalOfferOrderPath,
} from "../../data/offers";
import { EXTERNAL_ORDER_LINK_PROPS } from "../../constants/ordering";
import { usePageContent } from "../../context/PageContentContext";
import { trackOfferClick } from "../../services/analytics";
import { EASE_POWER3 } from "../showcase/motion";
import "./offers-page.css";

interface OffersGridProps {
  offers: LocationOffer[];
  locationId?: LocationId;
  locationName?: string;
}

export default function OffersGrid({ offers, locationId, locationName }: OffersGridProps) {
  const { pathname } = useLocation();
  const { fetchSection, interpolate } = usePageContent();
  const grid = fetchSection("offers", "grid", {
    viewDetailsLabel: "View Details",
    orderNowLabel: "Order Now",
  });
  const emptyState = fetchSection("offers", "empty_state", {
    title: "No offers available",
    bodyTemplate:
      "There are no active promotions for {location} right now. Check back soon.",
    selectPrompt: "Select a location above to view available promotions.",
  });

  const handleOfferClick = (offer: LocationOffer) => {
    if (!locationId) return;
    trackOfferClick(offer.id, offer.title, locationId, pathname);
  };

  if (offers.length === 0) {
    return (
      <div className="offers-empty">
        <p className="offers-empty__title">{emptyState.title}</p>
        <p className="offers-empty__text">
          {locationName
            ? interpolate(emptyState.bodyTemplate, { location: locationName })
            : emptyState.selectPrompt}
        </p>
      </div>
    );
  }

  return (
    <div className="offers-grid">
      {offers.map((offer, index) => {
        const detailPath =
          locationId != null ? getOfferDetailPath(locationId, offer.slug) : `/offers/${offer.slug}`;
        const orderPath = locationId ? getOfferOrderPath(locationId, offer) : null;
        const orderIsInternal = orderPath ? isInternalOfferOrderPath(orderPath) : false;

        return (
          <motion.article
            key={offer.id}
            className="offers-card"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.12 }}
            transition={{ duration: 0.65, ease: EASE_POWER3, delay: index * 0.06 }}
          >
            <div className="offers-card__border" aria-hidden />
            <Link
              to={detailPath}
              className="offers-card__main"
              aria-label={`View details for ${offer.title}`}
              onClick={() => handleOfferClick(offer)}
            >
              <div className="offers-card__media">
                <img
                  src={offer.image}
                  alt={offer.title}
                  className="offers-card__image"
                  loading="lazy"
                  decoding="async"
                />
                <div className="offers-card__overlay" aria-hidden />
                {offer.badge ? (
                  <span className="offers-card__badge">{offer.badge}</span>
                ) : null}
              </div>
              <div className="offers-card__body">
                <h3 className="offers-card__title">{offer.title}</h3>
                {offer.description ? (
                  <p className="offers-card__desc">{offer.description}</p>
                ) : null}
              </div>
            </Link>
            <div className="offers-card__footer">
              <Link
                to={detailPath}
                className="offers-card__cta"
                onClick={() => handleOfferClick(offer)}
              >
                {grid.viewDetailsLabel}
              </Link>
              {orderPath ? (
                orderIsInternal ? (
                  <Link
                    to={orderPath}
                    className="offers-card__order"
                    aria-label={`Order ${offer.title} online`}
                    onClick={() => handleOfferClick(offer)}
                  >
                    {grid.orderNowLabel}
                  </Link>
                ) : (
                  <a
                    href={orderPath}
                    className="offers-card__order"
                    aria-label={`Order ${offer.title} online`}
                    onClick={() => handleOfferClick(offer)}
                    {...EXTERNAL_ORDER_LINK_PROPS}
                  >
                    {grid.orderNowLabel}
                  </a>
                )
              ) : null}
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}
