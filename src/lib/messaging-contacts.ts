import { apiFetch } from "@/lib/api";
import { extractErrorMessage } from "@/lib/api-errors";

/**
 * Contact categorization for the personal-messaging skills (WhatsApp,
 * iMessage). The backend lists every person with a message in the last year,
 * merged across sources; the user assigns each one a category and the
 * approval queue honors those categories. Names and identifiers only ever
 * travel between the local API and this page.
 */

export type ContactKind = "whatsapp" | "imessage";
export type CategoryPolicy = "ask" | "block";

export type ContactCategory = {
  id: string;
  label: string;
  policy: CategoryPolicy;
};

export type ContactIdentity = {
  source_id: string;
  kind: ContactKind;
  contact_id: string;
  display_name: string | null;
  phone: string | null;
  email: string | null;
  is_group: boolean;
  last_message_at: string | null;
  read_allowed: boolean;
  send_allowed: boolean;
};

export type ContactPerson = {
  key: string;
  display_name: string | null;
  is_group: boolean;
  last_message_at: string | null;
  kinds: ContactKind[];
  read_allowed: boolean;
  send_allowed: boolean;
  identities: ContactIdentity[];
  category: ContactCategory | null;
  updated_at: string | null;
  skipped: boolean;
  skipped_until: string | null;
};

export type ContactProgress = {
  total: number;
  categorized: number;
  pending: number;
  skipped: number;
};

export type ContactSource = {
  id: string;
  kind: ContactKind;
  label: string;
  ssh_target: string | null;
  merge: boolean;
};

export type ContactSourceError = { source_id: string; message: string };

export type MessagingContactsSnapshot = {
  people: ContactPerson[];
  queue: string[];
  categories: ContactCategory[];
  sources: ContactSource[];
  progress: ContactProgress;
  window_days: number;
  refreshed_at: string | null;
  errors: ContactSourceError[];
};

export type MessagingContactsSummary = {
  progress: ContactProgress;
  sources: ContactSource[];
  refreshed_at: string | null;
  errors: ContactSourceError[];
};

export const CONTACTS_PATH = "/dashboard/contacts";

export const KIND_LABELS: Record<ContactKind, string> = {
  whatsapp: "WhatsApp",
  imessage: "iMessage",
};

export const POLICY_LABELS: Record<CategoryPolicy, string> = {
  ask: "Agents ask for approval",
  block: "Agents are blocked",
};

async function readJson<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) throw new Error(await extractErrorMessage(res, fallback));
  return (await res.json()) as T;
}

function post(path: string, body: unknown, method = "POST") {
  return apiFetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function fetchMessagingContacts(options: { refresh?: boolean } = {}) {
  const query = options.refresh ? "?refresh=1" : "";
  return readJson<MessagingContactsSnapshot>(
    await apiFetch(`/api/messaging-contacts/${query}`),
    "Unable to load contacts.",
  );
}

export async function fetchMessagingContactsSummary() {
  return readJson<MessagingContactsSummary>(
    await apiFetch("/api/messaging-contacts/summary/"),
    "Unable to load contact progress.",
  );
}

export async function assignContactCategory(keys: string[], category: string | null) {
  return readJson<{ keys: string[]; category: string | null; progress: ContactProgress }>(
    await post("/api/messaging-contacts/assign/", { keys, category }),
    "Unable to save the category.",
  );
}

export async function skipContacts(keys: string[]) {
  return readJson<{ keys: string[]; skipped_until: string; progress: ContactProgress }>(
    await post("/api/messaging-contacts/skip/", { keys }),
    "Unable to skip these contacts.",
  );
}

export async function createContactCategory(label: string, policy: CategoryPolicy) {
  return readJson<{ category: ContactCategory; categories: ContactCategory[] }>(
    await post("/api/messaging-contacts/categories/", { label, policy }),
    "Unable to add the category.",
  );
}

export async function updateContactCategory(
  id: string,
  label: string,
  policy: CategoryPolicy,
) {
  return readJson<{ category: ContactCategory; categories: ContactCategory[] }>(
    await post(`/api/messaging-contacts/categories/${encodeURIComponent(id)}/`, { label, policy }, "PATCH"),
    "Unable to update the category.",
  );
}

export async function deleteContactCategory(id: string) {
  return readJson<{ id: string; unassigned: number; categories: ContactCategory[] }>(
    await apiFetch(`/api/messaging-contacts/categories/${encodeURIComponent(id)}/`, { method: "DELETE" }),
    "Unable to delete the category.",
  );
}

/** Name to show for a person; falls back to a source identifier. */
export function personLabel(person: Pick<ContactPerson, "display_name" | "identities">): string {
  if (person.display_name) return person.display_name;
  const identity = person.identities[0];
  if (!identity) return "Unknown contact";
  return identity.phone ? `+${identity.phone}` : identity.email ?? identity.contact_id;
}

/** "3 of 12 categorized" style progress text. */
export function progressLabel(progress: ContactProgress): string {
  return `${progress.categorized} of ${progress.total} categorized`;
}
