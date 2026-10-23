// Creates a real CEO account and prints a one-time link to set its password.
//
//   npm run create:ceo -- --email info@midasmedia.co.bw --name "Dave Lottering" --env .env.hosted.local
//
// The link opens the app at NEXT_PUBLIC_APP_URL from the env file.
import { arg, loadScriptEnv, need, serviceClient } from "./env";

async function main() {
  loadScriptEnv();
  const email = arg("email")?.trim().toLowerCase();
  const name = arg("name")?.trim();
  if (!email || !name)
    throw new Error(
      'Use: npm run create:ceo -- --email you@example.com --name "Your Name"',
    );
  const appUrl = need("NEXT_PUBLIC_APP_URL").replace(/\/+$/, "");
  const db = serviceClient();

  const { data, error } = await db.auth.admin.generateLink({
    type: "invite",
    email,
    options: { data: { full_name: name } },
  });
  if (error) throw new Error(`Couldn't create the account: ${error.message}`);

  const { error: profileError } = await db
    .from("profiles")
    .insert({ id: data.user.id, full_name: name, email, role: "ceo" });
  if (profileError) {
    await db.auth.admin.deleteUser(data.user.id);
    throw new Error(`Couldn't save the CEO profile: ${profileError.message}`);
  }

  const params = new URLSearchParams({
    token_hash: data.properties.hashed_token,
    type: "invite",
    for: "staff",
  });
  console.log(`CEO account created for ${email}.`);
  console.log(
    "Open this link within 24 hours to set the password (it works once):",
  );
  console.log(`${appUrl}/set-password?${params.toString()}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
