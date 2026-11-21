import { useEffect, useMemo, useState } from 'react'
import Preloader from './components/Loader/Preloader.jsx'
import GlobeScene from './scenes/GlobeScene.jsx'
import SpikeScene from './scenes/SpikeScene.jsx'
import { preloadDemo } from './data/demoPreload.js'

export default function App() {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const showSpike = params.has('spike')
  const demo = params.has('demo') || params.has('skipIntro')
  const [ready, setReady] = useState(demo)

  useEffect(() => {
    if (demo) preloadDemo()
  }, [demo])

  if (showSpike) {
    return (
      <main className="app">
        <SpikeScene />
      </main>
    )
  }

  return (
    <main className="app">
      <GlobeScene active={ready} />
      {!ready && <Preloader onComplete={() => setReady(true)} />}
    </main>
  )
}
