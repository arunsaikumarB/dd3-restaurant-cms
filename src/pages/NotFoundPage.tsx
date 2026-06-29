import { Link } from "react-router-dom";
import Button from "../components/ui/Button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center bg-ivory px-6 py-24 text-center">
      <p className="text-[12px] font-semibold uppercase tracking-label text-saffron">
        404
      </p>
      <h1 className="mt-4 font-serif text-[clamp(2rem,5vw,3.5rem)] font-semibold text-cocoa">
        Page not found
      </h1>
      <p className="mt-4 max-w-md text-[16px] leading-relaxed text-cocoa/65">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>
      <div className="mt-8">
        <Button to="/">Return Home</Button>
      </div>
      <Link
        to="/contact"
        className="mt-4 text-[14px] text-cocoa/55 underline-offset-4 transition-colors hover:text-saffron hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
      >
        Contact us
      </Link>
    </div>
  );
}
