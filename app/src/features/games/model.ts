export type Mark = 'X' | 'O';
export type TruthPhase = 'waiting' | 'draw' | 'choose' | 'compose' | 'answer' | 'ended';
export interface TruthState {
  phase: TruthPhase;
  round: number;
  players?: Record<string, { name: string }>;
  draws?: Record<string, number>;
  chooser: string;
  responder: string;
  mode: '' | 'truth' | 'dare';
  prompt: string;
  answer: string;
  completed: boolean;
  endRequest?: { by: string; at: number } | null;
  note: string;
  updatedAt: number;
}
export interface XOState {
  roles?: Partial<Record<Mark, string>>;
  board?: Record<string, Mark>;
  status: 'waiting' | 'playing' | 'roundOver' | 'matchOver';
  turn: Mark;
  score: Record<Mark, number>;
  round: number;
  matchId: string;
  winner: '' | Mark | 'draw';
  championUid: string;
  winCells?: number[] | Record<string, number>;
  updatedAt: number;
}

export const BOARD_SIDE = 15;
export const MATCH_WINS = 6;

export function makeTruth(): TruthState {
  return { phase: 'waiting', round: 1, players: {}, draws: {}, chooser: '', responder: '', mode: '', prompt: '', answer: '', completed: false, endRequest: null, note: '', updatedAt: Date.now() };
}

export function makeXO(): XOState {
  const matchId = crypto.randomUUID().replace(/-/g, '').slice(0, 20);
  return { roles: {}, board: {}, status: 'waiting', turn: 'X', score: { X: 0, O: 0 }, round: 1, matchId, winner: '', championUid: '', winCells: [], updatedAt: Date.now() };
}

export function findFive(board: Record<string, Mark>, index: number, mark: Mark): number[] | null {
  const row = Math.floor(index / BOARD_SIDE), column = index % BOARD_SIDE;
  for (const [dr, dc] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
    const sequence = [index];
    for (const direction of [-1, 1]) {
      for (let step = 1; step < 5; step++) {
        const nextRow = row + dr * step * direction, nextColumn = column + dc * step * direction;
        if (nextRow < 0 || nextRow >= BOARD_SIDE || nextColumn < 0 || nextColumn >= BOARD_SIDE) break;
        const cell = nextRow * BOARD_SIDE + nextColumn;
        if (board[String(cell)] !== mark) break;
        sequence.push(cell);
      }
    }
    if (sequence.length >= 5) return sequence;
  }
  return null;
}

export function randomCard(): number {
  const value = new Uint32Array(1);
  // Rejection sampling keeps each of the thirteen cards equally likely.
  do { crypto.getRandomValues(value); } while (value[0] >= 4294967287);
  return 1 + value[0] % 13;
}

export const DARE_SUGGESTIONS = [
  'Khen người ấy ba điều khiến bạn thấy ấm lòng.',
  'Hát một đoạn bài hát gắn với kỷ niệm của hai bạn.',
  'Viết một lời chúc ngủ ngon chỉ dành cho người ấy.',
  'Kể lại buổi hẹn đầu bằng ba câu thật ngắn.',
  'Tạo một biệt danh dễ thương cho nhau trong tối nay.',
  'Miêu tả buổi hẹn dưới ánh trăng mà bạn muốn cùng trải qua.',
];
