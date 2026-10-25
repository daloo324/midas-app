import type { Metadata } from "next";
import {
  saveBankAction,
  saveCapacityAction,
  saveCompanyAction,
  saveInvoicingAction,
  saveLogoAction,
  saveVatAction,
} from "@/app/admin/settings/actions";
import { SettingsForm, VatForm } from "@/components/admin/settings-form";
import { requireArea } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Settings" };

type Bank = Partial<
  Record<
    "bank" | "account_name" | "account_number" | "branch_code" | "swift",
    string | null
  >
>;

export default async function SettingsPage() {
  await requireArea("admin");
  const supabase = await createClient();
  const { data: s } = await supabase
    .from("settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (!s) throw new Error("Settings are missing.");
  const bank = (s.bank_details ?? {}) as Bank;
  const { data: logo } = s.logo_path
    ? await supabase.storage.from("documents").createSignedUrl(s.logo_path, 600)
    : { data: null };

  return (
    <>
      <div className="head">
        <div>
          <h1>Settings</h1>
          <p className="sub">
            Company and bank details appear on quotes and invoices. Changes
            reach new documents only.
          </p>
        </div>
      </div>
      <div className="settings-grid">
        <section className="panel">
          <h2 style={{ marginBottom: 12 }}>Company</h2>
          <SettingsForm action={saveCompanyAction} button="Save company">
            <label className="f full">
              Company name
              <input
                className="field"
                name="companyName"
                defaultValue={s.company_name}
                required
              />
            </label>
            <label className="f full">
              Legal name
              <input
                className="field"
                name="legalName"
                defaultValue={s.legal_name ?? ""}
              />
            </label>
            <label className="f full">
              Address
              <textarea
                className="field"
                name="address"
                rows={3}
                defaultValue={s.address ?? ""}
              />
            </label>
            <label className="f">
              Email
              <input
                className="field"
                type="email"
                name="email"
                defaultValue={s.email ?? ""}
              />
            </label>
            <label className="f">
              Phone
              <input
                className="field"
                type="tel"
                name="phone"
                defaultValue={s.phone ?? ""}
              />
            </label>
          </SettingsForm>
          <div
            style={{
              borderTop: "1px solid var(--line)",
              marginTop: 16,
              paddingTop: 14,
            }}
          >
            <h3 style={{ marginBottom: 8 }}>Logo</h3>
            {logo?.signedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
              <img
                src={logo.signedUrl}
                alt="Current logo"
                style={{ maxHeight: 56, marginBottom: 10 }}
              />
            ) : (
              <p className="sub">
                No logo yet. Documents show the company name.
              </p>
            )}
            <SettingsForm action={saveLogoAction} button="Upload logo">
              <label className="f full">
                PNG or JPG, under 1 MB
                <input
                  className="field"
                  type="file"
                  name="logo"
                  accept="image/png,image/jpeg"
                />
              </label>
            </SettingsForm>
          </div>
        </section>

        <section className="panel">
          <h2 style={{ marginBottom: 12 }}>Bank details</h2>
          <p className="sub" style={{ marginTop: -6, marginBottom: 12 }}>
            Shown on every invoice so clients know where to pay.
          </p>
          <SettingsForm action={saveBankAction} button="Save bank details">
            <label className="f">
              Bank
              <input
                className="field"
                name="bank"
                defaultValue={bank.bank ?? ""}
              />
            </label>
            <label className="f">
              Account name
              <input
                className="field"
                name="accountName"
                defaultValue={bank.account_name ?? ""}
              />
            </label>
            <label className="f">
              Account number
              <input
                className="field"
                name="accountNumber"
                defaultValue={bank.account_number ?? ""}
              />
            </label>
            <label className="f">
              Branch code
              <input
                className="field"
                name="branchCode"
                defaultValue={bank.branch_code ?? ""}
              />
            </label>
            <label className="f">
              SWIFT code (optional)
              <input
                className="field"
                name="swift"
                defaultValue={bank.swift ?? ""}
              />
            </label>
          </SettingsForm>
        </section>

        <section className="panel">
          <h2 style={{ marginBottom: 12 }}>Invoicing</h2>
          <SettingsForm action={saveInvoicingAction} button="Save invoicing">
            <label className="f">
              Payment terms (days)
              <input
                className="field"
                name="paymentTermsDays"
                inputMode="numeric"
                defaultValue={String(s.payment_terms_days)}
              />
            </label>
            <label
              className="row"
              style={{ gap: 8, alignSelf: "end", paddingBottom: 9 }}
            >
              <input
                type="checkbox"
                name="remindersEnabled"
                defaultChecked={s.reminders_enabled}
              />
              Send payment reminders
            </label>
            <label className="f full">
              Invoice footer
              <textarea
                className="field"
                name="invoiceFooter"
                rows={3}
                defaultValue={s.invoice_footer ?? ""}
                placeholder="Thank you for your business."
              />
            </label>
          </SettingsForm>
          <p className="sub" style={{ marginTop: 10 }}>
            Reminders go 3 days before the due date and on the 1st and 7th day
            overdue. You can switch them off for one client on their record.
          </p>
        </section>

        <section className="panel">
          <h2 style={{ marginBottom: 12 }}>VAT</h2>
          <VatForm
            action={saveVatAction}
            registered={s.vat_registered}
            number={s.vat_number}
            rate={Number(s.vat_rate)}
          />
        </section>

        <section className="panel">
          <h2 style={{ marginBottom: 12 }}>Capacity</h2>
          <SettingsForm action={saveCapacityAction} button="Save capacity">
            <label className="f">
              Maximum active clients
              <input
                className="field"
                name="maxActiveClients"
                inputMode="numeric"
                defaultValue={String(s.max_active_clients)}
              />
            </label>
            <label className="f">
              Profitability threshold (P per hour)
              <input
                className="field"
                name="profitThreshold"
                inputMode="decimal"
                defaultValue={Number(s.profit_threshold_per_hour).toFixed(2)}
              />
            </label>
          </SettingsForm>
          <p className="sub" style={{ marginTop: 10 }}>
            Clients earning less than the threshold per design hour are flagged
            on the overview.
          </p>
        </section>

        <section className="panel">
          <h2 style={{ marginBottom: 12 }}>Integrations</h2>
          <p className="sub" style={{ margin: 0 }}>
            Meta and Google Analytics connections arrive in Phase 6. Until then,
            account execs enter KPIs by hand and you enter Midas&apos;s own
            figures on the Marketing page.
          </p>
        </section>
      </div>
    </>
  );
}
