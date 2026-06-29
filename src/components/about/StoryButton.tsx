import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { fadeUpItem, viewportOnce } from "../showcase/motion";

export default function StoryButton() {
  return (
    <motion.div
      variants={fadeUpItem}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
    >
      <Link to="/about" className="about-story-btn">
        Our Story
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
