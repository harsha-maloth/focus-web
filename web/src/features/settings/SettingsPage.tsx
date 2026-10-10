import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useSnackbar } from '../../components/Snackbar'
import {
  AMBIENT_LABELS,
  AMBIENT_OPTIONS,
  SOUND_LABELS,
  SOUND_OPTIONS,
  normalizeSound,
  playEndSound,
  readAmbient,
  unlockAudio,
  type Ambient,
  type EndSound,
} from '../../lib/audio'
import {
  disableNotifications,
  enableNotifications,
  notificationsEnabled,
  notificationsSupported,
} from '../../lib/notify'
import { useAuth } from '../auth/AuthProvider'
import { TagsSection } from '../tags/TagsSection'
import {
  deleteMyAccount,
  useProfile,
  useSaveProfile,
  useSaveSettings,
  useSettings,
  useTimeZones,
} from './queries'
import { timeZoneOptions } from '../../lib/timezone'
import type { Profile, UserSettings } from '../../lib/types'

export function SettingsPage() {
  const { user } = useAuth()
  const userId = user!.id // RequireAuth guarantees a user here
  const profile = useProfile(userId)
  const settings = useSettings(userId)
  const zones = useTimeZones()

  if (profile.isPending || settings.isPending) {
    return <p className="muted" aria-busy="true">Loading your settings…</p>
  }
  if (profile.isError || settings.isError || !profile.data || !settings.data) {
    return (
      <p className="form-error" role="alert">
        Couldn't load your settings. Check your connection and reload the page.
      </p>
    )
  }

  return (
    <div className="page">
      <h1 className="page-title">Settings</h1>
      <SettingsForm
        key={profile.data.timezone}
        userId={userId}
        email={user?.email ?? ''}
        profile={profile.data}
        settings={settings.data}
        zones={zones.data ?? []}
      />
      <TagsSection userId={userId} />
      <DeleteAccount />
    </div>
  )
}

function SettingsForm(props: {
  userId: string
  email: string
  profile: Profile
  settings: UserSettings
  /** Time zones the server accepts. May be empty while loading. */
  zones: string[]
}) {
  const { userId, email, profile, settings, zones } = props
  const saveProfile = useSaveProfile(userId)
  const saveSettings = useSaveSettings(userId)
  const snackbar = useSnackbar()

  const [name, setName] = useState(profile.display_name)
  const [timezone, setTimezone] = useState(profile.timezone)
  const [focusMinutes, setFocusMinutes] = useState(String(settings.default_minutes))
  const [breakMinutes, setBreakMinutes] = useState(String(settings.break_minutes))
  const [sound, setSound] = useState<EndSound>(normalizeSound(settings.sound))
  const [ambient, setAmbient] = useState<Ambient>(readAmbient(settings.zen))
  const [notifyOn, setNotifyOn] = useState(notificationsEnabled)
  const [notifyNote, setNotifyNote] = useState<string | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function onToggleNotify(next: boolean) {
    setNotifyNote(null)
    if (!next) {
      disableNotifications()
      setNotifyOn(false)
      return
    }
    const result = await enableNotifications()
    setNotifyOn(result === 'enabled')
    if (result === 'denied') setNotifyNote('Notifications are blocked for this site. Allow them in the browser settings.')
    if (result === 'unsupported') setNotifyNote("This browser doesn't support notifications.")
  }

  const focus = Number(focusMinutes)
  const rest = Number(breakMinutes)
  const focusValid = Number.isInteger(focus) && focus >= 1 && focus <= 240
  const breakValid = Number.isInteger(rest) && rest >= 1 && rest <= 60
  const saving = saveProfile.isPending || saveSettings.isPending

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!focusValid || !breakValid) return
    setMessage(null)
    try {
      await Promise.all([
        saveProfile.mutateAsync({
          display_name: name.trim().slice(0, 40),
          timezone,
          timezone_confirmed: true,
        }),
        saveSettings.mutateAsync({
          default_minutes: focus,
          break_minutes: rest,
          sound,
          zen: { ...settings.zen, ambient },
        }),
      ])
      snackbar('Settings saved', 'success')
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'Could not save.' })
    }
  }

  return (
    <form onSubmit={onSubmit} className="stack form-wide">
      <fieldset className="stack">
        <legend>Profile</legend>
        <div className="field">
          <label htmlFor="display-name">Display name</label>
          <input
            id="display-name"
            type="text"
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="nickname"
          />
        </div>
        <div className="field">
          <label htmlFor="email-readonly">Email</label>
          <input id="email-readonly" type="email" value={email} readOnly />
        </div>
        <div className="field">
          <label htmlFor="timezone">Time zone</label>
          <select id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {timeZoneOptions(zones, profile.timezone).map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
          <p className="hint">Daily and weekly totals are counted in this time zone.</p>
        </div>
      </fieldset>

      <fieldset className="stack">
        <legend>Timer defaults</legend>
        <div className="field-row">
          <div className="field">
            <label htmlFor="focus-minutes">Focus (minutes)</label>
            <input
              id="focus-minutes"
              type="number"
              inputMode="numeric"
              min={1}
              max={240}
              value={focusMinutes}
              onChange={(e) => setFocusMinutes(e.target.value)}
              aria-invalid={!focusValid}
            />
          </div>
          <div className="field">
            <label htmlFor="break-minutes">Break (minutes)</label>
            <input
              id="break-minutes"
              type="number"
              inputMode="numeric"
              min={1}
              max={60}
              value={breakMinutes}
              onChange={(e) => setBreakMinutes(e.target.value)}
              aria-invalid={!breakValid}
            />
          </div>
        </div>
        {!focusValid || !breakValid ? (
          <p className="form-error" role="alert">
            Focus must be 1–240 minutes and break 1–60 minutes.
          </p>
        ) : null}
      </fieldset>

      <fieldset className="stack">
        <legend>Sound and alerts</legend>
        <div className="field">
          <label htmlFor="end-sound">End of session sound</label>
          <div className="actions">
            <select id="end-sound" value={sound} onChange={(e) => setSound(normalizeSound(e.target.value))}>
              {SOUND_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {SOUND_LABELS[o]}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-outline"
              disabled={sound === 'none'}
              onClick={() => {
                unlockAudio()
                playEndSound(sound)
              }}
            >
              Test sound
            </button>
          </div>
        </div>
        <div className="field">
          <label htmlFor="ambient">Ambient sound in zen mode</label>
          <select id="ambient" value={ambient} onChange={(e) => setAmbient(readAmbient({ ambient: e.target.value }))}>
            {AMBIENT_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {AMBIENT_LABELS[o]}
              </option>
            ))}
          </select>
          <p className="hint">Generated in your browser. Plays only while zen mode is open.</p>
        </div>
        {notificationsSupported() ? (
          <div className="field">
            <label className="check">
              <input type="checkbox" checked={notifyOn} onChange={(e) => void onToggleNotify(e.target.checked)} />
              <span>Notify me when a session ends while this tab is hidden</span>
            </label>
            <p className="hint">This choice is saved on this device only.</p>
            {notifyNote ? <p className="form-error" role="alert">{notifyNote}</p> : null}
          </div>
        ) : null}
      </fieldset>

      <div className="actions">
        <button type="submit" className="btn btn-primary" disabled={saving || !focusValid || !breakValid}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <span
          className={message?.ok === false ? 'form-error' : 'muted'}
          role={message?.ok === false ? 'alert' : 'status'}
        >
          {message?.text}
        </span>
      </div>
    </form>
  )
}

function DeleteAccount() {
  const queryClient = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onDelete() {
    setBusy(true)
    setError(null)
    try {
      await deleteMyAccount()
      queryClient.clear()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete your account.')
      setBusy(false)
    }
  }

  return (
    <section className="danger-zone stack" aria-labelledby="delete-heading">
      <h2 id="delete-heading">Delete account</h2>
      <p className="muted">
        This removes your profile, tags and every session. It can't be undone.
      </p>
      {confirming ? (
        <div className="actions">
          <button type="button" className="btn btn-danger" onClick={onDelete} disabled={busy}>
            {busy ? 'Deleting…' : 'Delete my account'}
          </button>
          <button type="button" className="btn btn-quiet" onClick={() => setConfirming(false)} disabled={busy}>
            Keep my account
          </button>
        </div>
      ) : (
        <div className="actions">
          <button type="button" className="btn btn-outline-danger" onClick={() => setConfirming(true)}>
            Delete account
          </button>
        </div>
      )}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  )
}
