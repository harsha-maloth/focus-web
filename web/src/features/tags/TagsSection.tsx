import { useState, type FormEvent } from 'react'
import type { Tag } from '../../lib/types'
import { TagChip } from './TagChip'
import { useCreateTag, useDeleteTag, useTags, useUpdateTag } from './queries'

const PALETTE = ['#0b5563', '#f2542d', '#2e8b57', '#7b5ea7', '#d4a017', '#c2185b', '#3f6fd1', '#6d7b80']

export function TagsSection({ userId }: { userId: string }) {
  const tags = useTags(userId)
  const create = useCreateTag(userId)
  const [name, setName] = useState('')
  const [color, setColor] = useState(PALETTE[0])
  const [error, setError] = useState<string | null>(null)

  async function onAdd(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setError(null)
    try {
      await create.mutateAsync({ name: trimmed, color })
      setName('')
      setColor(PALETTE[((tags.data?.length ?? 0) + 1) % PALETTE.length])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the tag.')
    }
  }

  return (
    <section className="stack form-wide" aria-labelledby="tags-heading">
      <h2 id="tags-heading">Tags</h2>
      <p className="muted">Group sessions by what you work on. Deleting a tag keeps its sessions.</p>

      <form onSubmit={onAdd} className="tag-add">
        <div className="field">
          <label htmlFor="new-tag">New tag</label>
          <input
            id="new-tag"
            type="text"
            maxLength={30}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Study, Coding, Reading…"
          />
        </div>
        <input
          type="color"
          className="color-input"
          aria-label="Tag colour"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={create.isPending || !name.trim()}>
          Add
        </button>
      </form>
      {error ? <p className="form-error" role="alert">{error}</p> : null}

      {tags.isPending ? (
        <p className="muted" aria-busy="true">Loading tags…</p>
      ) : tags.isError ? (
        <p className="form-error" role="alert">Couldn't load your tags.</p>
      ) : tags.data.length === 0 ? (
        <p className="muted">No tags yet.</p>
      ) : (
        <ul className="tag-list">
          {tags.data.map((tag) => (
            <TagRow key={tag.id} tag={tag} userId={userId} />
          ))}
        </ul>
      )}
    </section>
  )
}

function TagRow({ tag, userId }: { tag: Tag; userId: string }) {
  const update = useUpdateTag(userId)
  const remove = useDeleteTag(userId)
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [name, setName] = useState(tag.name)
  const [color, setColor] = useState(tag.color)
  const [error, setError] = useState<string | null>(null)

  async function onSave(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setError(null)
    try {
      await update.mutateAsync({ id: tag.id, name: trimmed, color })
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the tag.')
    }
  }

  async function onDelete() {
    setError(null)
    try {
      await remove.mutateAsync(tag.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the tag.')
      setConfirming(false)
    }
  }

  if (editing) {
    return (
      <li className="tag-row">
        <form onSubmit={onSave} className="tag-edit">
          <input
            type="text"
            maxLength={30}
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Tag name"
          />
          <input
            type="color"
            className="color-input"
            aria-label="Tag colour"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={update.isPending || !name.trim()}>
            Save
          </button>
          <button
            type="button"
            className="btn btn-quiet"
            onClick={() => {
              setEditing(false)
              setName(tag.name)
              setColor(tag.color)
              setError(null)
            }}
          >
            Cancel
          </button>
        </form>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
      </li>
    )
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
            <button type="button" className="btn btn-quiet" onClick={() => setEditing(true)}>
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
