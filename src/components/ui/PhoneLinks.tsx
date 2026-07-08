import type { ReactNode } from "react";
import { phoneTelHref } from "../../utils/restaurantPhones";

type Props = {
  phones: string[];
  className?: string;
  linkClassName?: string;
  /** When provided, rendered next to every phone number (not just the first). */
  icon?: ReactNode;
  rowClassName?: string;
};

/** Renders one or more clickable phone links, each with its own icon if one is given. */
export default function PhoneLinks({
  phones,
  className = "",
  linkClassName = "text-[16px] text-cocoa/70 hover:text-saffron focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron",
  icon,
  rowClassName = "flex items-center gap-2.5",
}: Props) {
  const entries = phones.filter((phone) => phone.trim());

  if (entries.length === 0) {
    return null;
  }

  const link = (phone: string) => (
    <a href={phoneTelHref(phone)} className={linkClassName}>
      {phone}
    </a>
  );

  if (entries.length === 1) {
    const phone = entries[0];
    return icon ? (
      <div className={rowClassName}>
        {icon}
        {link(phone)}
      </div>
    ) : (
      link(phone)
    );
  }

  return (
    <ul className={`space-y-1.5 ${className}`.trim()}>
      {entries.map((phone) => (
        <li key={phone} className={icon ? rowClassName : undefined}>
          {icon}
          {link(phone)}
        </li>
      ))}
    </ul>
  );
}
