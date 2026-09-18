'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

/**
 * Built on the native <dialog> element: Esc-to-close, focus trap, and a
 * backdrop click target come for free, no extra dependency needed.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return

    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      // Clicking the backdrop (the ::backdrop pseudo-element sits behind the
      // dialog box) fires click on the <dialog> itself only when the click
      // target is the dialog element, not something inside it.
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
      className="m-auto w-full max-w-lg rounded-2xl border border-border-light bg-white p-0 backdrop:bg-black/40 open:animate-in open:fade-in"
    >
      <div className="flex items-start justify-between gap-4 border-b border-border-light px-6 py-4">
        <div>
          <h2 className="text-base font-semibold text-text-primary">{title}</h2>
          {description && <p className="mt-1 text-xs text-text-secondary">{description}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="shrink-0 rounded-full p-1.5 text-text-secondary hover:bg-surface-overlay"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="px-6 py-5">{children}</div>
    </dialog>
  )
}
