// 모바일/터치용 방향 패드 + 보조 버튼(되돌리기/다시하기)
export default function Controls({ onMove, onUndo, onRestart, canUndo, disabled }) {
  return (
    <div className={`controls${disabled ? ' is-disabled' : ''}`}>
      <div className="dpad">
        <button className="dpad-btn up" onClick={() => onMove('up')} aria-label="위로">▲</button>
        <button className="dpad-btn left" onClick={() => onMove('left')} aria-label="왼쪽">◀</button>
        <button className="dpad-btn center" disabled aria-hidden="true"></button>
        <button className="dpad-btn right" onClick={() => onMove('right')} aria-label="오른쪽">▶</button>
        <button className="dpad-btn down" onClick={() => onMove('down')} aria-label="아래로">▼</button>
      </div>

      <div className="aux">
        <button className="aux-btn" onClick={onUndo} disabled={!canUndo}>
          ↶ 되돌리기
        </button>
        <button className="aux-btn" onClick={onRestart}>
          ⟳ 다시하기
        </button>
      </div>
    </div>
  )
}
