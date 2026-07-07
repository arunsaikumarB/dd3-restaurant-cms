import {
  CalendarCheck,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  ShoppingBag,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import type { CheffyAction } from "../../services/ai/actions";
import { resolveActionTarget } from "../../services/ai/actions";
import { dispatchMascotCelebrate, shouldCelebrateAction } from "./mascotEvents";

type CheffyActionBarProps = {
  actions: CheffyAction[];
  onNavigate: (path: string) => void;
  onSwitchLocation?: (locationId: string) => void;
};

function ActionIcon({ type }: { type: CheffyAction["type"] }) {
  const size = 15;
  const stroke = 2.25;
  switch (type) {
    case "phone":
      return <Phone size={size} strokeWidth={stroke} aria-hidden />;
    case "email":
      return <Mail size={size} strokeWidth={stroke} aria-hidden />;
    case "map":
      return <MapPin size={size} strokeWidth={stroke} aria-hidden />;
    case "link":
      return <ExternalLink size={size} strokeWidth={stroke} aria-hidden />;
    case "reservation":
      return <CalendarCheck size={size} strokeWidth={stroke} aria-hidden />;
    case "order":
      return <ShoppingBag size={size} strokeWidth={stroke} aria-hidden />;
    case "menu":
      return <UtensilsCrossed size={size} strokeWidth={stroke} aria-hidden />;
    case "switch_location":
      return <Sparkles size={size} strokeWidth={stroke} aria-hidden />;
    default:
      return null;
  }
}

export function CheffyActionBar({
  actions,
  onNavigate,
  onSwitchLocation,
}: CheffyActionBarProps) {
  if (!actions.length) return null;

  const handleAction = (action: CheffyAction) => {
    const target = resolveActionTarget(action);

    if (shouldCelebrateAction(action.type)) {
      dispatchMascotCelebrate(action.type);
    }

    switch (target.kind) {
      case "navigate":
        onNavigate(target.path);
        return;
      case "switch_location":
        onSwitchLocation?.(target.locationId);
        return;
      case "external":
        window.open(target.href, "_blank", "noopener,noreferrer");
        return;
      case "phone":
      case "email":
        window.location.href = target.href;
        return;
      default:
        return;
    }
  };

  return (
    <div className="cheffy-action-bar" role="group" aria-label="Suggested actions">
      {actions.map((action) => {
        const target = resolveActionTarget(action);
        const external = target.kind === "external";
        const className = [
          "cheffy-action",
          `cheffy-action--${action.type}`,
          external ? "cheffy-action--external" : "",
        ]
          .filter(Boolean)
          .join(" ");

        if (target.kind === "phone" || target.kind === "email") {
          return (
            <a
              key={action.id}
              href={target.href}
              className={className}
              onClick={(e) => {
                e.preventDefault();
                handleAction(action);
              }}
            >
              <ActionIcon type={action.type} />
              <span>{action.label}</span>
            </a>
          );
        }

        if (external) {
          return (
            <a
              key={action.id}
              href={target.href}
              className={className}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault();
                handleAction(action);
              }}
            >
              <ActionIcon type={action.type} />
              <span>{action.label}</span>
            </a>
          );
        }

        return (
          <button
            key={action.id}
            type="button"
            className={className}
            onClick={() => handleAction(action)}
          >
            <ActionIcon type={action.type} />
            <span>{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}
