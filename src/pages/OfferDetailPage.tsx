import { useEffect, type MouseEvent } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import OffersGrid from "../components/offers/OffersGrid";
import Button from "../components/ui/Button";
import type { LocationId } from "../config/locations";
import { getLocationConfig } from "../config/locations";
import { useLocationSelection } from "../context/LocationContext";
import {
  findOfferAcrossLocations,
  getOfferBySlug,
  getOfferOrderPath,
  getRelatedOffers,
  isInternalOfferOrderPath,
} from "../data/offers";
import "../components/offers/offer-detail.css";

type OfferDetailPageProps = {
  forcedLocationId?: LocationId;
};

export default function OfferDetailPage({ forcedLocationId }: OfferDetailPageProps) {
  const { slug } = useParams<{ slug: string }>();
  const { selectedLocationId, setLocation, navigateWithLocationGuard } = useLocationSelection();

  const activeLocationId = forcedLocationId ?? selectedLocationId;

  const resolved =
    slug && activeLocationId ? getOfferBySlug(activeLocationId, slug) : undefined;

  const fallback =
    slug && !resolved ? findOfferAcrossLocations(slug, forcedLocationId) : null;

  useEffect(() => {
    const nextLocationId = forcedLocationId ?? fallback?.locationId;
    if (nextLocationId && nextLocationId !== selectedLocationId) {
      setLocation(nextLocationId);
    }
  }, [fallback, forcedLocationId, selectedLocationId, setLocation]);

  if (!slug) {
    return <Navigate to="/offers" replace />;
  }

  const offer = resolved ?? fallback?.offer;
  const locationId = forcedLocationId ?? (resolved ? activeLocationId : fallback?.locationId);

  if (!offer || !locationId) {
    return <Navigate to="/offers" replace />;
  }

  const location = getLocationConfig(locationId);
  const related = getRelatedOffers(locationId, offer.slug);
  const heroImage = offer.gallery[0] ?? offer.image;
  const orderPath = getOfferOrderPath(locationId, offer);
  const orderIsInternal = isInternalOfferOrderPath(orderPath);

  const handleOrderClick = (event: MouseEvent<HTMLElement>) => {
    if (!orderIsInternal) return;
    event.preventDefault();
    setLocation(locationId);
    navigateWithLocationGuard(orderPath);
  };

  return (
    <div className="offer-detail bg-ivory">
      <section className="offer-detail-hero" aria-labelledby="offer-detail-title">
        <div className="offer-detail-hero__media">
          <img
            src={heroImage}
            alt=""
            className="offer-detail-hero__image"
            loading="eager"
            decoding="async"
          />
          <div className="offer-detail-hero__overlay" aria-hidden />
        </div>
        <div className="offer-detail-hero__inner">
          <Link to="/offers" className="offer-detail-hero__back">
            ← Back to Offers
          </Link>
          {offer.badge ? (
            <span className="offer-detail-hero__badge">{offer.badge}</span>
          ) : null}
          <h1 id="offer-detail-title" className="offer-detail-hero__title">
            {offer.title}
          </h1>
          <p className="offer-detail-hero__subtitle">{offer.description}</p>
          <p className="offer-detail-hero__location">{location.name}</p>
        </div>
      </section>

      <div className="offer-detail__content">
        {(offer.price || offer.validUntil) && (
          <section className="offer-detail-meta" aria-label="Offer pricing and validity">
            {offer.price ? (
              <div className="offer-detail-meta__item">
                <span className="offer-detail-meta__label">Price</span>
                <span className="offer-detail-meta__value">{offer.price}</span>
              </div>
            ) : null}
            {offer.validUntil ? (
              <div className="offer-detail-meta__item">
                <span className="offer-detail-meta__label">Validity</span>
                <span className="offer-detail-meta__value">{offer.validUntil}</span>
              </div>
            ) : null}
          </section>
        )}

        <section className="offer-detail-body" aria-label="Offer details">
          {offer.content.map((section) => (
            <article key={section.heading} className="offer-detail-section">
              {section.eyebrow ? (
                <p className="offer-detail-section__eyebrow">{section.eyebrow}</p>
              ) : null}
              <h2 className="offer-detail-section__heading">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 48)} className="offer-detail-section__text">
                  {paragraph}
                </p>
              ))}
              {section.list && section.list.length > 0 ? (
                <ul className="offer-detail-section__list">
                  {section.list.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </section>

        {offer.gallery.length > 1 ? (
          <section className="offer-detail-gallery" aria-label="Offer gallery">
            <h2 className="offer-detail-gallery__title">Gallery</h2>
            <div className="offer-detail-gallery__grid">
              {offer.gallery.map((src) => (
                <figure key={src} className="offer-detail-gallery__item">
                  <img src={src} alt="" loading="lazy" decoding="async" />
                </figure>
              ))}
            </div>
          </section>
        ) : null}

        {offer.terms.length > 0 ? (
          <section className="offer-detail-terms" aria-labelledby="offer-terms-title">
            <h2 id="offer-terms-title" className="offer-detail-terms__title">
              Terms & Conditions
            </h2>
            <ul className="offer-detail-terms__list">
              {offer.terms.map((term) => (
                <li key={term}>{term}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="offer-detail-actions" aria-label="Offer actions">
          <Button
            to="/reservation"
            onClick={(event) => {
              event.preventDefault();
              setLocation(locationId);
              navigateWithLocationGuard("/reservation");
            }}
          >
            Reserve Table
          </Button>
          {orderIsInternal ? (
            <Button variant="outline" to={orderPath} onClick={handleOrderClick}>
              Order Now
            </Button>
          ) : (
            <Button variant="outline" href={orderPath}>
              Order Now
            </Button>
          )}
        </section>

        {related.length > 0 ? (
          <section className="offer-detail-related" aria-labelledby="related-offers-title">
            <div className="offer-detail-related__header">
              <h2 id="related-offers-title" className="offer-detail-related__title">
                Related Offers
              </h2>
              <Link to="/offers" className="offer-detail-related__link">
                View all offers
              </Link>
            </div>
            <OffersGrid offers={related} locationId={locationId} locationName={location.name} />
          </section>
        ) : null}
      </div>
    </div>
  );
}
