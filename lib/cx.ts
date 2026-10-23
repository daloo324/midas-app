/**
 * Joins class names, skipping empty ones: cx("tick", done && "on").
 * Use this rather than `tick${done ? " on" : ""}`: the Prettier Tailwind
 * plugin trims the leading space inside className templates.
 */
export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}
