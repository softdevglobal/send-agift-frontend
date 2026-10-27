/**
 * 2048, exactly as the server replays it (internal/games/game2048.go and
 * prng.go in the backend). Same generator, same slide order, same merge
 * rule, same spawn order (cell drawn before value). If this file and the
 * server ever disagree, every honest score is rejected, so change them
 * together and only with a new game version.
 *
 * The server never trusts a score from here: the move log is sent and the
 * server computes the result by replaying it from the same seed.
 */

export type Direction = 'up' | 'down' | 'left' | 'right'

export type Config2048 = {
  board_size: number
  start_tiles: number
  spawn_four_percent: number
  win_tile: number
  max_moves: number
  min_ms_per_move: number
}

const defaults: Config2048 = {
  board_size: 4,
  start_tiles: 2,
  spawn_four_percent: 10,
  win_tile: 2048,
  max_moves: 5000,
  min_ms_per_move: 40,
}

/** Fills zero or missing values, as the server's withDefaults does. */
export function config2048(raw: Record<string, unknown> | undefined): Config2048 {
  const pick = (key: keyof Config2048) => {
    const v = Number(raw?.[key])
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : defaults[key]
  }
  return {
    board_size: pick('board_size'),
    start_tiles: pick('start_tiles'),
    spawn_four_percent: pick('spawn_four_percent'),
    win_tile: pick('win_tile'),
    max_moves: pick('max_moves'),
    min_ms_per_move: pick('min_ms_per_move'),
  }
}

/**
 * The 32-bit linear congruential generator both sides run (Numerical
 * Recipes constants). Math.imul keeps the multiplication in 32 bits; >>> 0
 * reads the result as unsigned, which is the same as Go's uint32 wrap.
 */
export class DeterministicRNG {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  next(): number {
    this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0
    return this.state
  }

  nextInt(n: number): number {
    if (n <= 0) return 0
    return this.next() % n
  }
}

export function parseSeed(seed: string): number {
  if (!/^[0-9a-fA-F]{1,8}$/.test(seed)) throw new Error(`invalid seed ${seed}`)
  return parseInt(seed, 16) >>> 0
}

function collapse(line: number[]): { out: number[]; gained: number } {
  const size = line.length
  const packed = line.filter((v) => v !== 0)
  const merged: number[] = []
  let gained = 0
  for (let i = 0; i < packed.length; i++) {
    if (i + 1 < packed.length && packed[i] === packed[i + 1]) {
      const sum = packed[i] * 2
      merged.push(sum)
      gained += sum
      i++
      continue
    }
    merged.push(packed[i])
  }
  while (merged.length < size) merged.push(0)
  return { out: merged, gained }
}

export class Game2048 {
  readonly cfg: Config2048
  private readonly rng: DeterministicRNG
  board: number[]
  score = 0

  constructor(seed: string, cfg: Config2048) {
    this.cfg = cfg
    this.rng = new DeterministicRNG(parseSeed(seed))
    this.board = new Array(cfg.board_size * cfg.board_size).fill(0)
    for (let i = 0; i < cfg.start_tiles; i++) this.spawn()
  }

  /** Cell first, then value: the order is part of the contract. */
  private spawn() {
    const empties: number[] = []
    this.board.forEach((v, i) => {
      if (v === 0) empties.push(i)
    })
    if (empties.length === 0) return
    const cell = empties[this.rng.nextInt(empties.length)]
    const value = this.rng.nextInt(100) < this.cfg.spawn_four_percent ? 4 : 2
    this.board[cell] = value
  }

  private line(dir: Direction, index: number): number[] {
    const size = this.cfg.board_size
    const out: number[] = []
    for (let i = 0; i < size; i++) {
      switch (dir) {
        case 'left':
          out.push(this.board[index * size + i])
          break
        case 'right':
          out.push(this.board[index * size + (size - 1 - i)])
          break
        case 'up':
          out.push(this.board[i * size + index])
          break
        case 'down':
          out.push(this.board[(size - 1 - i) * size + index])
          break
      }
    }
    return out
  }

  private writeLine(dir: Direction, index: number, values: number[]) {
    const size = this.cfg.board_size
    for (let i = 0; i < size; i++) {
      switch (dir) {
        case 'left':
          this.board[index * size + i] = values[i]
          break
        case 'right':
          this.board[index * size + (size - 1 - i)] = values[i]
          break
        case 'up':
          this.board[i * size + index] = values[i]
          break
        case 'down':
          this.board[(size - 1 - i) * size + index] = values[i]
          break
      }
    }
  }

  /** One swipe. A tile spawns only when something moved. */
  move(dir: Direction): boolean {
    let changed = false
    for (let i = 0; i < this.cfg.board_size; i++) {
      const before = this.line(dir, i)
      const { out, gained } = collapse(before)
      this.score += gained
      if (!changed && before.some((v, j) => v !== out[j])) changed = true
      this.writeLine(dir, i, out)
    }
    if (changed) this.spawn()
    return changed
  }

  hasMoves(): boolean {
    const size = this.cfg.board_size
    for (let i = 0; i < this.board.length; i++) {
      const v = this.board[i]
      if (v === 0) return true
      const row = Math.floor(i / size)
      const col = i % size
      if (col + 1 < size && this.board[i + 1] === v) return true
      if (row + 1 < size && this.board[i + size] === v) return true
    }
    return false
  }

  highestTile(): number {
    return Math.max(0, ...this.board)
  }
}
