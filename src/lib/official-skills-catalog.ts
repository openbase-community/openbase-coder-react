export type OfficialSkillSetupKind =
  | "oauth"
  | "local-permission-import"
  | "pairing"
  | "console-flow"
  | "agent-guided";

export type OfficialSkillCatalogEntry = {
  slug: string;
  name: string;
  status: "Official" | "Endorsed";
  category: "Private data" | "Workflow" | "Automation" | "Agent orchestration";
  tagline: string;
  description: string;
  setup: {
    kind: OfficialSkillSetupKind;
    label: string;
    primaryAction: string;
    integrationTarget: string;
  };
  trustModel: string[];
  outcomes: string[];
};

export const officialSkillsCatalog: OfficialSkillCatalogEntry[] = [
  {
    slug: "gmail",
    name: "Gmail",
    status: "Official",
    category: "Private data",
    tagline: "Email context with approved-sender boundaries.",
    description:
      "Search and summarize trusted Gmail context without handing an agent blanket inbox access.",
    setup: {
      kind: "oauth",
      label: "OAuth and approved senders",
      primaryAction: "Start Gmail auth",
      integrationTarget: "gmail-oauth-approved-senders",
    },
    trustModel: [
      "Metadata-first browsing before opening message bodies.",
      "Approved sender boundaries for sensitive access.",
      "Openbase approval prompts before broader private-data actions.",
      "Audit and revoke behavior for installed access.",
    ],
    outcomes: [
      "Find a trusted vendor thread.",
      "Summarize product feedback from approved senders.",
      "Attach relevant email context to agent work.",
    ],
  },
  {
    slug: "imessage",
    name: "iMessage",
    status: "Official",
    category: "Private data",
    tagline: "Local Messages context with contact allowlists.",
    description:
      "Import local Messages context through explicit Mac permissions and approved contacts.",
    setup: {
      kind: "local-permission-import",
      label: "Permissions, contacts, import",
      primaryAction: "Start local setup",
      integrationTarget: "imessage-permissions-approved-contacts",
    },
    trustModel: [
      "Local-first setup for Messages data on the Mac.",
      "Approved contact and group boundaries.",
      "Openbase approval prompts before private transcript access.",
      "Audit and revoke behavior for local imports and indexes.",
    ],
    outcomes: [
      "Find implementation details from trusted collaborators.",
      "Recover recent decisions from approved chats.",
      "Keep unrelated conversations out of scope.",
    ],
  },
  {
    slug: "whatsapp",
    name: "WhatsApp",
    status: "Official",
    category: "Private data",
    tagline: "Pairing and approved-contact setup for WhatsApp context.",
    description:
      "Use WhatsApp context through explicit pairing, contact approval, and scoped browsing.",
    setup: {
      kind: "pairing",
      label: "Pairing and approved contacts",
      primaryAction: "Start pairing",
      integrationTarget: "whatsapp-pairing-approved-contacts",
    },
    trustModel: [
      "Pairing flow before account-level connection.",
      "Approved contact boundaries for conversation access.",
      "Metadata-first browsing before opening message details.",
      "Audit and revoke behavior for paired access.",
    ],
    outcomes: [
      "Retrieve launch or customer context from approved chats.",
      "Summarize trusted WhatsApp threads.",
      "Keep private conversations out of scope by default.",
    ],
  },
  {
    slug: "reports",
    name: "Reports",
    status: "Official",
    category: "Workflow",
    tagline: "Durable Markdown reports from agent work.",
    description:
      "Capture investigations, implementation summaries, screenshots, validation, and follow-up plans.",
    setup: {
      kind: "console-flow",
      label: "Built-in console flow",
      primaryAction: "Open Reports",
      integrationTarget: "dashboard-reports",
    },
    trustModel: [
      "Report files live in project or global report directories.",
      "Super Agent provenance can be recorded in front matter.",
      "Reports are reviewable before sharing or committing.",
    ],
    outcomes: [
      "Summarize implementation work.",
      "Preserve validation evidence.",
      "Keep project knowledge searchable.",
    ],
  },
  {
    slug: "routines",
    name: "Routines",
    status: "Official",
    category: "Automation",
    tagline: "Scheduled and repeatable Openbase Coder workflows.",
    description:
      "Turn recurring engineering or operational tasks into guided Openbase Coder routines.",
    setup: {
      kind: "console-flow",
      label: "Routine configuration",
      primaryAction: "Configure routine",
      integrationTarget: "dashboard-routines",
    },
    trustModel: [
      "Routine behavior is reviewable before it runs.",
      "Approval prompts still apply to important actions.",
      "Runs can produce durable reports for auditability.",
    ],
    outcomes: [
      "Run recurring repo health checks.",
      "Prepare planning or status summaries.",
      "Kick off repeatable setup checks.",
    ],
  },
  {
    slug: "super-agents",
    name: "Super Agents",
    status: "Official",
    category: "Agent orchestration",
    tagline: "Launch and steer focused agent threads.",
    description:
      "Coordinate asynchronous Super Agent threads for implementation, investigation, validation, and handoff work.",
    setup: {
      kind: "agent-guided",
      label: "Agent-guided onboarding",
      primaryAction: "Start guided setup",
      integrationTarget: "super-agent-guided-setup",
    },
    trustModel: [
      "Agent threads keep an auditable work record.",
      "Approval prompts stay in place for commands and important actions.",
      "Reports can tie outcomes back to a specific agent session.",
    ],
    outcomes: [
      "Dispatch focused implementation work.",
      "Steer long-running investigations.",
      "Collect validated outputs from specialized agents.",
    ],
  },
];
