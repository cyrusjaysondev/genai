export async function executeAction(
  podId: string,
  method: string,
  path: string
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: { 'x-pod-id': podId },
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
}
