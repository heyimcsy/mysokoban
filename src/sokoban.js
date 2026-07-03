// 소코반 핵심 게임 로직 (순수 함수)
//
// 정적 셀(static)과 동적 엔티티(player/box)를 분리한다.
//  - grid: 'wall' | 'floor' | 'target' (벽/바닥/목표는 절대 움직이지 않음)
//  - player: { x, y }
//  - boxes:  [{ id, x, y }] (id는 부드러운 애니메이션을 위해 이동 중에도 유지)

export const CELL = {
  WALL: 'wall',
  FLOOR: 'floor',
  TARGET: 'target',
}

export const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

// 이동할 때마다 사과가 바닥에 떨어질 확률(10%)
export const APPLE_DROP_CHANCE = 0.1

// 맵 문자열 배열 -> 게임 상태
export function parseLevel(rows) {
  const cols = rows.reduce((m, r) => Math.max(m, r.length), 0)
  const grid = []
  const boxes = []
  let player = { x: 0, y: 0 }
  let boxId = 0

  for (let y = 0; y < rows.length; y++) {
    const gridRow = []
    for (let x = 0; x < cols; x++) {
      const c = rows[y][x] ?? ' '
      if (c === '#') gridRow.push(CELL.WALL)
      else if (c === '.' || c === '*' || c === '+') gridRow.push(CELL.TARGET)
      else gridRow.push(CELL.FLOOR)

      if (c === '$' || c === '*') boxes.push({ id: boxId++, x, y })
      if (c === '@' || c === '+') player = { x, y }
    }
    grid.push(gridRow)
  }

  // apples: 바닥에 떨어진 사과들 [{ id, x, y }] (box처럼 동적 엔티티, id로 애니메이션)
  // applesCollected: 이번 단계에서 주운 사과 개수
  // appleSeq: 떨어뜨릴 때마다 증가하는 사과 id 시퀀스(키 충돌 방지)
  return {
    grid,
    boxes,
    player,
    cols,
    rows: rows.length,
    apples: [],
    applesCollected: 0,
    appleSeq: 0,
  }
}

export function cellAt(grid, x, y) {
  if (y < 0 || y >= grid.length) return CELL.WALL
  if (x < 0 || x >= grid[y].length) return CELL.WALL
  return grid[y][x]
}

export function boxAt(boxes, x, y) {
  return boxes.find((b) => b.x === x && b.y === y)
}

export function appleAt(apples, x, y) {
  return apples.find((a) => a.x === x && a.y === y)
}

// 한 칸 이동 시도. 이동했으면 새 상태를 반환, 못 움직이면 null.
// 새로 들어선 칸에 사과가 있으면 자동으로 줍고 applesCollected를 +1 한다.
export function tryMove(state, dirName) {
  const dir = DIRS[dirName]
  if (!dir) return null

  const { grid, boxes, player, apples } = state
  const nx = player.x + dir.x
  const ny = player.y + dir.y

  // 벽이면 이동 불가
  if (cellAt(grid, nx, ny) === CELL.WALL) return null

  let newBoxes = boxes
  const box = boxAt(boxes, nx, ny)
  if (box) {
    // 상자 너머 칸
    const bx = nx + dir.x
    const by = ny + dir.y
    // 상자 뒤가 벽이거나 다른 상자면 밀 수 없음
    if (cellAt(grid, bx, by) === CELL.WALL) return null
    if (boxAt(boxes, bx, by)) return null

    newBoxes = boxes.map((b) =>
      b.id === box.id ? { ...b, x: bx, y: by } : b
    )
  }

  // 사과 줍기: 새 위치에 사과가 있으면 수거하고 개수 +1
  const picked = appleAt(apples, nx, ny)
  const newApples = picked ? apples.filter((a) => a.id !== picked.id) : apples

  return {
    ...state,
    boxes: newBoxes,
    player: { x: nx, y: ny },
    apples: newApples,
    applesCollected: state.applesCollected + (picked ? 1 : 0),
  }
}

// 이동 직후 호출. rng() < 10%면 빈 바닥 칸 하나에 사과를 떨어뜨린 새 상태를,
// 아니면 받은 상태를 그대로 돌려준다. rng를 주입받아 순수성을 유지한다.
export function maybeDropApple(state, rng = Math.random) {
  if (rng() >= APPLE_DROP_CHANCE) return state

  const { grid, boxes, player, apples } = state
  const candidates = []
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] !== CELL.FLOOR) continue // 벽/목표 칸 제외, 바닥만
      if (player.x === x && player.y === y) continue // 플레이어 발밑 제외
      if (boxAt(boxes, x, y)) continue
      if (appleAt(apples, x, y)) continue
      candidates.push({ x, y })
    }
  }
  if (!candidates.length) return state

  const spot = candidates[Math.floor(rng() * candidates.length)]
  const apple = { id: state.appleSeq, x: spot.x, y: spot.y }
  return {
    ...state,
    apples: [...apples, apple],
    appleSeq: state.appleSeq + 1,
  }
}

// 모든 상자가 목표 위에 있으면 승리
export function isWin(state) {
  return state.boxes.every(
    (b) => cellAt(state.grid, b.x, b.y) === CELL.TARGET
  )
}
