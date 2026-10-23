import type { Metadata } from "next";
import {
  Anton,
  Caveat,
  Manrope,
  Nunito,
  Playfair_Display,
} from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { questionnaireToken } from "@/lib/validation/questionnaire";
import { Header } from "./header";
import { Questionnaire } from "./questionnaire";
import "./questionnaire.css";

// Only for the "Lettering styles" samples.
const playfair = Playfair_Display({
  variable: "--q-playfair",
  weight: "600",
  subsets: ["latin"],
});
const manrope = Manrope({
  variable: "--q-manrope",
  weight: "600",
  subsets: ["latin"],
});
const nunito = Nunito({
  variable: "--q-nunito",
  weight: "800",
  subsets: ["latin"],
});
const anton = Anton({
  variable: "--q-anton",
  weight: "400",
  subsets: ["latin"],
});
const caveat = Caveat({
  variable: "--q-caveat",
  weight: "600",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Brand Discovery · Midas Media",
  robots: { index: false, follow: false },
};

const MESSAGES = {
  used: {
    title: "Thanks, we have your answers",
    body: "This questionnaire has already been sent. If you'd like to change something, tell your account executive and they'll send you a new link.",
  },
  expired: {
    title: "This link has expired",
    body: "Questionnaire links work for 30 days. Ask your account executive for a new one and you can start again.",
  },
  unknown: {
    title: "We couldn't find this questionnaire",
    body: "Check that you copied the whole link. If it still doesn't open, ask your account executive for a new one.",
  },
} as const;

export default async function StartPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const fonts = [playfair, manrope, nunito, anton, caveat]
    .map((f) => f.variable)
    .join(" ");

  const link = await lookUp(token);

  if (link.state === "open") {
    return (
      <div className={`qn ${fonts}`}>
        <Questionnaire
          token={token}
          clientId={link.clientId}
          businessName={link.businessName}
        />
      </div>
    );
  }

  const msg = MESSAGES[link.state];
  return (
    <div className={`qn ${fonts}`}>
      <Header />
      <div style={{ padding: "0 16px" }}>
        <main className="done-card">
          <div className="eyebrow">Brand discovery questionnaire</div>
          <h2>{msg.title}</h2>
          <p>{msg.body}</p>
        </main>
      </div>
    </div>
  );
}

type Link =
  | { state: "open"; clientId: string; businessName: string }
  | { state: keyof typeof MESSAGES };

async function lookUp(token: string): Promise<Link> {
  if (!questionnaireToken.safeParse(token).success) return { state: "unknown" };
  const supabase = await createClient();
  const { data } = await supabase.rpc("open_questionnaire", { p_token: token });
  const row = data?.[0];
  if (row?.state === "open" && row.client_id) {
    return {
      state: "open",
      clientId: row.client_id,
      businessName: row.business_name ?? "",
    };
  }
  const known = row?.state === "used" || row?.state === "expired";
  return { state: known ? (row.state as "used" | "expired") : "unknown" };
}
