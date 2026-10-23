import Link from "next/link";

/** Months open once the client is active (03-accounts.md, onboarding step 5). */
export function NotActive({
  clientId,
  status,
}: {
  clientId: string;
  status: string;
}) {
  return (
    <div className="empty-state">
      <h2>
        {status === "paused"
          ? "This client is paused"
          : "Months open once the client is active"}
      </h2>
      <p>
        {status === "paused"
          ? "Planning is on hold while the client is paused. The CEO can make them active again."
          : "Finish onboarding first: the questionnaire, the brand kit and its sign-off. Then activate the client to start planning."}
      </p>
      {status !== "paused" ? (
        <Link
          className="btn pri"
          href={`/accounts/clients/${clientId}/onboarding`}
        >
          Go to onboarding
        </Link>
      ) : null}
    </div>
  );
}
