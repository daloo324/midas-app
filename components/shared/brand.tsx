import Link from "next/link";

/** The MIDAS wordmark with its small gold label, as in every prototype masthead. */
export function Brand({ label, href }: { label: string; href?: string }) {
  const inner = (
    <>
      <b>MIDAS</b>
      <span>{label}</span>
    </>
  );
  return href ? (
    <Link className="brand" href={href}>
      {inner}
    </Link>
  ) : (
    <div className="brand">{inner}</div>
  );
}
