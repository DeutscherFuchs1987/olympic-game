import { useEffect, useState } from 'react'
import { isMuted, isReady, startAudio, toggleMuted } from '../../audio/audio.js'

export default function SoundToggle() {
  const [ready, setReady] = useState(false)
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    const onFirstGesture = () => {
      startAudio()
        .then(() => {
          setReady(isReady())
          setMuted(isMuted())
        })
        .catch(() => {})
    }
    window.addEventListener('pointerdown', onFirstGesture, { once: true })
    return () => window.removeEventListener('pointerdown', onFirstGesture)
  }, [])

  const onClick = async () => {
    try {
      if (!isReady()) {
        await startAudio()
        setReady(isReady())
        setMuted(isMuted())
        // The first click starts audio; do not immediately mute it again.
        return
      }
      setMuted(toggleMuted())
    } catch {
      /* ignore audio errors */
    }
  }

  const silent = muted || !ready

  return (
    <button
      className={`sound-toggle${silent ? ' sound-toggle--silent' : ''}`}
      onClick={onClick}
      aria-label="Звук"
    >
      <span className="sound-toggle__bars" aria-hidden="true">
        <i /><i /><i /><i />
      </span>
      <span className="sound-toggle__label">
        {muted ? 'без звука' : ready ? 'звук вкл' : 'включить звук'}
      </span>
    </button>
  )
}
