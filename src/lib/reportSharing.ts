import { apiFetch } from "@/lib/api";

export type ShareTarget = {
  projectPath: string;
  file: string;
};

export type ShareGrant = {
  id: string;
  grantee_email: string;
  role: string;
  revoked_at: string | null;
  created_at: string;
};

export type ShareItem = {
  id: string;
  kind: string;
  title: string;
  origin_item_path: string;
  latest_revision_seq: number | null;
};

export type ShareState = {
  shared: boolean;
  item?: ShareItem;
  grants?: ShareGrant[];
  error?: string;
};

const shareQuery = (target: ShareTarget) =>
  `?path=${encodeURIComponent(target.projectPath)}&file=${encodeURIComponent(target.file)}`;

const asShareState = async (res: Response): Promise<ShareState> => {
  const payload = (await res.json().catch(() => null)) as
    | (ShareState & { error?: string })
    | null;
  if (!res.ok) {
    return { shared: false, error: payload?.error ?? `HTTP ${res.status}` };
  }
  return payload ?? { shared: false, error: "Empty response" };
};

export async function fetchShareState(target: ShareTarget): Promise<ShareState> {
  const res = await apiFetch(`/api/projects/reports/share/${shareQuery(target)}`);
  return asShareState(res);
}

export async function shareReport(target: ShareTarget): Promise<ShareState> {
  const res = await apiFetch(`/api/projects/reports/share/`, {
    method: "POST",
    body: JSON.stringify({ path: target.projectPath, file: target.file }),
  });
  return asShareState(res);
}

export async function unshareReport(target: ShareTarget): Promise<ShareState> {
  const res = await apiFetch(`/api/projects/reports/share/${shareQuery(target)}`, {
    method: "DELETE",
  });
  return asShareState(res);
}

export async function addShareGrant(
  target: ShareTarget,
  email: string,
): Promise<ShareState> {
  const res = await apiFetch(`/api/projects/reports/share/grants/`, {
    method: "POST",
    body: JSON.stringify({ path: target.projectPath, file: target.file, email }),
  });
  return asShareState(res);
}

export async function revokeShareGrant(
  target: ShareTarget,
  grantId: string,
): Promise<ShareState> {
  const res = await apiFetch(`/api/projects/reports/share/grants/revoke/`, {
    method: "POST",
    body: JSON.stringify({
      path: target.projectPath,
      file: target.file,
      grant_id: grantId,
    }),
  });
  return asShareState(res);
}
