import { gsap } from "gsap";
import { MASCOT_HIDDEN_X, type MascotPhase } from "./CheffyMascotState";

const PEEK_X = "38%";
const HIDDEN_X = MASCOT_HIDDEN_X;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Transform-only mascot motion (GSAP on wrapper + img).
 * Opacity / pointer-events stay in React.
 */
export class CheffyAnimator {
  private anchor: HTMLElement;
  private img: HTMLElement | null;
  private fxLayers: HTMLElement[];
  private idleTl: gsap.core.Timeline | null = null;
  private blinkTimer: ReturnType<typeof setTimeout> | null = null;
  private paused = false;
  private phase: MascotPhase = "hidden";

  constructor(anchor: HTMLElement, options?: { startHidden?: boolean }) {
    this.anchor = anchor;
    this.img = anchor.querySelector(".cheffy-mascot-img");
    this.fxLayers = Array.from(anchor.querySelectorAll(".cheffy-mascot-fx"));

    if (options?.startHidden && !prefersReducedMotion()) {
      gsap.set(this.anchor, { x: HIDDEN_X, y: 0, rotation: 0, scale: 1, force3D: true });
      this.setPhase("hidden");
    }
  }

  getPhase(): MascotPhase {
    return this.phase;
  }

  private setPhase(phase: MascotPhase): void {
    this.phase = phase;
    this.anchor.dataset.phase = phase;
  }

  private killIdle(): void {
    this.idleTl?.kill();
    this.idleTl = null;
    if (this.blinkTimer) {
      clearTimeout(this.blinkTimer);
      this.blinkTimer = null;
    }
  }

  private scheduleBlink(): void {
    if (prefersReducedMotion() || this.paused) return;
    this.blinkTimer = setTimeout(() => {
      this.playBlink();
      this.scheduleBlink();
    }, rand(2800, 6200));
  }

  playBlink(): void {
    if (!this.img || prefersReducedMotion()) return;
    gsap.fromTo(
      this.img,
      { scaleY: 1, transformOrigin: "50% 18%" },
      { scaleY: 0.92, duration: 0.07, ease: "power2.in", yoyo: true, repeat: 1 },
    );
  }

  /** Full homepage session intro — peek, tilt, wave, settle to float. */
  playSessionIntro(onPhase: (p: MascotPhase) => void, onComplete: () => void): void {
    this.killIdle();
    gsap.killTweensOf([this.anchor, this.img, ...this.fxLayers]);

    if (prefersReducedMotion()) {
      gsap.set(this.anchor, { x: 0, y: 0, rotation: 0, scale: 1 });
      this.setPhase("idle");
      this.startIdle();
      onComplete();
      return;
    }

    this.setPhase("peek");
    onPhase("peek");

    const tl = gsap.timeline({
      defaults: { ease: "power3.out" },
      onComplete: () => {
        this.setPhase("idle");
        onPhase("idle");
        this.startIdle();
        onComplete();
      },
    });

    tl.set(this.anchor, { x: HIDDEN_X, y: 0, rotation: 0, scale: 1 })
      .to(this.anchor, { x: PEEK_X, duration: 0.85, ease: "power2.out" })
      .add(() => this.playBlink(), "+=0.35")
      .to(this.anchor, { rotation: -6, duration: 0.45, ease: "sine.inOut" }, "-=0.1")
      .add(() => {
        this.setPhase("greeting");
        onPhase("greeting");
      })
      .add(() => this.playWave(), "+=0.05")
      .to({}, { duration: 0.55 })
      .to(this.anchor, { rotation: 0, duration: 0.35, ease: "sine.inOut" })
      .to(this.anchor, { x: 0, duration: 0.95, ease: "elastic.out(1, 0.72)" }, "+=0.15")
      .fromTo(
        this.anchor,
        { scale: 1 },
        { scale: 1.03, duration: 0.22, ease: "sine.out", yoyo: true, repeat: 1 },
        "-=0.55",
      );
  }

  /** Skip intro — already floating on inner pages / return visits. */
  placeHome(): void {
    this.killIdle();
    gsap.killTweensOf([this.anchor, this.img, ...this.fxLayers]);
    gsap.set(this.anchor, { x: 0, y: 0, rotation: 0, scale: 1 });
    this.setPhase("idle");
    this.startIdle();
  }

  startIdle(): void {
    if (this.idleTl || prefersReducedMotion()) return;

    this.setPhase("idle");
    this.scheduleBlink();

    const floatY = rand(5, 9);
    const floatDur = rand(2.4, 3.8);
    const breatheDur = rand(3.2, 4.6);
    const swayDur = rand(3.8, 5.2);
    const plateDur = rand(2.8, 4.2);

    this.idleTl = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: "sine.inOut" } });
    this.idleTl
      .to(this.anchor, { y: -floatY, duration: floatDur }, 0)
      .to(this.anchor, { rotation: rand(0.8, 1.6), duration: floatDur * 1.15 }, 0)
      .to(this.anchor, { scale: rand(1.015, 1.028), duration: breatheDur, ease: "sine.inOut" }, 0);

    this.fxLayers.forEach((layer, i) => {
      const isScarf = layer.classList.contains("cheffy-mascot-fx--scarf");
      const isPlate = layer.classList.contains("cheffy-mascot-fx--plate");
      const isShimmer = layer.classList.contains("cheffy-mascot-fx--shimmer");
      if (isScarf) {
        gsap.to(layer, {
          rotation: rand(2, 4),
          x: rand(1, 3),
          duration: swayDur,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }
      if (isPlate) {
        gsap.to(layer, {
          y: rand(-2, -4),
          rotation: rand(-2, 2),
          duration: plateDur,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: i * 0.08,
        });
      }
      if (isShimmer) {
        gsap.to(layer, {
          opacity: rand(0.35, 0.65),
          duration: rand(2.2, 3.6),
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }
    });
  }

  playOutletSwitch(onComplete?: () => void): void {
    this.killIdle();
    gsap.killTweensOf([this.anchor, this.img]);

    if (prefersReducedMotion()) {
      gsap.set(this.anchor, { x: 0 });
      this.startIdle();
      onComplete?.();
      return;
    }

    const tl = gsap.timeline({
      onComplete: () => {
        this.startIdle();
        onComplete?.();
      },
    });

    tl.to(this.anchor, { x: HIDDEN_X, duration: 0.45, ease: "power2.in" })
      .set(this.anchor, { rotation: -4 })
      .to(this.anchor, { x: 0, rotation: 0, duration: 0.75, ease: "back.out(1.6)" });
  }

  enterChatFocus(): void {
    this.killIdle();
    gsap.killTweensOf(this.anchor);
    this.setPhase("listening");

    if (prefersReducedMotion()) {
      gsap.set(this.anchor, { y: 0, scale: 0.88, rotation: 3 });
      return;
    }

    gsap.to(this.anchor, {
      y: 2,
      scale: 0.88,
      rotation: 4,
      duration: 0.38,
      ease: "power2.out",
    });
  }

  exitChatFocus(): void {
    gsap.to(this.anchor, {
      y: 0,
      scale: 1,
      rotation: 0,
      duration: 0.42,
      ease: "power2.out",
      onComplete: () => this.startIdle(),
    });
  }

  hover(clientX?: number, clientY?: number): void {
    if (prefersReducedMotion()) return;

    const rect = this.anchor.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height * 0.35;
    let tilt = 5;
    if (clientX != null && clientY != null && window.matchMedia("(pointer: fine)").matches) {
      const dx = (clientX - cx) / Math.max(window.innerWidth * 0.35, 1);
      const dy = (clientY - cy) / Math.max(window.innerHeight * 0.35, 1);
      tilt = gsap.utils.clamp(-8, 8, dx * 10 + dy * 2);
    }

    gsap.to(this.anchor, {
      y: -10,
      scale: 1.04,
      rotation: tilt,
      duration: 0.28,
      ease: "power2.out",
      overwrite: "auto",
    });
    this.anchor.classList.add("cheffy-float--hover");
  }

  hoverOut(): void {
    this.anchor.classList.remove("cheffy-float--hover");
    if (this.phase === "idle") {
      gsap.to(this.anchor, {
        y: 0,
        scale: 1,
        rotation: 0,
        duration: 0.35,
        ease: "sine.out",
        overwrite: "auto",
      });
      this.startIdle();
    }
  }

  bounce(): void {
    if (prefersReducedMotion()) return;
    gsap.fromTo(
      this.anchor,
      { y: 0 },
      { y: -14, duration: 0.22, ease: "power2.out", yoyo: true, repeat: 1 },
    );
  }

  playWave(): void {
    if (prefersReducedMotion()) return;
    gsap.to(this.anchor, {
      rotation: 9,
      duration: 0.18,
      ease: "sine.inOut",
      yoyo: true,
      repeat: 4,
      onComplete: () => gsap.to(this.anchor, { rotation: 0, duration: 0.2 }),
    });
  }

  thinking(): void {
    this.killIdle();
    this.setPhase("thinking");
    if (prefersReducedMotion()) return;
    gsap.killTweensOf(this.anchor);
    gsap.to(this.anchor, {
      rotation: rand(-3, 3),
      y: rand(-2, 0),
      duration: 0.55,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });
    this.scheduleBlink();
  }

  speaking(): void {
    this.killIdle();
    this.setPhase("speaking");
    if (prefersReducedMotion()) return;
    gsap.killTweensOf(this.anchor);
    gsap.to(this.anchor, {
      y: -3,
      scale: 0.9,
      rotation: 2,
      duration: 0.3,
      ease: "sine.out",
    });
  }

  celebrate(): void {
    this.setPhase("celebrating");
    this.anchor.classList.add("cheffy-float--celebrate");
    if (prefersReducedMotion()) {
      window.setTimeout(() => {
        this.anchor.classList.remove("cheffy-float--celebrate");
        this.setPhase("idle");
        this.startIdle();
      }, 600);
      return;
    }

    gsap.fromTo(
      this.anchor,
      { y: 0, rotation: 0, scale: 1 },
      {
        y: -16,
        rotation: 8,
        scale: 1.06,
        duration: 0.32,
        ease: "back.out(2.5)",
        yoyo: true,
        repeat: 1,
        onComplete: () => {
          this.anchor.classList.remove("cheffy-float--celebrate");
          this.setPhase("idle");
          this.startIdle();
        },
      },
    );
  }

  setPhaseMotion(phase: MascotPhase): void {
    switch (phase) {
      case "thinking":
        this.thinking();
        break;
      case "speaking":
        this.speaking();
        break;
      case "listening":
        this.enterChatFocus();
        break;
      case "celebrating":
        this.celebrate();
        break;
      case "idle":
        gsap.killTweensOf(this.anchor);
        this.startIdle();
        break;
      default:
        break;
    }
  }

  pause(): void {
    this.paused = true;
    this.idleTl?.pause();
    gsap.getTweensOf([this.anchor, this.img, ...this.fxLayers]).forEach((t) => t.pause());
    if (this.blinkTimer) clearTimeout(this.blinkTimer);
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.idleTl?.resume();
    gsap.getTweensOf([this.anchor, this.img, ...this.fxLayers]).forEach((t) => t.resume());
    if (this.phase === "idle") this.scheduleBlink();
  }

  destroy(): void {
    this.killIdle();
    gsap.killTweensOf([this.anchor, this.img, ...this.fxLayers]);
    this.anchor.classList.remove(
      "cheffy-float--hover",
      "cheffy-float--celebrate",
    );
  }
}
