// The same rule as public.client_code_letters() in the database, for demo mode.
// Keep the two in step (tests/unit/client-code.test.ts mirrors the SQL tests).

export function clientCodeLetters(name: string): string {
  const words = name
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z]/g, "").toUpperCase())
    .filter(Boolean);
  let letters = "";
  if (words.length >= 3) letters = words[0][0] + words[1][0] + words[2][0];
  else if (words.length === 2) {
    letters = words[0].slice(0, 2) + words[1][0];
    if (letters.length < 3) letters = (words[0] + words[1]).slice(0, 3);
  } else if (words.length === 1) letters = words[0].slice(0, 3);
  return letters.padEnd(3, "X");
}

/** A new MM-XXX-0000 code that isn't in `taken`. */
export function newClientCode(
  name: string,
  taken: Set<string>,
  random: () => number = Math.random,
): string {
  for (;;) {
    const code = `MM-${clientCodeLetters(name)}-${String(Math.floor(random() * 10000)).padStart(4, "0")}`;
    if (!taken.has(code)) return code;
  }
}
