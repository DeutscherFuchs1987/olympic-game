import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import gsap from 'gsap'
import Globe from '../components/Globe/Globe.jsx'
import EventCard from '../components/EventCard/EventCard.jsx'
import GamesPreview from '../components/EventCard/GamesPreview.jsx'
import MedalRace from '../components/MedalRace/MedalRace.jsx'
import MedalButton from '../components/MedalRace/MedalButton.jsx'
import SoundToggle from '../components/Hud/SoundToggle.jsx'
import MascotButton from '../components/Mascots/MascotButton.jsx'
import MascotGallery from '../components/Mascots/MascotGallery.jsx'
import EraAtmosphere from '../components/Atmosphere/EraAtmosphere.jsx'
import CancelledNotice from '../components/Atmosphere/CancelledNotice.jsx'
import { playHover, playSelect, setEraMood } from '../audio/audio.js'
import Timeline, { MIN_YEAR, MAX_YEAR } from '../components/Timeline/Timeline.jsx'
import { useCameraFlight } from '../hooks/useCameraFlight.js'
import { useScrollTimeline } from '../hooks/useScrollTimeline.js'
import { HELD_GAMES, CANCELLED_GAMES, SEASON_COLOR, getEra, colorForSeason, latLonToVector3 } from '../data/olympics.js'
import { ROUTE_SURFACE, arcPoints } from '../components/Globe/routeUtils.js'
import { pointToMapPosition } from '../components/Globe/markerLayout.js'
import { MASCOTS } from '../data/mascots.js'
import { cityRu } from '../data/wikiTitles.js'
import { countryName } from '../data/countries.js'

const nearestByYear = (year, list = HELD_GAMES) =>
  list.reduce(
    (best, g) => (best == null || Math.abs(g.year - year) < Math.abs(best.year - year) ? g : best),
    null,
  )

const PREVIEW_DWELL = 3400
const PLAY_SECONDS_PER_YEAR = 0.6
const HOP_DURATION = 1100

function FlightOnSelect({ selected, controlsRef, groupRef, mapMode, morphing, playing, eraId }) {
  const { flyToEvent, resetView } = useCameraFlight(controlsRef, groupRef, eraId)
  const ready = useRef(false)
  const modeRef = useRef({ mapMode, morphing, playing })

  useEffect(() => {
    modeRef.current = { mapMode, morphing, playing }
  }, [mapMode, morphing, playing])

  useEffect(() => {
    if (modeRef.current.mapMode || modeRef.current.morphing || modeRef.current.playing) {
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
  cancelledGames,
  hovered,
  selected,
  activeGame,
  revealYear,
  timelineTime,
  visitedIds,
  onHover,
  onSelect,
  labelRef,
  mapMode,
  morphing,
  morphRef,
  timeRef,
  eraId,
  playing,
  seasonFilter,
  followUntilRef,
  previewOpen,
  onUserOrbit,
  hopRef,
  focusRelease,
}) => {
  const controlsRef = useRef()
  const groupRef = useRef()

  return (
    <>
      <color attach="background" args={['#04060d']} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 3, 5]} intensity={1.5} />
      <pointLight position={[-6, -2, -4]} intensity={0.4} color="#4aa3ff" />

      <Stars radius={90} depth={50} count={1800} factor={4} saturation={0} fade speed={0.4} />

      <Globe
        cities={cities}
        cancelledGames={cancelledGames}
        onHover={onHover}
        onSelect={onSelect}
        activeGame={activeGame}
        selectedGame={selected}
        revealYear={revealYear}
        timelineTime={timelineTime}
        visitedIds={visitedIds}
        paused={!!hovered || !!selected || mapMode || morphing || playing || previewOpen}
        mapMode={mapMode}
        morphing={morphing}
        morphRef={morphRef}
        timeRef={timeRef}
        eraId={eraId}
        playing={playing}
        seasonFilter={seasonFilter}
        followUntilRef={followUntilRef}
        previewOpen={previewOpen}
        controlsRef={controlsRef}
        groupRef={groupRef}
        labelRef={labelRef}
        hopRef={hopRef}
      />

      <FlightOnSelect
        selected={selected}
        controlsRef={controlsRef}
        groupRef={groupRef}
        mapMode={mapMode}
        morphing={morphing}
        playing={playing}
        eraId={eraId}
      />

      <ReleaseFocus signal={focusRelease} controlsRef={controlsRef} />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enabled={!mapMode && !morphing && (!playing || previewOpen)}
        onStart={onUserOrbit}
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

function ReleaseFocus({ signal, controlsRef }) {
  const lastSignal = useRef(0)

  useEffect(() => {
    if (signal === lastSignal.current) return
    lastSignal.current = signal

    const controls = controlsRef?.current
    if (!controls) return

    // Pull the focus back to the centre of the globe, but keep the current
    // camera direction. The user can immediately orbit the whole Earth.
    gsap.killTweensOf(controls.target)
    gsap.to(controls.target, {
      x: 0,
      y: 0,
      z: 0,
      duration: 0.75,
      ease: 'power2.inOut',
      onUpdate: () => controls.update(),
    })
  }, [signal, controlsRef])

  return null
}

const MemoScene = memo(SceneContents)

export default function GlobeScene({ active = false }) {
  const [hovered, setHovered] = useState(null)
  const [selected, setSelected] = useState(null)
  const [visited, setVisited] = useState(() => new Set())
  const [playing, setPlaying] = useState(false)
  const [mascotsOpen, setMascotsOpen] = useState(false)
  const [medalsOpen, setMedalsOpen] = useState(false)
  const [eraChapterOpen, setEraChapterOpen] = useState(false)
  const [mapMode, setMapMode] = useState(false)
  const [morphing, setMorphing] = useState(false)
  const [seasonFilter, setSeasonFilter] = useState('all')
  const [previewGame, setPreviewGame] = useState(null)
  const [playGame, setPlayGame] = useState(null)
  const [focusRelease, setFocusRelease] = useState(0)
  const morphRef = useRef(0)
  const tooltipRef = useRef()
  const labelRef = useRef()
  const hoverIdRef = useRef(null)
  const playRef = useRef({ t: MIN_YEAR })
  const followUntilRef = useRef(0)
  const hopRef = useRef(null)

  const { time, timeRef, setTime, onWheel } = useScrollTimeline({
    minYear: MIN_YEAR,
    maxYear: MAX_YEAR,
    initial: MIN_YEAR,
  })

  const seasonGames = useMemo(
    () => (seasonFilter === 'all' ? HELD_GAMES : HELD_GAMES.filter((g) => g.season === seasonFilter)),
    [seasonFilter],
  )
  const cancelledSeasonGames = useMemo(
    () => (seasonFilter === 'all'
      ? CANCELLED_GAMES
      : CANCELLED_GAMES.filter((g) => g.season === seasonFilter)),
    [seasonFilter],
  )
  const cardGames = useMemo(
    () => [...seasonGames, ...cancelledSeasonGames].sort(
      (a, b) => a.year - b.year || (a.season === 'winter' ? 1 : -1),
    ),
    [seasonGames, cancelledSeasonGames],
  )

  const playingRef = useRef(false)
  const seasonGamesRef = useRef(seasonGames)
  const playTargetRef = useRef(null)
  const playStoppedRef = useRef(false)
  const skipCurrentOnPlayRef = useRef(false)
  const switchTimer = useRef(null)
  const advanceRef = useRef(null)

  useEffect(() => {
    playingRef.current = playing
  }, [playing])

  useEffect(() => {
    seasonGamesRef.current = seasonGames
  }, [seasonGames])

  const clearPlayCursor = useCallback(() => {
    playTargetRef.current = null
    playStoppedRef.current = false
    hopRef.current = null
  }, [])

  const advancePlayback = useCallback(() => {
    if (!playingRef.current) return
    const list = seasonGamesRef.current
    if (!list.length) {
      setPlaying(false)
      playingRef.current = false
      setPreviewGame(null)
      setPlayGame(null)
      setFocusRelease((value) => value + 1)
      clearPlayCursor()
      return
    }

    let target = playTargetRef.current
    if (target == null) {
      target = list.findIndex((game) => game.year > timeRef.current + 0.02)
      if (target < 0) target = 0
    } else if (playStoppedRef.current) {
      target += 1
    }

    if (target < 0 || target >= list.length) {
      setPlaying(false)
      playingRef.current = false
      setPreviewGame(null)
      setPlayGame(null)
      setFocusRelease((value) => value + 1)
      clearPlayCursor()
      return
    }

    playTargetRef.current = target
    playStoppedRef.current = false
    const next = list[target]
    setPlayGame(next)

    clearTimeout(switchTimer.current)

    const from = timeRef.current
    const sameYear = Math.abs(next.year - from) < 0.02
    const duration = sameYear
      ? 1.1
      : Math.max(0.9, (next.year - from) * PLAY_SECONDS_PER_YEAR)

    gsap.killTweensOf(playRef.current)
    playRef.current.t = from

    if (sameYear) {
      const previous = target > 0 ? list[target - 1] : null

      if (previous && previous.id !== next.id) {
        const a = latLonToVector3(previous.lat, previous.lon, ROUTE_SURFACE)
        const b = latLonToVector3(next.lat, next.lon, ROUTE_SURFACE)
        const points = arcPoints(a, b, 28, 0.65)
        hopRef.current = {
          points,
          mapPoints: points.map((point) => pointToMapPosition(point)),
          start: performance.now(),
          duration: HOP_DURATION,
        }
      }

      // Nudge past the zero-length summer -> winter segment. Otherwise, once
      // the hop ends, the time cursor would still resolve to the summer end of
      // that segment and pull the flame back.
      setTime(next.year + 0.0001)
      // Give the flame and camera time to complete the summer -> winter hop
      // before freezing the view on the stop card.
      switchTimer.current = setTimeout(() => {
        if (!playingRef.current || playTargetRef.current !== target) return
        hopRef.current = null
        setPreviewGame(next)
        playStoppedRef.current = true
      }, HOP_DURATION + 140)
      return
    }

    gsap.to(playRef.current, {
      t: next.year,
      duration,
      ease: 'none',
      onUpdate: () => setTime(playRef.current.t),
      onComplete: () => {
        if (!playingRef.current) return
        setTime(next.year)
        setPreviewGame(next)
        playStoppedRef.current = true
      },
    })
  }, [setTime, clearPlayCursor])

  useEffect(() => {
    advanceRef.current = advancePlayback
  }, [advancePlayback])

  const nearest = useMemo(() => nearestByYear(time, seasonGames), [time, seasonGames])
  const activeGame = selected ?? playGame ?? nearest
  const activeId = activeGame?.id ?? null
  const previewOpen = !!previewGame
  const revealYear = Math.floor(time + 0.5)
  const timelineTime = time
  const era = useMemo(() => getEra(activeGame?.year ?? time), [activeGame, time])
  const mascotCount = useMemo(() => HELD_GAMES.filter((g) => MASCOTS[g.id]).length, [])

  const toggleSeason = useCallback((next) => {
    if (next === seasonFilter) return
    gsap.killTweensOf(playRef.current)
    clearTimeout(switchTimer.current)
    setPreviewGame(null)
    setPlayGame(null)
    clearPlayCursor()
    skipCurrentOnPlayRef.current = false
    setPlaying(false)
    playingRef.current = false
    setSeasonFilter(next)
    setSelected(null)
    setMedalsOpen(false)
    const list = next === 'all' ? HELD_GAMES : HELD_GAMES.filter((g) => g.season === next)
    const target = nearestByYear(timeRef.current, list)
    if (target) {
      followUntilRef.current = performance.now() + 1100
      setTime(target.year)
    }
  }, [seasonFilter, setTime, timeRef, clearPlayCursor])

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
    (game, options) => {
      if (!game) return
      if (seasonFilter !== 'all' && game.season !== seasonFilter) {
        setSeasonFilter(game.season)
      }
      gsap.killTweensOf(playRef.current)
      clearTimeout(switchTimer.current)
      playingRef.current = false
      setPlaying(false)
      setPreviewGame(null)
      setPlayGame(null)
      clearPlayCursor()
      skipCurrentOnPlayRef.current = !!options?.skipOnPlay
      setSelected(game)
      setTime(game.year)
      setMedalsOpen(false)
      playSelect(game.season)
      setVisited((prev) => {
        if (prev.has(game.id)) return prev
        const next = new Set(prev)
        next.add(game.id)
        return next
      })
    },
    [seasonFilter, setTime, clearPlayCursor],
  )

  const handleScrub = useCallback(
    (year) => {
      if (playingRef.current) {
        gsap.killTweensOf(playRef.current)
        clearTimeout(switchTimer.current)
        playingRef.current = false
        setPlaying(false)
        setPreviewGame(null)
        setPlayGame(null)
        clearPlayCursor()
      }
      skipCurrentOnPlayRef.current = false
      followUntilRef.current = performance.now() + 1100
      setTime(year)
      closeIfFar(year)
    },
    [setTime, closeIfFar, clearPlayCursor],
  )

  const handleCommit = useCallback(
    (year) => {
      // Include cancelled editions so a tap on the mobile track can open
      // 1916/1940/1944 instead of jumping to the next held Games.
      const g = nearestByYear(year, cardGames)
      if (g) handleSelect(g)
    },
    [handleSelect, cardGames],
  )

  const handleWheel = useCallback(
    (e) => {
      if (playingRef.current) {
        gsap.killTweensOf(playRef.current)
        clearTimeout(switchTimer.current)
        playingRef.current = false
        setPlaying(false)
        setPreviewGame(null)
        setPlayGame(null)
        clearPlayCursor()
      }
      skipCurrentOnPlayRef.current = false
      followUntilRef.current = performance.now() + 1100
      const targetYear = onWheel(e)
      closeIfFar(targetYear ?? timeRef.current)
    },
    [onWheel, closeIfFar, timeRef, clearPlayCursor],
  )

  const togglePlay = useCallback(() => {
    if (playingRef.current) {
      gsap.killTweensOf(playRef.current)
      clearTimeout(switchTimer.current)
      playingRef.current = false
      hopRef.current = null
      setPlaying(false)
      setFocusRelease((value) => value + 1)
      return
    }

    // Paused mid-travel or on a stop card: continue with the existing target.
    if (playTargetRef.current != null) {
      setPreviewGame(null)
      setPlaying(true)
      playingRef.current = true
      advanceRef.current?.()
      return
    }

    const list = seasonGamesRef.current
    if (!list.length) return
    const first = list[0].year
    const last = list[list.length - 1].year
    let from = timeRef.current
    let skipCurrent = skipCurrentOnPlayRef.current
    skipCurrentOnPlayRef.current = false
    if (from < first - 0.5 || from >= last - 0.5) {
      from = first
      skipCurrent = false
      setTime(first)
    }

    setSelected(null)
    setPreviewGame(null)
    setPlaying(true)
    playingRef.current = true

    const currentIndex = list.findIndex((game) => Math.abs(game.year - from) < 0.1)
    if (currentIndex >= 0) {
      // "Читать подробнее" ends on the current Games card. When playback is
      // resumed after closing that card, move on to the next Games instead of
      // showing the exact same stop card again.
      if (skipCurrent && currentIndex < list.length - 1) {
        playTargetRef.current = currentIndex
        playStoppedRef.current = true
        advanceRef.current?.()
        return
      }
      playTargetRef.current = currentIndex
      playStoppedRef.current = true
      setPlayGame(list[currentIndex])
      setPreviewGame(list[currentIndex])
    } else {
      playTargetRef.current = null
      playStoppedRef.current = false
      advanceRef.current?.()
    }
  }, [setTime])

  const closePreview = useCallback(() => {
    setPreviewGame(null)
    if (playingRef.current) advanceRef.current?.()
  }, [])

  const continueFromPreview = useCallback(() => {
    setPreviewGame(null)
    if (!playingRef.current) {
      setPlaying(true)
      playingRef.current = true
    }
    advanceRef.current?.()
  }, [])

  const autoAdvance = useCallback(() => {
    if (!playingRef.current) return
    continueFromPreview()
  }, [continueFromPreview])

  const pauseForOrbit = useCallback(() => {
    if (!playingRef.current) return
    gsap.killTweensOf(playRef.current)
    clearTimeout(switchTimer.current)
    playingRef.current = false
    hopRef.current = null
    setPlaying(false)
  }, [])

  // The board is a snapshot of the current moment, so freeze autoplay while
  // it is open. The stop card stays behind the dialog and is ready to resume.
  const openMedals = useCallback(() => {
    pauseForOrbit()
    setMedalsOpen(true)
  }, [pauseForOrbit])

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
    clearTimeout(switchTimer.current)
  }, [])

  return (
    <div className={`scene era-${era.id}${active ? ' scene--active' : ''}${eraChapterOpen ? ' scene--era-chapter' : ''}${mapMode ? ' scene--map' : ''}`}>
      <div className="scene__canvas" onWheel={handleWheel}>
        <Canvas
          dpr={[1, 1.35]}
          camera={{ position: [0, 2.4, 5.6], fov: 45 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          <MemoScene
            cities={seasonGames}
            cancelledGames={cancelledSeasonGames}
            hovered={hovered}
            selected={selected}
            activeGame={activeGame}
            revealYear={revealYear}
            timelineTime={timelineTime}
            visitedIds={visited}
            onHover={handleHover}
            onSelect={handleSelect}
            labelRef={labelRef}
            mapMode={mapMode}
            morphing={morphing}
            morphRef={morphRef}
            timeRef={timeRef}
            eraId={era.id}
            playing={playing}
            seasonFilter={seasonFilter}
            followUntilRef={followUntilRef}
            previewOpen={previewOpen}
            onUserOrbit={pauseForOrbit}
            hopRef={hopRef}
            focusRelease={focusRelease}
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
        <h1 className="hud__title">ОЛИМПИЙСКИЕ ИГРЫ</h1>
        <div className="hud__subtitle">1896 — 2028 · одна точка — один город</div>
        <div className="hud__era">{era.label}</div>
        <div className="hud__medium">{era.medium}</div>
        <div className="hud__seasons" role="group" aria-label="Сезон">
          <button
            type="button"
            className={`hud__season${seasonFilter === 'all' ? ' hud__season--on' : ''}`}
            onClick={() => toggleSeason('all')}
            aria-pressed={seasonFilter === 'all'}
          >
            Все
          </button>
          <button
            type="button"
            className={`hud__season${seasonFilter === 'summer' ? ' hud__season--on' : ''}`}
            onClick={() => toggleSeason('summer')}
            aria-pressed={seasonFilter === 'summer'}
          >
            <i style={{ background: SEASON_COLOR.summer }} />Летние
          </button>
          <button
            type="button"
            className={`hud__season${seasonFilter === 'winter' ? ' hud__season--on' : ''}`}
            onClick={() => toggleSeason('winter')}
            aria-pressed={seasonFilter === 'winter'}
          >
            <i style={{ background: SEASON_COLOR.winter }} />Зимние
          </button>
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
            {hovered.cityCount > 1 && (
              <span className="tooltip__count">Игр в городе: {hovered.cityCount}</span>
            )}
            {hovered.cancelled && (
              <span className="tooltip__cancelled">Игры не состоялись</span>
            )}
          </>
        )}
      </div>

      <Timeline
        games={seasonGames}
        cancelledGames={cancelledSeasonGames}
        time={time}
        timeRef={timeRef}
        activeId={activeId}
        playing={playing}
        onChange={handleScrub}
        onCommit={handleCommit}
        onSelectGame={handleSelect}
        onTogglePlay={togglePlay}
      />

      <CancelledNotice time={time} games={cancelledSeasonGames} selected={selected} />

      <MedalRace
        games={seasonGames}
        time={time}
        season={seasonFilter}
        modalOpen={medalsOpen}
        onCloseModal={() => setMedalsOpen(false)}
      />

      <SoundToggle />

      <MascotButton onClick={() => setMascotsOpen(true)} count={mascotCount} />

      <MedalButton onClick={openMedals} />

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

      <GamesPreview
        game={previewGame}
        playing={playing}
        dwellMs={PREVIEW_DWELL}
        onReadMore={() => previewGame && handleSelect(previewGame, { skipOnPlay: true })}
        onContinue={continueFromPreview}
        onAutoAdvance={autoAdvance}
        onClose={closePreview}
      />

      <EventCard
        event={selected}
        historyGames={cardGames}
        onNavigate={handleSelect}
        onClose={() => setSelected(null)}
      />

      <MascotGallery
        open={mascotsOpen}
        onClose={() => setMascotsOpen(false)}
        onOpenGame={handleSelect}
      />
    </div>
  )
}
