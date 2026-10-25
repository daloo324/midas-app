"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/auth/action-state";
import { staffWithRole } from "@/lib/auth/session";
import { friendlyError } from "@/lib/data/errors";
import type { TablesUpdate } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import {
  bankSchema,
  capacitySchema,
  companySchema,
  invoicingSchema,
  vatSchema,
} from "@/lib/validation/admin";

// Settings: one row, CEO only. Each panel saves its own fields.

const CEO_ONLY: ActionState = { error: "Only the CEO can change settings." };

async function save(patch: TablesUpdate<"settings">, ok: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("settings").update(patch).eq("id", 1);
  if (error)
    return { error: friendlyError(error, "Settings didn't save. Try again.") };
  revalidatePath("/admin", "layout");
  return { ok };
}

function firstError(issues: { message: string }[]): ActionState {
  return { error: issues[0]?.message ?? "Check the form and try again." };
}

export async function saveCompanyAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await staffWithRole(["ceo"]))) return CEO_ONLY;
  const p = companySchema.safeParse(Object.fromEntries(formData));
  if (!p.success) return firstError(p.error.issues);
  return save(
    {
      company_name: p.data.companyName,
      legal_name: p.data.legalName,
      address: p.data.address,
      email: p.data.email,
      phone: p.data.phone,
    },
    "Company details saved.",
  );
}

export async function saveBankAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await staffWithRole(["ceo"]))) return CEO_ONLY;
  const p = bankSchema.safeParse(Object.fromEntries(formData));
  if (!p.success) return firstError(p.error.issues);
  return save(
    {
      bank_details: {
        bank: p.data.bank,
        account_name: p.data.accountName,
        account_number: p.data.accountNumber,
        branch_code: p.data.branchCode,
        swift: p.data.swift,
      },
    },
    "Bank details saved. New invoices show them.",
  );
}

export async function saveInvoicingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await staffWithRole(["ceo"]))) return CEO_ONLY;
  const p = invoicingSchema.safeParse(Object.fromEntries(formData));
  if (!p.success) return firstError(p.error.issues);
  return save(
    {
      payment_terms_days: p.data.paymentTermsDays,
      invoice_footer: p.data.invoiceFooter,
      reminders_enabled: p.data.remindersEnabled,
    },
    "Invoicing settings saved.",
  );
}

export async function saveVatAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await staffWithRole(["ceo"]))) return CEO_ONLY;
  const p = vatSchema.safeParse(Object.fromEntries(formData));
  if (!p.success) return firstError(p.error.issues);
  return save(
    {
      vat_registered: p.data.vatRegistered,
      vat_number: p.data.vatNumber,
      vat_rate: p.data.vatRate,
    },
    p.data.vatRegistered
      ? `VAT is on. New quotes and invoices add VAT at ${p.data.vatRate}% and are titled "Tax invoice". Existing documents don't change.`
      : 'VAT is off. New documents are titled "Invoice" with no VAT line.',
  );
}

export async function saveCapacityAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await staffWithRole(["ceo"]))) return CEO_ONLY;
  const p = capacitySchema.safeParse(Object.fromEntries(formData));
  if (!p.success) return firstError(p.error.issues);
  return save(
    {
      max_active_clients: p.data.maxActiveClients,
      profit_threshold_per_hour: p.data.profitThreshold,
    },
    "Capacity saved.",
  );
}

const LOGO_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
};

export async function saveLogoAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await staffWithRole(["ceo"]))) return CEO_ONLY;
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0)
    return { error: "Choose a PNG or JPG logo." };
  const ext = LOGO_TYPES[file.type];
  if (!ext) return { error: "The logo must be a PNG or JPG." };
  if (file.size > 1024 * 1024) return { error: "Keep the logo under 1 MB." };
  const path = `company/logo-${Date.now()}.${ext}`;
  const supabase = await createClient();
  const { error } = await supabase.storage
    .from("documents")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { error: "The logo didn't upload. Try again." };
  return save({ logo_path: path }, "Logo saved. New documents use it.");
}
