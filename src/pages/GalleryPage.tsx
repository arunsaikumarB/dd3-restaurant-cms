import PageHero from "../components/ui/PageHero";
import GalleryGrid from "../components/ui/GalleryGrid";
import { EXPERIENCE_GALLERY } from "../data/atmosphereGallery";

const GALLERY_FRAMES = [
  ...EXPERIENCE_GALLERY.map((item) => ({ src: item.image, alt: item.imageAlt })),
  { src: "/frames/frame_0025.jpg", alt: "Restaurant lounge seating" },
  { src: "/frames/frame_0055.jpg", alt: "Dining area detail" },
  { src: "/frames/frame_0070.jpg", alt: "Open kitchen view" },
  { src: "/frames/frame_0095.jpg", alt: "Evening atmosphere" },
  { src: "/frames/frame_0110.jpg", alt: "Interior architecture" },
];

export default function GalleryPage() {
  return (
    <div className="bg-ivory">
      <PageHero
        label="Gallery"
        title="Our Gallery"
        subtitle="Step inside Desi Dhamaka — elegant spaces, warm lighting, and the energy of authentic Indian hospitality."
        backgroundImage="/frames/frame_0060.jpg"
        breadcrumbItems={[
          { label: "Home", to: "/" },
          { label: "Gallery" },
        ]}
      />

      <section className="page-content-start mx-auto max-w-[1400px] px-6 pb-20 md:px-10 lg:px-16">
        <GalleryGrid images={GALLERY_FRAMES} columns={3} />
      </section>
    </div>
  );
}
