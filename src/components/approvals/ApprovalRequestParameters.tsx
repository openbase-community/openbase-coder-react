import type { ReactNode } from "react";

type ApprovalRequestParametersProps = {
  params: Record<string, unknown>;
};

const HIDDEN_KEYS = new Set(["description", "name", "source"]);
const KEY_PRIORITY = new Map([
  ["message", 0],
  ["message_text", 1],
  ["body", 2],
  ["details", 3],
  ["justification", 4],
  ["reason", 5],
  ["command", 6],
]);

function fieldLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (value) => value.toUpperCase());
}

function sortedEntries(value: Record<string, unknown>) {
  return Object.entries(value)
    .filter(([, item]) => item !== undefined && item !== null && item !== "")
    .sort(([left], [right]) => {
      const leftPriority = KEY_PRIORITY.get(left) ?? 100;
      const rightPriority = KEY_PRIORITY.get(right) ?? 100;
      return leftPriority - rightPriority || left.localeCompare(right);
    });
}

function stringValue(value: string, key: string): ReactNode {
  const isCode = key === "command" || key === "path" || key === "cwd";
  return (
    <span
      className={`whitespace-pre-wrap break-words text-[12px] leading-relaxed text-foreground/90 ${
        isCode ? "font-mono text-[11px]" : ""
      }`}
    >
      {value}
    </span>
  );
}

function ApprovalValue({ value, fieldKey }: { value: unknown; fieldKey: string }) {
  if (typeof value === "string") return stringValue(value, fieldKey);
  if (typeof value === "boolean") {
    return <span className="text-[12px] text-foreground/90">{value ? "Yes" : "No"}</span>;
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return <span className="font-mono text-[11px] text-foreground/90">{String(value)}</span>;
  }
  if (Array.isArray(value)) {
    return (
      <ul className="space-y-1">
        {value.map((item, index) => (
          <li key={index} className="flex min-w-0 gap-2 before:text-muted-foreground before:content-['•']">
            <ApprovalValue value={item} fieldKey={fieldKey} />
          </li>
        ))}
      </ul>
    );
  }
  if (value && typeof value === "object") {
    const entries = sortedEntries(value as Record<string, unknown>);
    return (
      <dl className="grid gap-x-3 gap-y-1.5 sm:grid-cols-[max-content_minmax(0,1fr)]">
        {entries.map(([key, item]) => (
          <div key={key} className="contents">
            <dt className="text-[10.5px] font-medium text-muted-foreground">
              {fieldLabel(key)}
            </dt>
            <dd className="min-w-0">
              <ApprovalValue value={item} fieldKey={key} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }
  return <span className="text-[12px] text-muted-foreground">None</span>;
}

export function ApprovalRequestParameters({ params }: ApprovalRequestParametersProps) {
  const hasDetails =
    params.details !== null &&
    typeof params.details === "object" &&
    !Array.isArray(params.details) &&
    Object.keys(params.details).length > 0;
  const entries = sortedEntries(params).filter(
    ([key]) => !HIDDEN_KEYS.has(key) && !(key === "justification" && hasDetails),
  );
  if (entries.length === 0) return null;

  return (
    <dl className="mt-2 overflow-hidden rounded border border-border bg-background">
      {entries.map(([key, value], index) => (
        <div
          key={key}
          className={`grid min-w-0 gap-1.5 px-2.5 py-2 sm:grid-cols-[7rem_minmax(0,1fr)] ${
            index > 0 ? "border-t border-border" : ""
          }`}
        >
          <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
            {fieldLabel(key)}
          </dt>
          <dd className="min-w-0">
            <ApprovalValue value={value} fieldKey={key} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
