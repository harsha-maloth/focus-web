import { useState, type FormEvent } from 'react'
import { BottomSheet } from '../../components/BottomSheet'
import { useSnackbar } from '../../components/Snackbar'
import type { Tag } from '../../lib/types'
import { TagChip } from './TagChip'
import { useCreateTag, useDeleteTag, useTags, useUpdateTag } from './queries'

const PALETTE = ['#0b5563', '#f2542d', '#2e8b57', '#7b5ea7', '#d4a017', '#c2185b', '#3f6fd1', '#6d7b80']

/** Sheet state: closed, adding a tag, or editing one. */
type SheetState = { kind: 'closed' } | { kind: 'add' } | { kind: 'edit'; tag: Tag }

export function TagsSection({ userId }: { userId: string }) {
  const tags = useTags(userId)
  const snackbar = useSnackbar()
  const [sheet, setSheet] = useState<SheetState>({ kind: 'closed' })
  const close = () => setSheet({ kind: 'closed' })

  return (
    <section className="stack form-wide panel" aria-labelledby="tags-heading">
      <div className="section-head">
        <h2 id="tags-heading">Tags</h2>
        <button type="button" className="btn btn-primary" onClick={() => setSheet({ kind: 'add' })}>
          Add tag
        </button>
      </div>
      <p className="muted">Group sessions by what you work on. Deleting a tag keeps its sessions.</p>

      {tags.isPending ? (
        <p className="muted" aria-busy="true">Loading tags…</p>
      ) : tags.isError ? (
        <p className="form-error" role="alert">Couldn't load your tags.</p>
      ) : tags.data.length === 0 ? (
        <p className="muted">No tags yet.</p>
      ) : (
        <ul className="tag-list">
          {tags.data.map((tag) => (
            <TagRow key={tag.id} tag={tag} userId={userId} onEdit={() => setSheet({ kind: 'edit', tag })} />
          ))}
        </ul>
      )}

      <BottomSheet open={sheet.kind !== 'closed'} onClose={close} title={sheet.kind === 'edit' ? 'Edit tag' : 'New tag'}>
        {sheet.kind !== 'closed' ? (
          <TagForm
            userId={userId}
            tag={sheet.kind === 'edit' ? sheet.tag : undefined}
            defaultColor={PALETTE[(tags.data?.length ?? 0) % PALETTE.length]}
            onDone={() => {
              close()
              snackbar(sheet.kind === 'edit' ? 'Tag saved' : 'Tag added', 'success')
            }}
          />
        ) : null}
      </BottomSheet>
    </section>
  )
}

function TagForm({
  userId,
  tag,
  defaultColor,
  onDone,
}: {
  userId: string
  tag: Tag | undefined
  defaultColor: string
  onDone: () => void
}) {
  const create = useCreateTag(userId)
  const update = useUpdateTag(userId)
  const [name, setName] = useState(tag?.name ?? '')
  const [color, setColor] = useState(tag?.color ?? defaultColor)
  const [error, setError] = useState<string | null>(null)
  const pending = create.isPending || update.isPending

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setError(null)
    try {
      if (tag) await update.mutateAsync({ id: tag.id, name: trimmed, color })
      else await create.mutateAsync({ name: trimmed, color })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the tag.')
    }
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <div className="field">
        <label htmlFor="tag-name">Name</label>
        <input
          id="tag-name"
          type="text"
          maxLength={30}
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Study, Coding, Reading…"
        />
      </div>

      <div className="field">
        <span id="tag-colour-label" className="field-label">Colour</span>
        <div className="swatches" role="group" aria-labelledby="tag-colour-label">
          {PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              className="swatch"
              style={{ background: c }}
              aria-label={c}
              aria-pressed={color.toLowerCase() === c}
              onClick={() => setColor(c)}
            />
          ))}
          <input
            type="color"
            className="color-input"
            aria-label="Custom colour"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>
      </div>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <button type="submit" className="btn btn-primary" disabled={pending || !name.trim()}>
        {tag ? 'Save' : 'Add tag'}
      </button>
    </form>
  )
}

function TagRow({ tag, userId, onEdit }: { tag: Tag; userId: string; onEdit: () => void }) {
  const remove = useDeleteTag(userId)
  const snackbar = useSnackbar()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onDelete() {
    setError(null)
    try {
      await remove.mutateAsync(tag.id)
      snackbar('Tag deleted')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the tag.')
      setConfirming(false)
    }
  }

  return (
    <li className="tag-row">
      <div className="tag-view">
        <TagChip tag={tag} />
        {confirming ? (
          <span className="tag-actions">
            <button type="button" className="btn btn-danger" onClick={onDelete} disabled={remove.isPending}>
              Delete
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => setConfirming(false)}>
              Keep
            </button>
          </span>
        ) : (
          <span className="tag-actions">
            <button type="button" className="btn btn-quiet" onClick={onEdit}>
              Edit
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => setConfirming(true)}>
              Delete
            </button>
          </span>
        )}
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </li>
  )
}
