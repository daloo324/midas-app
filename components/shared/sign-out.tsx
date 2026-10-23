import { signOut } from "@/lib/auth/sign-out";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button className="btn sm" type="submit">
        Sign out
      </button>
    </form>
  );
}
