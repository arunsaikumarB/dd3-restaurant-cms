import southPlainfieldOffers from "./southPlainfield";
import type { LocationOffer } from "./types";

/** Lawrenceville offers — same catalogue as source site listing; location names adapted. */
const lawrencevilleOffers: LocationOffer[] = southPlainfieldOffers.map((offer) => ({
  ...offer,
  id: offer.id.replace(/^sp-/, "lv-"),
  content: offer.content.map((section) => ({
    ...section,
    paragraphs: section.paragraphs.map((p) =>
      p
        .replace(/South Plainfield/g, "Lawrenceville")
        .replace(/Hadley Road/g, "Lawrence Township"),
    ),
    list: section.list?.map((item) =>
      item
        .replace(/South Plainfield/g, "Lawrenceville")
        .replace(/Hadley Road/g, "Lawrence Township"),
    ),
  })),
}));

export default lawrencevilleOffers;
