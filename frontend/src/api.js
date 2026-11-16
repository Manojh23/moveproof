export async function request(path, { method = "GET", body, signal } = {}) {
  const response = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(data?.error || "MoveProof could not complete the request.");
  return data;
}
