import { RIBBON_ANNOUNCEMENTS } from "../../data/atmosphereGallery";

function RibbonGroup({ items }: { items: string[] }) {
  return (
    <div className="exp-ribbon__group" aria-hidden>
      {items.map((item) => (
        <span key={item} className="exp-ribbon__item">
          {item}
          <span className="exp-ribbon__dot" />
        </span>
      ))}
    </div>
  );
}

export interface AnnouncementRibbonProps {
  items?: string[];
}

export default function AnnouncementRibbon({ items }: AnnouncementRibbonProps) {
  const ribbonItems = items ?? RIBBON_ANNOUNCEMENTS;

  return (
    <div className="exp-ribbon" aria-label="Restaurant announcements">
      <div className="exp-ribbon__track">
        <RibbonGroup items={ribbonItems} />
        <RibbonGroup items={ribbonItems} />
      </div>
    </div>
  );
}
