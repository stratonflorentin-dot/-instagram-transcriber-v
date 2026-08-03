const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export class ApiError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function handleFetchError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  
  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
  const isHttpTarget = BASE_URL.startsWith("http://");

  if (isHttps && isHttpTarget) {
    return new ApiError(
      "mixed_content_error",
      `Cannot connect to local backend (${BASE_URL}) from an HTTPS deployment (browser Mixed Content security block). Run the web app locally using 'pnpm dev' (at http://localhost:5173) or set VITE_API_BASE_URL to an HTTPS backend.`
    );
  }

  return new ApiError(
    "network_error",
    `Failed to connect to backend server at ${BASE_URL}. Please ensure the Python backend is running locally (e.g. 'pnpm dev').`
  );
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let code = "request_failed";
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.detail?.message ?? body.detail ?? message;
      code = body.detail?.code ?? code;
    } catch {
      // response body wasn't JSON — fall back to statusText
    }
    throw new ApiError(code, message);
  }
  return (await res.json()) as T;
}

export async function getJson<T>(path: string): Promise<T> {
  try {
    const res = await fetch(`${BASE_URL}${path}`);
    return await handleResponse<T>(res);
  } catch (err) {
    throw handleFetchError(err);
  }
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await handleResponse<T>(res);
  } catch (err) {
    throw handleFetchError(err);
  }
}

export async function postForm<T>(path: string, form: FormData): Promise<T> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, { method: "POST", body: form });
    return await handleResponse<T>(res);
  } catch (err) {
    throw handleFetchError(err);
  }
}

export async function del(path: string): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, { method: "DELETE" });
    if (!res.ok) throw await handleResponse<void>(res);
  } catch (err) {
    throw handleFetchError(err);
  }
}

export function downloadFileUrl(path: string): string {
  return `${BASE_URL}${path}`;
}
