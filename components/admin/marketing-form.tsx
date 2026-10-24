"use client";

import { useActionState } from "react";
import { saveMarketingAction } from "@/app/admin/marketing/actions";
import { FieldError, FormMessage } from "@/components/shared/form-message";
import { SubmitButton } from "@/components/shared/submit-button";
import { initialState } from "@/lib/auth/action-state";

export type MarketingValues = {
  facebook: Record<string, number | undefined>;
  instagram: Record<string, number | undefined>;
  website: {
    visitors?: number;
    enquiries?: number;
    top_pages?: { path: string; views: number }[];
  };
};

const v = (n: number | undefined) => (n == null ? "" : String(n));

export function MarketingForm({
  month,
  values,
}: {
  month: string;
  values: MarketingValues;
}) {
  const [state, action] = useActionState(saveMarketingAction, initialState);
  const social = (ch: "facebook" | "instagram", label: string) => (
    <fieldset className="mk-set">
      <legend>{label}</legend>
      <label className="f">
        Followers at month end
        <input
          className="field"
          name={`${ch}Followers`}
          inputMode="numeric"
          defaultValue={v(values[ch].followers)}
        />
        <FieldError state={state} name={`${ch}Followers`} />
      </label>
      <label className="f">
        Accounts reached
        <input
          className="field"
          name={`${ch}Reach`}
          inputMode="numeric"
          defaultValue={v(values[ch].reach)}
        />
        <FieldError state={state} name={`${ch}Reach`} />
      </label>
      <label className="f">
        Interactions
        <input
          className="field"
          name={`${ch}Interactions`}
          inputMode="numeric"
          defaultValue={v(values[ch].interactions)}
        />
        <FieldError state={state} name={`${ch}Interactions`} />
      </label>
    </fieldset>
  );
  return (
    <form action={action} noValidate className="grid gap-4" key={month}>
      <input type="hidden" name="month" value={month} />
      <div className="settings-grid">
        {social("facebook", "Facebook")}
        {social("instagram", "Instagram")}
        <fieldset className="mk-set">
          <legend>Website</legend>
          <label className="f">
            Visitors
            <input
              className="field"
              name="websiteVisitors"
              inputMode="numeric"
              defaultValue={v(values.website.visitors)}
            />
            <FieldError state={state} name="websiteVisitors" />
          </label>
          <label className="f">
            Enquiry form submissions
            <input
              className="field"
              name="websiteEnquiries"
              inputMode="numeric"
              defaultValue={v(values.website.enquiries)}
            />
            <FieldError state={state} name="websiteEnquiries" />
          </label>
          <label className="f">
            Top pages (one per line: path, then views)
            <textarea
              className="field"
              name="topPages"
              rows={4}
              placeholder={"/ 820\n/services 310"}
              defaultValue={(values.website.top_pages ?? [])
                .map((p) => `${p.path} ${p.views}`)
                .join("\n")}
            />
            <FieldError state={state} name="topPages" />
          </label>
        </fieldset>
      </div>
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingText="Saving…">Save figures</SubmitButton>
      </div>
    </form>
  );
}
