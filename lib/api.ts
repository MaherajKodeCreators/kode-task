import { ZodError, type ZodType } from 'zod'

/** Consistent envelopes: { success: true, data } / { success: false, message }. */

export function successResponse<T>(data: T, status = 200): Response {
  return Response.json({ success: true, data }, { status })
}

export function errorResponse(
  message: string,
  status = 400,
  errors?: Record<string, string[]>
): Response {
  return Response.json({ success: false, message, ...(errors && { errors }) }, { status })
}

/**
 * Parses and validates a JSON body.
 * Returns field errors for forms; never leaks database or stack detail.
 */
export async function parseBody<T>(
  request: Request,
  schema: ZodType<T>
): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return { ok: false, response: errorResponse('Invalid JSON body.', 400) }
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    const { fieldErrors } = (parsed.error as ZodError).flatten()
    return {
      ok: false,
      response: errorResponse(
        'Please check the highlighted fields.',
        422,
        fieldErrors as Record<string, string[]>
      ),
    }
  }

  return { ok: true, data: parsed.data }
}

/**
 * Wraps a handler so an unexpected throw becomes a generic 500 instead of
 * surfacing database internals to the client.
 */
export async function handleRoute(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn()
  } catch (error) {
    console.error('[api]', error)
    return errorResponse('Something went wrong. Please try again.', 500)
  }
}
