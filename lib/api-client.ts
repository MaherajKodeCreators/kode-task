/** Client-side fetch helper matching the { success, data } / { success, message } envelope. */

export type ApiSuccess<T> = { success: true; data: T }
export type ApiFailure = { success: false; message: string; errors?: Record<string, string[]> }
export type ApiResult<T> = ApiSuccess<T> | ApiFailure

export async function apiFetch<T>(input: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const response = await fetch(input, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })

    const body = (await response.json()) as ApiResult<T>
    return body
  } catch {
    return { success: false, message: 'Network error. Please check your connection and try again.' }
  }
}

export function apiGet<T>(url: string) {
  return apiFetch<T>(url)
}

export function apiPost<T>(url: string, body: unknown) {
  return apiFetch<T>(url, { method: 'POST', body: JSON.stringify(body) })
}

export function apiPatch<T>(url: string, body?: unknown) {
  return apiFetch<T>(url, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined })
}

export function apiDelete<T>(url: string) {
  return apiFetch<T>(url, { method: 'DELETE' })
}
