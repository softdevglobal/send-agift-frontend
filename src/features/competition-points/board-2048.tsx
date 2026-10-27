import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Flag } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { config2048, Game2048, type Direction } from './game-2048'

const TILE_TONE: Record<number, string> = {
  2: 'bg-amber-50 text-brand-ink',
  4: 'bg-amber-100 text-brand-ink',
  8: 'bg-amber-300 text-brand-ink',
  16: 'bg-orange-400 text-white',
  32: 'bg-orange-500 text-white',
  64: 'bg-red-500 text-white',
  128: 'bg-brand-teal text-brand-ink',
  256: 'bg-teal-500 text-white',
  512: 'bg-brand-violet text-white',
  1024: 'bg-violet-700 text-white',
  2048: 'bg-brand-ink text-white',
}

const KEYS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
}

/**
 * A playable 2048 board for one official attempt. It records every swipe;
 * when the game ends (or the player stops) the move log goes to the server,
 * which replays it from the same seed and decides the score.
 */
export function Board2048({
  seed,
  config,
  expiresAt,
  onFinish,
  disabled,
}: {
  seed: string
  config: Record<string, unknown>
  expiresAt: string
  onFinish: (moves: Direction[], score: number) => void
  disabled?: boolean
}) {
  const gameRef = useRef<Game2048 | null>(null)
  const movesRef = useRef<Direction[]>([])
  const finishedRef = useRef(false)
  const [board, setBoard] = useState<number[]>([])
  const [score, setScore] = useState(0)
  const [over, setOver] = useState(false)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const cfg = config2048(config)

  useEffect(() => {
    const g = new Game2048(seed, cfg)
    gameRef.current = g
    movesRef.current = []
    finishedRef.current = false
    setBoard([...g.board])
    setScore(0)
    setOver(!g.hasMoves())
    // A new seed is a new game; the config comes with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed])

  const finish = useCallback(() => {
    if (finishedRef.current || !gameRef.current) return
    finishedRef.current = true
    onFinish([...movesRef.current], gameRef.current.score)
  }, [onFinish])

  const play = useCallback(
    (dir: Direction) => {
      const g = gameRef.current
      if (!g || disabled || finishedRef.current || !g.hasMoves()) return
      if (movesRef.current.length >= cfg.max_moves) return
      const changed = g.move(dir)
      // A swipe that changes nothing is not sent: the server would count it
      // as a no-op, and the real board did not move.
      if (!changed) return
      movesRef.current.push(dir)
      setBoard([...g.board])
      setScore(g.score)
      if (!g.hasMoves()) setOver(true)
    },
    [cfg.max_moves, disabled],
  )

  // The game ends on its own when no move is left.
  useEffect(() => {
    if (over) finish()
  }, [over, finish])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const dir = KEYS[e.key]
      if (!dir) return
      e.preventDefault()
      play(dir)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [play])

  const size = cfg.board_size
  const expires = new Date(expiresAt)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] text-muted-foreground uppercase">Score</p>
          <p className="font-poster text-3xl" aria-live="polite">
            {score.toLocaleString()}
          </p>
        </div>
        <p className="text-right text-xs text-muted-foreground">
          {movesRef.current.length} moves · session ends {expires.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </p>
      </div>

      <div
        role="grid"
        aria-label="2048 board. Use the arrow keys or swipe to move the tiles."
        tabIndex={0}
        className="mx-auto grid max-w-sm touch-none gap-2 rounded-2xl bg-brand-ink/90 p-2 outline-none select-none focus-visible:ring-3 focus-visible:ring-brand-teal"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
        onTouchStart={(e) => {
          const t = e.touches[0]
          touch.current = { x: t.clientX, y: t.clientY }
        }}
        onTouchEnd={(e) => {
          const start = touch.current
          touch.current = null
          if (!start) return
          const t = e.changedTouches[0]
          const dx = t.clientX - start.x
          const dy = t.clientY - start.y
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return
          play(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up')
        }}
      >
        {board.map((v, i) => (
          <div
            key={i}
            role="gridcell"
            aria-label={v ? String(v) : 'empty'}
            className={cn(
              'flex aspect-square items-center justify-center rounded-xl font-poster text-2xl transition-colors sm:text-3xl',
              v ? (TILE_TONE[v] ?? 'bg-black text-white') : 'bg-white/10',
            )}
          >
            {v || ''}
          </div>
        ))}
      </div>

      <div className="mx-auto grid max-w-[11rem] grid-cols-3 gap-2 sm:hidden">
        <span />
        <Button variant="outline" aria-label="Up" onClick={() => play('up')}>
          <ArrowUp />
        </Button>
        <span />
        <Button variant="outline" aria-label="Left" onClick={() => play('left')}>
          <ArrowLeft />
        </Button>
        <Button variant="outline" aria-label="Down" onClick={() => play('down')}>
          <ArrowDown />
        </Button>
        <Button variant="outline" aria-label="Right" onClick={() => play('right')}>
          <ArrowRight />
        </Button>
      </div>

      <div className="flex justify-center">
        <Button
          variant="outline"
          className="h-10 px-4"
          disabled={disabled || finishedRef.current || movesRef.current.length === 0}
          onClick={finish}
        >
          <Flag className="size-4" />
          {over ? 'Submit my score' : 'Finish and submit'}
        </Button>
      </div>
    </div>
  )
}
