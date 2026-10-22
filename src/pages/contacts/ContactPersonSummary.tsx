import { Badge } from "@/components/ui/badge";
import {
  KIND_LABELS,
  personLabel,
  type ContactPerson,
} from "@/lib/messaging-contacts";
import { relativeTimeShort } from "@/lib/relative-time";
import { Users } from "lucide-react";

/** Name, sources and recency for one person; shared by the queue and lists. */
export function ContactPersonSummary({
  person,
  compact = false,
}: {
  person: ContactPerson;
  compact?: boolean;
}) {
  const label = personLabel(person);
  const identityCount = person.identities.length;
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span
          className={`min-w-0 truncate font-medium text-foreground ${compact ? "text-[12.5px]" : "text-[14px]"}`}
          title={label}
        >
          {label}
        </span>
        {person.is_group ? (
          <Badge variant="outline" className="gap-1 px-1.5 py-0 text-[10px] font-medium">
            <Users className="h-3 w-3" /> Group
          </Badge>
        ) : null}
        {person.kinds.map((kind) => (
          <Badge key={kind} variant="secondary" className="px-1.5 py-0 text-[10px] font-medium">
            {KIND_LABELS[kind] ?? kind}
          </Badge>
        ))}
      </div>
      <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
        {person.last_message_at ? (
          <span title={person.last_message_at}>
            Last message {relativeTimeShort(person.last_message_at)}
          </span>
        ) : null}
        {identityCount > 1 ? <span>{identityCount} linked identities</span> : null}
        {person.send_allowed
          ? <span>Approved to send</span>
          : person.read_allowed
            ? <span>Approved to read</span>
            : null}
      </div>
    </div>
  );
}
