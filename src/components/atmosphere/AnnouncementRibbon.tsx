import { RIBBON_ANNOUNCEMENTS } from "../../data/atmosphereGallery";

function RibbonGroup() {
  return (
    <div className="exp-ribbon__group" aria-hidden>
      {RIBBON_ANNOUNCEMENTS.map((item) => (
        <span key={item} className="exp-ribbon__item">
          {item}
          <span className="exp-ribbon__dot" />
        </span>
      ))}
    </div>
  );
}

export default function AnnouncementRibbon() {
  return (
    <div className="exp-ribbon" aria-label="Restaurant announcements">
      <div className="exp-ribbon__track">
        <RibbonGroup />
        <RibbonGroup />
      </div>
    </div>
  );
}
