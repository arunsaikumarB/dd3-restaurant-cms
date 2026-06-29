import { motion } from "framer-motion";
import { ABOUT_PARAGRAPHS, ABOUT_QUOTE } from "../../data/aboutSection";
import {
  containerVariants,
  fadeUpItem,
  viewportOnce,
} from "../showcase/motion";
import FloatingImage from "./FloatingImage";
import FeatureList from "./FeatureList";
import StoryButton from "./StoryButton";
import "./about.css";

const DEFAULT_TITLE = "Authentic Flavours,\nWarm Hospitality";
const DEFAULT_LEAD =
  "Experience authentic Indian cuisine crafted with passion and served with genuine hospitality.";

export interface AboutSectionProps {
  title?: string;
  description?: string;
}

function splitTitleLines(title: string): string[] {
  const lines = title
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.length > 0 ? lines : [title];
}

export default function AboutSection({
  title = DEFAULT_TITLE,
  description = DEFAULT_LEAD,
}: AboutSectionProps) {
  const titleLines = splitTitleLines(title);

  return (
    <section className="about-section" aria-labelledby="about-section-title">
      <div className="about-section__texture" aria-hidden />
      <div className="about-section__pattern" aria-hidden />
      <div className="about-section__motif about-section__motif--tl" aria-hidden />
      <div className="about-section__motif about-section__motif--br" aria-hidden />

      <div className="about-section__inner">
        <div className="about-section__grid">
          <FloatingImage />

          <motion.div
            className="about-section__content"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
          >
            <motion.p className="about-section__eyebrow" variants={fadeUpItem}>
              Our Story
            </motion.p>

            <motion.h2
              id="about-section-title"
              className="about-section__title"
              variants={fadeUpItem}
            >
              {titleLines.map((line, index) => (
                <span key={`${line}-${index}`}>
                  {line}
                  {index < titleLines.length - 1 && <br />}
                </span>
              ))}
            </motion.h2>

            <motion.span
              className="about-section__divider"
              variants={fadeUpItem}
              aria-hidden
            />

            <motion.p className="about-section__lead" variants={fadeUpItem}>
              {description}
            </motion.p>

            <div className="about-section__body">
              {ABOUT_PARAGRAPHS.map((paragraph) => (
                <motion.p
                  key={paragraph.slice(0, 32)}
                  className="about-section__paragraph"
                  variants={fadeUpItem}
                >
                  {paragraph}
                </motion.p>
              ))}
            </div>

            <motion.blockquote
              className="about-section__quote"
              variants={fadeUpItem}
            >
              <p>{ABOUT_QUOTE}</p>
            </motion.blockquote>

            <FeatureList />
            <StoryButton />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
