import { useMemo, useState } from 'react'
import Preloader from './components/Loader/Preloader.jsx'
import GlobeScene from './scenes/GlobeScene.jsx'
import SpikeScene from './scenes/SpikeScene.jsx'

export default function App() {
  const [ready, setReady] = useState(false)
  const showSpike = useMemo(
    () => new URLSearchParams(window.location.search).has('spike'),
    [],
  )

  if (showSpike) {
    return (
      <div className="app">
        <SpikeScene />
      </div>
    )
  }

  return (
    <div className="app">
      <GlobeScene active={ready} />
      {!ready && <Preloader onComplete={() => setReady(true)} />}
    </div>
  )
}
