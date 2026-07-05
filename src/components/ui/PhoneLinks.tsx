import { phoneTelHref } from "../../utils/restaurantPhones";

type Props = {
  phones: string[];
  className?: string;
  linkClassName?: string;
};

/** Renders one or more clickable phone links. */
export default function PhoneLinks({
  phones,
  className = "",
  linkClassName = "text-[16px] text-cocoa/70 hover:text-saffron focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron",
}: Props) {
  const entries = phones.filter((phone) => phone.trim());

  if (entries.length === 0) {
    return null;
  }

  if (entries.length === 1) {
    const phone = entries[0];
    return (
      <a href={phoneTelHref(phone)} className={linkClassName}>
        {phone}
      </a>
    );
  }

  return (
    <ul className={`space-y-1 ${className}`.trim()}>
      {entries.map((phone) => (
        <li key={phone}>
          <a href={phoneTelHref(phone)} className={linkClassName}>
            {phone}
          </a>
        </li>
      ))}
    </ul>
  );
}
