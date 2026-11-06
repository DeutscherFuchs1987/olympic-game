import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import gsap from 'gsap'
import Globe from '../components/Globe/Globe.jsx'
import EventCard from '../components/EventCard/EventCard.jsx'
import MedalRace from '../components/MedalRace/MedalRace.jsx'
import SoundToggle from '../components/Hud/SoundToggle.jsx'
import MascotButton from '../components/Mascots/MascotButton.jsx'
import MascotGallery from '../components/Mascots/MascotGallery.jsx'
import EraAtmosphere from '../components/Atmosphere/EraAtmosphere.jsx'
import CancelledNotice from '../components/Atmosphere/CancelledNotice.jsx'
import { playHover, playSelect, setEraMood } from '../audio/audio.js'
import Timeline, { MIN_YEAR, MAX_YEAR } from '../components/Timeline/Timeline.jsx'
import { useCameraFlight } from '../hooks/useCameraFlight.js'
import { useScrollTimeline } from '../hooks/useScrollTimeline.js'
import { HELD_GAMES, CANCELLED_GAMES, SEASON_COLOR, getEra, colorForSeason } from '../data/olympics.js'
import { MASCOTS } from '../data/mascots.js'
import { cityRu } from '../data/wikiTitles.js'
import { countryName } from '../data/countries.js'

const nearestByYear = (year) =>
  HELD_GAMES.reduce(
    (best, g) => (Math.abs(g.year - year) < Math.abs(best.year - year) ? g : best),
    HELD_GAMES[0],
  )

function FlightOnSelect({ selected, controlsRef, groupRef, mapMode, morphing, eraId }) {
  const { flyToEvent, resetView } = useCameraFlight(controlsRef, groupRef, eraId)
  const ready = useRef(false)
  const modeRef = useRef({ mapMode, morphing })

  useEffect(() => {
    modeRef.current = { mapMode, morphing }
  }, [mapMode, morphing])

  useEffect(() => {
    if (modeRef.current.mapMode || modeRef.current.morphing) {
      ready.current = true
      return
    }
    if (selected) flyToEvent(selected)
    else if (ready.current) resetView()
    ready.current = true
  }, [selected, flyToEvent, resetView])

  return null
}

const SceneContents = ({
  cities,
  hovered,
  selected,
  activeGame,
  revealYear,
  visitedIds,
  onHover,
  onSelect,
  labelRef,
  mapMode,
  morphing,
  morphRef,
  timeRef,
  eraId,
}) => {
  const controlsRef = useRef()
  const groupRef = useRef()

  return (
    <>
      <color attach="background" args={['#04060d']} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 3, 5]} intensity={1.5} />
      <pointLight position={[-6, -2, -4]} intensity={0.4} color="#4aa3ff" />

      <Stars radius={90} depth={50} count={4000} factor={4} saturation={0} fade speed={0.4} />

      <Globe
        cities={cities}
        onHover={onHover}
        onSelect={onSelect}
        activeGame={activeGame}
        selectedGame={selected}
        revealYear={revealYear}
        visitedIds={visitedIds}
        paused={!!hovered || !!selected || mapMode || morphing}
        mapMode={mapMode}
        morphing={morphing}
        morphRef={morphRef}
        timeRef={timeRef}
        eraId={eraId}
        controlsRef={controlsRef}
        groupRef={groupRef}
        labelRef={labelRef}
      />

      <FlightOnSelect
        selected={selected}
        controlsRef={controlsRef}
        groupRef={groupRef}
        mapMode={mapMode}
        morphing={morphing}
        eraId={eraId}
      />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enabled={!mapMode && !morphing}
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.45}
        minDistance={3}
        maxDistance={12}
      />
    </>
  )
}

const MemoScene = memo(SceneContents)

export default function GlobeScene({ active = false }) {
  const [hovered, setHovered] = useState(null)
  const [selected, setSelected] = useState(null)
  const [visited, setVisited] = useState(() => new Set())
  const [playing, setPlaying] = useState(false)
  const [mascotsOpen, setMascotsOpen] = useState(false)
  const [eraChapterOpen, setEraChapterOpen] = useState(false)
  const [mapMode, setMapMode] = useState(false)
  const [morphing, setMorphing] = useState(false)
  const morphRef = useRef(0)
  const tooltipRef = useRef()
  const labelRef = useRef()
  const hoverIdRef = useRef(null)
  const playRef = useRef({ t: MIN_YEAR })

  const { time, timeRef, setTime, onWheel } = useScrollTimeline({
    minYear: MIN_YEAR,
    maxYear: MAX_YEAR,
    initial: MIN_YEAR,
  })

  const nearest = useMemo(() => nearestByYear(time), [time])
  const activeGame = selected ?? nearest
  const activeId = activeGame?.id ?? null
  const revealYear = Math.floor(time + 0.5)
  const era = useMemo(() => getEra(activeGame?.year ?? time), [activeGame, time])
  const mascotCount = useMemo(() => HELD_GAMES.filter((g) => MASCOTS[g.id]).length, [])

  useEffect(() => {
    setEraMood(era.id)
  }, [era.id])

  const closeIfFar = useCallback((year) => {
    setSelected((prev) => (prev && Math.abs(year - prev.year) > 0.75 ? null : prev))
  }, [])

  const handleHover = useCallback((city, coords) => {
    if (city && coords && tooltipRef.current) {
      tooltipRef.current.style.transform = `translate(${coords.x + 18}px, ${coords.y + 18}px)`
    }
    const id = city?.id ?? null
    if (id && id !== hoverIdRef.current) playHover()
    hoverIdRef.current = id
    setHovered((prev) => (prev?.id === city?.id ? prev : city))
  }, [])

  const handleSelect = useCallback(
    (game) => {
      if (!game) return
      gsap.killTweensOf(playRef.current)
      setPlaying(false)
      setSelected(game)
      setTime(game.year)
      playSelect(game.season)
      setVisited((prev) => {
        if (prev.has(game.id)) return prev
        const next = new Set(prev)
        next.add(game.id)
        return next
      })
    },
    [setTime],
  )

  const handleScrub = useCallback(
    (year) => {
      setTime(year)
      closeIfFar(year)
    },
    [setTime, closeIfFar],
  )

  const handleCommit = useCallback(
    (year) => {
      const g = nearestByYear(year)
      if (g) handleSelect(g)
    },
    [handleSelect],
  )

  const handleWheel = useCallback(
    (e) => {
      if (playing) {
        gsap.killTweensOf(playRef.current)
        setPlaying(false)
      }
      onWheel(e)
      closeIfFar(timeRef.current)
    },
    [playing, onWheel, closeIfFar, timeRef],
  )

  const togglePlay = useCallback(() => {
    if (playing) {
      gsap.killTweensOf(playRef.current)
      setPlaying(false)
      return
    }
    let from = timeRef.current
    if (from >= MAX_YEAR - 0.5) from = MIN_YEAR
    playRef.current.t = from
    setSelected(null)
    setPlaying(true)
    gsap.to(playRef.current, {
      t: MAX_YEAR,
      duration: (MAX_YEAR - from) * 1.15,
      ease: 'none',
      onUpdate: () => setTime(playRef.current.t),
      onComplete: () => setPlaying(false),
    })
  }, [playing, setTime, timeRef])

  const toggleMap = useCallback(() => {
    if (morphing) return
    const next = !mapMode
    setMapMode(next)
    setMorphing(true)
    gsap.killTweensOf(morphRef)
    gsap.to(morphRef, {
      current: next ? 1 : 0,
      duration: 1.8,
      ease: 'power2.inOut',
      onComplete: () => setMorphing(false),
    })
  }, [mapMode, morphing])

  useEffect(() => () => {
    gsap.killTweensOf(playRef.current)
    gsap.killTweensOf(morphRef)
  }, [])

  return (
    <div className={`scene era-${era.id}${active ? ' scene--active' : ''}${eraChapterOpen ? ' scene--era-chapter' : ''}${mapMode ? ' scene--map' : ''}`}>
      <div className="scene__canvas" onWheel={handleWheel}>
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 2.4, 5.6], fov: 45 }}
          gl={{ antialias: true }}
        >
          <MemoScene
            cities={HELD_GAMES}
            hovered={hovered}
            selected={selected}
            activeGame={activeGame}
            revealYear={revealYear}
            visitedIds={visited}
            onHover={handleHover}
            onSelect={handleSelect}
            labelRef={labelRef}
            mapMode={mapMode}
            morphing={morphing}
            morphRef={morphRef}
            timeRef={timeRef}
            eraId={era.id}
          />
        </Canvas>
      </div>

      <EraAtmosphere era={era} onChapterChange={setEraChapterOpen} />

      <div
        ref={labelRef}
        className={`marker-label${activeGame?.cancelled ? ' marker-label--cancelled' : ''}`}
        aria-hidden="true"
        style={{ '--accent': activeGame?.cancelled ? '#ee334e' : colorForSeason(activeGame?.season) }}
      >
        <span className="marker-label__year">{activeGame?.year}</span>
        <span className="marker-label__city">{cityRu(activeGame?.city)}</span>
        {activeGame?.cancelled && <span className="marker-label__cancelled">не состоялись</span>}
      </div>

      <div className="hud">
        <div className="hud__title">ОЛИМПИЙСКИЕ ИГРЫ</div>
        <div className="hud__subtitle">1896 — 2028 · одна точка — одна Игра</div>
        <div className="hud__era">{era.label}</div>
        <div className="hud__medium">{era.medium}</div>
        <div className="hud__legend">
          <span><i style={{ background: SEASON_COLOR.summer }} />Летние</span>
          <span><i style={{ background: SEASON_COLOR.winter }} />Зимние</span>
        </div>
        <div className="hud__hint">перетащите, чтобы вращать · кликните по точке — увидите границы страны · скролл = время</div>
      </div>

      <div ref={tooltipRef} className={`tooltip${hovered ? ' tooltip--visible' : ''}`}>
        {hovered && (
          <>
            <span className="tooltip__city">{cityRu(hovered.city)}</span>
            <span className="tooltip__meta">
              {hovered.year} · {hovered.season === 'winter' ? 'Зимние' : 'Летние'}
            </span>
            <span className="tooltip__country">{countryName(hovered.countryCode)}</span>
            {hovered.cancelled && (
              <span className="tooltip__cancelled">Игры не состоялись</span>
            )}
          </>
        )}
      </div>

      <Timeline
        games={HELD_GAMES}
        cancelledGames={CANCELLED_GAMES}
        time={time}
        activeId={activeId}
        playing={playing}
        onChange={handleScrub}
        onCommit={handleCommit}
        onSelectGame={handleSelect}
        onTogglePlay={togglePlay}
      />

      <CancelledNotice time={time} games={CANCELLED_GAMES} selected={selected} />

      <MedalRace games={HELD_GAMES} time={time} />

      <SoundToggle />

      <MascotButton onClick={() => setMascotsOpen(true)} count={mascotCount} />

      <button
        type="button"
        className={`map-toggle${mapMode ? ' map-toggle--on' : ''}${morphing ? ' map-toggle--busy' : ''}`}
        onClick={toggleMap}
        disabled={morphing}
        aria-pressed={mapMode}
        aria-label={mapMode ? 'Вернуться к глобусу' : 'Развернуть карту'}
      >
        <span className="map-toggle__icon" aria-hidden="true"><i /><i /><i /><i /></span>
        <span className="map-toggle__label">{mapMode ? 'Глобус' : 'Карта'}</span>
      </button>

      <EventCard event={selected} onClose={() => setSelected(null)} />

      <MascotGallery
        open={mascotsOpen}
        onClose={() => setMascotsOpen(false)}
        onOpenGame={handleSelect}
      />
    </div>
  )
}
