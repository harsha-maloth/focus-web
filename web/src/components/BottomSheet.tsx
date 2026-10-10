import { useEffect, useId, useRef, type ReactNode } from 'react'

type BottomSheetProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/**
 * A modal sheet: slides up from the bottom on phones, centred on wide screens.
 * Built on the native <dialog>, so the browser handles the focus trap, Escape and
 * the inert background. Children are only mounted while open, so forms start fresh each time.
 */
export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        // The body fills the dialog, so a click on the dialog itself is a click on the backdrop.
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="sheet-body">
        <div className="sheet-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Close
          </button>
        </div>
        {open ? children : null}
      </div>
    </dialog>
  )
}
