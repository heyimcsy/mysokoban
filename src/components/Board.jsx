import { CELL, cellAt } from '../sokoban.js'

// 정적 격자는 CSS grid로 깔고, 플레이어/상자는 그 위에 절대 배치하여
// transform 트랜지션으로 부드럽게 이동시킨다.
export default function Board({ game }) {
  const { grid, boxes, player, apples, cols, rows } = game

  return (
    <div
      className="board"
      style={{ '--cols': cols, '--rows': rows }}
    >
      {/* 정적 레이어: 벽 / 바닥 / 목표 */}
      {grid.map((row, y) =>
        row.map((cell, x) => (
          <div
            key={`${x}-${y}`}
            className={
              cell === CELL.WALL ? 'cell wall'
                : cell === CELL.TARGET ? 'cell target'
                : 'cell floor'
            }
          />
        ))
      )}

      {/* 동적 레이어: 바닥에 떨어진 사과 (밟으면 자동 수거) */}
      {apples.map((a) => (
        <div
          key={a.id}
          className="entity apple"
          style={{ transform: `translate(calc(var(--cell) * ${a.x}), calc(var(--cell) * ${a.y}))` }}
        >
          <span className="skin" aria-hidden="true">🍎</span>
        </div>
      ))}

      {/* 동적 레이어: 상자 */}
      {boxes.map((b) => {
        const onTarget = cellAt(grid, b.x, b.y) === CELL.TARGET
        return (
          <div
            key={b.id}
            className={`entity box${onTarget ? ' on-target' : ''}`}
            style={{ transform: `translate(calc(var(--cell) * ${b.x}), calc(var(--cell) * ${b.y}))` }}
          >
            {/* key=좌표: 밀려서 위치가 바뀐 상자만 remount되어 밀기 애니메이션 재생 */}
            <span className="skin" key={`${b.x}-${b.y}`} />
          </div>
        )
      })}

      {/* 동적 레이어: 플레이어 */}
      <div
        className="entity player"
        style={{ transform: `translate(calc(var(--cell) * ${player.x}), calc(var(--cell) * ${player.y}))` }}
      >
        {/* key=좌표: 이동할 때마다 remount되어 걸음 통통 애니메이션 재생 */}
        <span className="skin" key={`${player.x}-${player.y}`} />
      </div>
    </div>
  )
}
