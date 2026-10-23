import Link from "next/link";

const TABS = [
  { href: "/creative/resources/fonts", label: "Fonts & pairings" },
  { href: "/creative/resources/palette", label: "Palette builder" },
  { href: "/creative/resources/inspiration", label: "Design inspiration" },
];

export function ResourcesHeader({ current }: { current: string }) {
  return (
    <>
      <div className="head">
        <div>
          <h1>Resources</h1>
          <p className="sub">Shared by the whole design team.</p>
        </div>
      </div>
      <nav className="tabs" aria-label="Resources">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={t.href === current ? "page" : undefined}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </>
  );
}

/** The 14 pairings' families, from Google Fonts (as the prototype loads them). */
export const PAIRING_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Playfair+Display&family=Source+Sans+3&family=Cormorant+Garamond:wght@600&family=Montserrat&family=DM+Serif+Display&family=DM+Sans&family=Fraunces&family=Manrope:wght@700&family=Work+Sans&family=Space+Grotesk:wght@600&family=IBM+Plex+Sans&family=Raleway:wght@700&family=Open+Sans&family=Nunito:wght@800&family=Nunito+Sans&family=Poppins:wght@600&family=Lora&family=Anton&family=Roboto&family=Bebas+Neue&family=Oswald:wght@600&family=Libre+Baskerville&family=Caveat:wght@700&family=Quicksand&family=Archivo+Black&display=swap";
