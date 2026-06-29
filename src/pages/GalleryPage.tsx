import PageHero from "../components/ui/PageHero";
import GalleryGrid from "../components/ui/GalleryGrid";
import { GalleryPageSkeleton } from "../components/gallery/GalleryPageSkeleton";
import { useGalleryData } from "../hooks/useGalleryData";
import { toGalleryGridImages } from "../services/galleryPublic";

export default function GalleryPage() {
  const { items, loading } = useGalleryData();
  const images = toGalleryGridImages(items);

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
        {loading ? (
          <GalleryPageSkeleton />
        ) : (
          <GalleryGrid images={images} columns={3} />
        )}
      </section>
    </div>
  );
}
