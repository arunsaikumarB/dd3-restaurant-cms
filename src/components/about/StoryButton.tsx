import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeUpItem, viewportOnce } from "../showcase/motion";

export interface StoryButtonProps {
  label?: string;
  to?: string;
}

export default function StoryButton({
  label = "Our Story",
  to = "/about",
}: StoryButtonProps) {
  return (
    <motion.div
      variants={fadeUpItem}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
    >
      <Link to={to} className="about-story-btn">
        {label}
        <span className="about-story-btn__arrow" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12h14M13 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </Link>
    </motion.div>
  );
}
