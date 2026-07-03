import { useReducer, useEffect, useRef, useCallback } from 'react'
import { LEVELS } from './levels.js'
import { parseLevel, tryMove, maybeDropApple, isWin } from './sokoban.js'
import { loadApples, saveApples } from './supabase.js'
import Board from './components/Board.jsx'
import Controls from './components/Controls.jsx'

const KEY_TO_DIR = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right',
  W: 'up', S: 'down', A: 'left', D: 'right',
}

function loadLevel(index) {
  return { game: parseLevel(LEVELS[index]), levelIndex: index, history: [], moves: 0 }
}

const initialState = {
  screen: 'start', // 'start' | 'play' | 'clear' | 'allclear'
  levelIndex: 0,
  game: null,
  history: [],
  moves: 0,
  totalApples: 0, // 지금까지 주운 사과 누적 총합(Supabase에 저장/조회, 단계·새로고침 무관)
}

function reducer(state, action) {
  switch (action.type) {
    case 'START':
      return { ...state, screen: 'play', ...loadLevel(0) }
    case 'SELECT':
      return { ...state, screen: 'play', ...loadLevel(action.index) }
    case 'HOME':
      return { ...state, screen: 'start' }
    case 'RESTART':
      return { ...state, screen: 'play', ...loadLevel(state.levelIndex) }
    case 'HYDRATE_APPLES':
      // Supabase에서 불러온 사과 총합으로 초기화
      return { ...state, totalApples: action.count }
    case 'UNDO': {
      if (!state.history.length) return state
      const history = state.history.slice(0, -1)
      const prev = state.history[state.history.length - 1]
      return {
        ...state,
        game: prev.game,
        totalApples: prev.totalApples,
        history,
        moves: Math.max(0, state.moves - 1),
      }
    }
    case 'NEXT': {
      const next = state.levelIndex + 1
      if (next >= LEVELS.length) return { ...state, screen: 'allclear' }
      return { ...state, screen: 'play', ...loadLevel(next) }
    }
    case 'MOVE': {
      if (state.screen !== 'play') return state
      const moved = tryMove(state.game, action.dir)
      if (!moved) return state
      // 이동에 성공했을 때만 10% 확률로 사과를 떨어뜨린다
      const next = maybeDropApple(moved)
      // 이번 이동에서 주운 사과 수(0 또는 1)를 누적 총합에 더한다
      const gained = next.applesCollected - state.game.applesCollected
      const won = isWin(next)
      const isLast = state.levelIndex + 1 >= LEVELS.length
      return {
        ...state,
        game: next,
        // undo가 사과 총합까지 되돌릴 수 있도록 이전 스냅샷을 함께 저장
        history: [...state.history, { game: state.game, totalApples: state.totalApples }],
        moves: state.moves + 1,
        totalApples: state.totalApples + gained,
        screen: won ? (isLast ? 'allclear' : 'clear') : 'play',
      }
    }
    default:
      return state
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { screen, levelIndex, game, moves, history, totalApples } = state

  const move = useCallback((dir) => dispatch({ type: 'MOVE', dir }), [])

  // 마운트 시 Supabase에서 저장된 사과 총합을 불러온다.
  const hydrated = useRef(false)
  useEffect(() => {
    loadApples().then((count) => {
      if (count != null) dispatch({ type: 'HYDRATE_APPLES', count })
      hydrated.current = true
    })
  }, [])

  // 사과 총합이 바뀔 때마다 Supabase에 저장한다(하이드레이션 완료 전에는 건너뜀).
  useEffect(() => {
    if (!hydrated.current) return
    saveApples(totalApples)
  }, [totalApples])

  // 키보드 입력
  useEffect(() => {
    function onKey(e) {
      if (screen !== 'play') return
      const dir = KEY_TO_DIR[e.key]
      if (dir) {
        e.preventDefault()
        move(dir)
        return
      }
      if (e.key === 'u' || e.key === 'U') dispatch({ type: 'UNDO' })
      if (e.key === 'r' || e.key === 'R') dispatch({ type: 'RESTART' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [screen, move])

  // 스와이프 입력
  const touchRef = useRef(null)
  const onTouchStart = (e) => {
    const t = e.changedTouches[0]
    touchRef.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e) => {
    if (!touchRef.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchRef.current.x
    const dy = t.clientY - touchRef.current.y
    const absX = Math.abs(dx)
    const absY = Math.abs(dy)
    const THRESHOLD = 24
    if (Math.max(absX, absY) < THRESHOLD) return
    if (absX > absY) move(dx > 0 ? 'right' : 'left')
    else move(dy > 0 ? 'down' : 'up')
    touchRef.current = null
  }

  if (screen === 'start') {
    return <StartScreen onStart={() => dispatch({ type: 'START' })}
                        onSelect={(i) => dispatch({ type: 'SELECT', index: i })} />
  }

  const isOverlay = screen === 'clear' || screen === 'allclear'

  return (
    <div className="app">
      <header className="hud">
        <button className="hud-menu" onClick={() => dispatch({ type: 'HOME' })} aria-label="메뉴로 나가기">←</button>

        <div className="hud-progress">
          <div className="hud-course" style={{ '--total': LEVELS.length }} aria-hidden="true">
            {LEVELS.map((_, i) => (
              <span
                key={i}
                className={`hud-brick${i <= levelIndex ? ' is-laid' : ''}${i === levelIndex ? ' is-current' : ''}`}
              />
            ))}
          </div>
          <div className="hud-caption">
            <b>{levelIndex + 1}</b>/ {LEVELS.length} 단계 · 벽돌집 짓는 중
          </div>
        </div>

        <div className="hud-stats">
          <div className="hud-tile" aria-label={`이동 ${moves}회`}>
            <span className="hud-tile-ico" aria-hidden="true">👣</span>
            <b>{moves}</b>
          </div>
          <div className="hud-tile hud-tile--apple" aria-label={`주운 사과 ${totalApples}개`}>
            <span className="hud-tile-ico" aria-hidden="true">🍎</span>
            <b key={totalApples} className="hud-apple-count">{totalApples}</b>
          </div>
        </div>
      </header>

      <main
        className="play-area"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <Board game={game} />
        {isOverlay && (
          <ClearOverlay
            allClear={screen === 'allclear'}
            level={levelIndex + 1}
            moves={moves}
            onNext={() => dispatch({ type: 'NEXT' })}
            onReplay={() => dispatch({ type: 'RESTART' })}
            onHome={() => dispatch({ type: 'HOME' })}
          />
        )}
      </main>

      <Controls
        onMove={move}
        onUndo={() => dispatch({ type: 'UNDO' })}
        onRestart={() => dispatch({ type: 'RESTART' })}
        canUndo={history.length > 0}
        disabled={isOverlay}
      />
    </div>
  )
}

function StartScreen({ onStart, onSelect }) {
  return (
    <div className="start">
      <div className="start-card">
        <div className="logo">📦</div>
        <h1>소코반</h1>
        <p className="subtitle">벽돌집 퍼즐 · 상자를 모두 목표 지점에 올려보세요</p>
        <button className="primary-btn" onClick={onStart}>게임 시작</button>

        <div className="level-grid">
          {LEVELS.map((_, i) => (
            <button key={i} className="level-chip" onClick={() => onSelect(i)}>
              {i + 1}
            </button>
          ))}
        </div>
        <p className="hint">방향키 / WASD · 스와이프 · U 되돌리기 · R 다시하기</p>
      </div>
    </div>
  )
}

function ClearOverlay({ allClear, level, moves, onNext, onReplay, onHome }) {
  return (
    <div className="overlay">
      <div className="overlay-card">
        {allClear ? (
          <>
            <div className="overlay-emoji">🏆</div>
            <h2>전체 클리어!</h2>
            <p>10단계를 모두 완료했어요. 멋져요!</p>
            <button className="primary-btn" onClick={onHome}>처음으로</button>
          </>
        ) : (
          <>
            <div className="overlay-emoji">🎉</div>
            <h2>{level}단계 클리어!</h2>
            <p>이동 {moves}회로 완료했어요.</p>
            <div className="overlay-actions">
              <button className="ghost-btn" onClick={onReplay}>다시하기</button>
              <button className="primary-btn" onClick={onNext}>다음 단계 →</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
