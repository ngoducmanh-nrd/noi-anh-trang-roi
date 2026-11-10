import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Profile, RoomRef } from '../../types';
import { claimVirtualReward, getUid, serverNow, subscribeGame, subscribeWallet, transactGame } from '../../lib/firebase';
import { Badge, Button, EmptyState, Icon } from '../../components/ui';
import { BOARD_SIDE, DARE_SUGGESTIONS, findFive, makeTruth, makeXO, MATCH_WINS, randomCard } from './model';
import type { Mark, TruthState, XOState } from './model';
import './games.css';

interface Props { room: RoomRef; profile: Profile; onError?: (message: string) => void }
const phaseNames: Record<TruthState['phase'], string> = { waiting: 'Chờ người ấy', draw: 'Cùng rút một lá bài', choose: 'Chọn Thật hay Thách', compose: 'Một điều muốn hỏi', answer: 'Lắng nghe câu trả lời', ended: 'Khép lại phiên chơi' };
const cardLabel = (value: number) => ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' })[value as 1 | 11 | 12 | 13] || String(value);

export default function CoupleGames({ room, profile, onError }: Props) {
  const [selected, setSelected] = useState<'truth' | 'xo'>('truth');
  const [truth, setTruth] = useState<TruthState | null>(null);
  const [xo, setXO] = useState<XOState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState('');
  const [confirmNext, setConfirmNext] = useState(false);
  const [walletTotal, setWalletTotal] = useState(0);
  const [rewardNote, setRewardNote] = useState('');
  const pendingRewards = useRef(new Set<string>()), receivedRewards = useRef(new Set<string>());
  const errorHandler = useRef(onError);
  errorHandler.current = onError;
  const truthRef = useRef<TruthState | null>(null), xoRef = useRef<XOState | null>(null);
  const uid = getUid() || '';
  const report = useCallback((message: string) => { setError(message); errorHandler.current?.(message); }, []);

  useEffect(() => subscribeWallet(wallet => setWalletTotal(wallet.total)), []);

  useEffect(() => {
    if (!xo || xo.status !== 'matchOver' || xo.championUid !== uid || pendingRewards.current.has(xo.matchId) || receivedRewards.current.has(xo.matchId)) return;
    const matchId = xo.matchId;
    pendingRewards.current.add(matchId);
    void claimVirtualReward(matchId).then(amount => {
      receivedRewards.current.add(matchId);
      setRewardNote(amount > 0 ? 'Bạn đã nhận thêm 5.000 xu ảo cho trận thắng.' : 'Trận thắng đã được ghi nhận. Xu thưởng đã nhận hoặc đạt giới hạn hôm nay.');
    }).catch(cause => report(cause instanceof Error ? cause.message : 'Chưa ghi nhận được xu ảo.')).finally(() => pendingRewards.current.delete(matchId));
  }, [xo, uid, report]);

  useEffect(() => {
    setTruth(null); setXO(null); truthRef.current = null; xoRef.current = null;
    setError(''); setPrompt(''); setAnswer(''); setConfirmNext(false); setRewardNote('');
    const stopTruth = subscribeGame(room, 'truth', value => { truthRef.current = value as TruthState | null; setTruth(value as TruthState | null); }, report);
    const stopXO = subscribeGame(room, 'xo', value => { xoRef.current = value as XOState | null; setXO(value as XOState | null); }, report);
    return () => { stopTruth(); stopXO(); };
  }, [room.code, room.kind, report]);

  useEffect(() => { setPrompt(''); setAnswer(''); setConfirmNext(false); }, [truth?.round, truth?.phase]);

  const transact = async <T extends TruthState | XOState>(game: 'truth' | 'xo', mutate: (current: T | null) => T | undefined) => {
    if (busy || !uid) return false;
    setBusy(true); setError('');
    try {
      // A transaction can start with null before the SDK has filled its local cache.
      const committed = await transactGame(room, game, value => {
        const known = value ?? (game === 'truth' ? truthRef.current : xoRef.current);
        return mutate(known ? structuredClone(known) as T : null);
      });
      if (!committed) setError('Trạng thái vừa thay đổi. Bạn xem lượt mới nhất rồi thử lại nhé.');
      return committed;
    } catch (cause) { report(cause instanceof Error ? cause.message : 'Chưa lưu được lượt chơi. Bạn thử lại nhé.'); return false; }
    finally { setBusy(false); }
  };

  const joinTruth = () => transact<TruthState>('truth', previous => {
    const current = previous || makeTruth();
    if (current.phase === 'ended') return;
    const players = current.players || {};
    if (!players[uid] && Object.keys(players).length >= 2) return;
    current.players = { ...players, [uid]: { name: profile.name.slice(0, 26) } };
    if (Object.keys(current.players).length === 2 && current.phase === 'waiting') current.phase = 'draw';
    current.updatedAt = serverNow(); return current;
  });

  const drawCard = () => {
    const card = randomCard();
    return transact<TruthState>('truth', current => {
      if (!current || current.phase !== 'draw' || !current.players?.[uid] || Object.keys(current.players).length !== 2 || current.draws?.[uid]) return;
      current.draws = { ...current.draws, [uid]: card };
      const [first, second] = Object.keys(current.players);
      if (current.draws[first] && current.draws[second]) {
        if (current.draws[first] === current.draws[second]) { current.draws = {}; current.note = 'Hai lá bài bằng nhau. Mình cùng rút lại nhé.'; }
        else { current.chooser = current.draws[first] > current.draws[second] ? first : second; current.responder = current.chooser === first ? second : first; current.phase = 'choose'; current.note = 'Người có lá bài cao hơn sẽ chọn trước.'; }
      }
      current.updatedAt = serverNow(); return current;
    });
  };

  const chooseMode = (mode: 'truth' | 'dare') => transact<TruthState>('truth', current => {
    if (!current || current.phase !== 'choose' || current.chooser !== uid || current.endRequest) return;
    current.mode = mode; current.phase = 'compose'; current.note = ''; current.updatedAt = serverNow(); return current;
  });

  const publishPrompt = (event: FormEvent) => {
    event.preventDefault(); const text = prompt.trim();
    if (text.length < 4 || text.length > 400) { setError('Nội dung cần từ 4 đến 400 ký tự.'); return; }
    void transact<TruthState>('truth', current => {
      if (!current || current.phase !== 'compose' || current.chooser !== uid || current.endRequest) return;
      current.prompt = text; current.answer = ''; current.completed = false; current.phase = 'answer'; current.updatedAt = serverNow(); return current;
    });
  };

  const submitAnswer = (event: FormEvent) => {
    event.preventDefault(); const text = answer.trim();
    if (truth?.mode === 'truth' && text.length < 2) { setError('Viết ít nhất hai ký tự cho câu trả lời nhé.'); return; }
    void transact<TruthState>('truth', current => {
      if (!current || current.phase !== 'answer' || current.responder !== uid || current.completed || current.endRequest) return;
      current.answer = (text || 'Đã hoàn thành thử thách').slice(0, 500); current.completed = true; current.updatedAt = serverNow(); return current;
    });
  };

  const nextTruthRound = () => {
    setConfirmNext(false);
    return transact<TruthState>('truth', current => {
      if (!current || !current.players?.[uid] || !['choose', 'compose', 'answer'].includes(current.phase) || current.endRequest || !current.chooser || !current.responder) return;
      [current.chooser, current.responder] = [current.responder, current.chooser];
      current.phase = 'choose'; current.round += 1; current.mode = ''; current.prompt = ''; current.answer = ''; current.completed = false;
      current.note = 'Đã đổi lượt. Một điều mới đang chờ được sẻ chia.'; current.updatedAt = serverNow(); return current;
    });
  };

  const requestEnd = () => transact<TruthState>('truth', current => {
    if (!current || !current.players?.[uid] || current.phase === 'ended' || current.endRequest) return;
    current.endRequest = { by: uid, at: serverNow() }; current.updatedAt = serverNow(); return current;
  });

  const respondEnd = (accept: boolean) => transact<TruthState>('truth', current => {
    if (!current || !current.players?.[uid] || !current.endRequest || current.endRequest.by === uid) return;
    if (accept) current.phase = 'ended';
    else current.note = 'Hai bạn đã chọn tiếp tục chơi.';
    current.endRequest = null; current.updatedAt = serverNow(); return current;
  });

  const restartTruth = () => transact<TruthState>('truth', current => {
    if (!current || current.phase !== 'ended' || !current.players?.[uid]) return;
    return { ...makeTruth(), players: current.players, phase: Object.keys(current.players).length === 2 ? 'draw' : 'waiting', updatedAt: serverNow() };
  });

  const chooseMark = (mark: Mark) => transact<XOState>('xo', previous => {
    const current = previous || makeXO(), roles = current.roles || {};
    if (roles[mark] && roles[mark] !== uid) return;
    if (Object.values(roles).includes(uid) && roles[mark] !== uid) return;
    current.roles = { ...roles, [mark]: uid };
    if (current.roles.X && current.roles.O && current.status === 'waiting') current.status = 'playing';
    current.updatedAt = serverNow(); return current;
  });

  const playCell = (index: number) => transact<XOState>('xo', current => {
    if (!current || current.status !== 'playing' || current.roles?.[current.turn] !== uid || current.board?.[String(index)] || index < 0 || index >= 225) return;
    const mark = current.turn, board = { ...current.board, [String(index)]: mark };
    current.board = board; const five = findFive(board, index, mark);
    if (five) {
      current.winCells = five; current.winner = mark; current.score = { ...current.score, [mark]: (current.score?.[mark] || 0) + 1 };
      current.status = current.score[mark] >= MATCH_WINS ? 'matchOver' : 'roundOver';
      if (current.status === 'matchOver') current.championUid = current.roles?.[mark] || '';
    } else if (Object.keys(board).length >= 225) { current.status = 'roundOver'; current.winner = 'draw'; current.winCells = []; }
    else current.turn = mark === 'X' ? 'O' : 'X';
    current.updatedAt = serverNow(); return current;
  });

  const nextXORound = () => transact<XOState>('xo', current => {
    if (!current || current.status !== 'roundOver' || !Object.values(current.roles || {}).includes(uid)) return;
    current.round += 1; current.board = {}; current.winCells = []; current.winner = ''; current.turn = current.round % 2 ? 'X' : 'O'; current.status = 'playing'; current.updatedAt = serverNow(); return current;
  });

  const newXOMatch = () => transact<XOState>('xo', current => {
    if (!current || current.status !== 'matchOver' || !Object.values(current.roles || {}).includes(uid)) return;
    return { ...makeXO(), roles: current.roles, status: 'playing', updatedAt: serverNow() };
  });

  const joined = !!truth?.players?.[uid], players = Object.entries(truth?.players || {}), chooser = truth?.chooser === uid;
  const nameOf = (id: string) => id === uid ? 'Bạn' : truth?.players?.[id]?.name || 'Người ấy';
  const myMark: Mark | '' = xo?.roles?.X === uid ? 'X' : xo?.roles?.O === uid ? 'O' : '';
  const wins = new Set(Object.values(xo?.winCells || {}));
  const canNext = joined && players.length === 2 && !!truth?.chooser && !!truth?.responder && ['choose', 'compose', 'answer'].includes(truth.phase) && !truth.endRequest;

  return <section className="couple-games" aria-label="Trò chơi của hai bạn">
    <div className="couple-games-heading"><div><span className="eyebrow">Một chút gần nhau hơn</span><h2>Chơi cùng người ấy</h2></div><Icon name="game" size={26} /></div>
    <div className="game-tabs" role="tablist" aria-label="Chọn trò chơi">
      <button id="truth-tab" role="tab" aria-controls="truth-panel" aria-selected={selected === 'truth'} onClick={() => setSelected('truth')}><Icon name="sparkles" /> Thật hay Thách</button>
      <button id="xo-tab" role="tab" aria-controls="xo-panel" aria-selected={selected === 'xo'} onClick={() => setSelected('xo')}><Icon name="game" /> Cờ XO</button>
    </div>
    {error && <p className="error-text game-error" role="alert">{error}</p>}
    {selected === 'truth' ? <div id="truth-panel" role="tabpanel" aria-labelledby="truth-tab" className="game-panel">
      <div className="game-status"><Badge>Phiên {truth?.round || 1}</Badge><span aria-live="polite">{truth ? phaseNames[truth.phase] : 'Một cuộc trò chuyện chưa bắt đầu'}</span></div>
      {!truth || !joined ? <EmptyState icon="moon" title={players.length >= 2 ? 'Bàn chơi đã có đủ hai người' : 'Để câu chuyện tự nhiên bắt đầu'} description="Mỗi người vào bàn và rút một lá bài. Người có bài cao hơn được chọn câu hỏi đầu tiên." action={players.length < 2 ? <Button disabled={busy} onClick={() => void joinTruth()}>Tham gia bàn chơi <Icon name="arrowRight" /></Button> : undefined} /> : <>
        <div className="truth-players">{players.map(([id, player]) => <div className="truth-player" key={id}><span className="truth-player-dot" /><span>{id === uid ? 'Bạn' : player.name}</span><small>{truth.draws?.[id] ? 'Đã rút bài' : truth.phase === 'draw' ? 'Chưa rút bài' : 'Đã vào bàn'}</small></div>)}</div>
        {truth.phase === 'waiting' && <p className="game-wait">Gửi người ấy lời nhắn để cùng vào bàn. Không cần vội.</p>}
        {truth.phase === 'draw' && <><div className="draw-cards">{players.map(([id]) => <div key={id} className={`draw-card${truth.draws?.[id] ? ' is-drawn' : ''}`}><Icon name="moon" size={36} /><strong>{truth.draws?.[id] ? 'Đã rút' : 'Chờ bạn'}</strong><span>{nameOf(id)}</span></div>)}</div><Button disabled={busy || !!truth.draws?.[uid]} onClick={() => void drawCard()}>{truth.draws?.[uid] ? 'Chờ lá bài của người ấy' : 'Rút lá bài của mình'}</Button></>}
        {truth.note && <p className="game-note">{truth.note}</p>}
        {truth.phase === 'choose' && <div className="truth-stage"><div className="card-results">{players.map(([id]) => truth.draws?.[id] ? <span key={id}>{nameOf(id)} · {cardLabel(truth.draws[id])}</span> : null)}</div><h3>{chooser ? `Bạn muốn hỏi ${nameOf(truth.responder)} điều gì?` : `Chờ ${nameOf(truth.chooser)} lựa chọn`}</h3>{chooser ? <div className="actions"><Button disabled={busy || !!truth.endRequest} onClick={() => void chooseMode('truth')}><Icon name="heart" /> Chọn Thật</Button><Button variant="secondary" disabled={busy || !!truth.endRequest} onClick={() => void chooseMode('dare')}><Icon name="sparkles" /> Chọn Thách</Button></div> : <p className="hint">Một câu hỏi chân thành hay một thử thách nhỏ đều có thể đưa hai bạn gần nhau hơn.</p>}</div>}
        {truth.phase === 'compose' && (chooser ? <form onSubmit={publishPrompt} className="game-form"><label className="field"><span className="field-label">{truth.mode === 'truth' ? 'Điều bạn muốn hỏi' : 'Thử thách dành cho người ấy'}</span><textarea className="textarea" rows={3} value={prompt} onChange={event => setPrompt(event.target.value)} minLength={4} maxLength={400} required placeholder={truth.mode === 'truth' ? 'Khi nào bạn thấy được yêu thương nhất?' : 'Một điều nhỏ, dễ thương và thoải mái cho cả hai…'} /></label><div className="actions">{truth.mode === 'dare' && <Button type="button" variant="ghost" onClick={() => setPrompt(DARE_SUGGESTIONS[randomCard() % DARE_SUGGESTIONS.length])}><Icon name="sparkles" /> Gợi ý thử thách</Button>}<Button type="submit" disabled={busy || !!truth.endRequest}>Gửi cho người ấy <Icon name="send" /></Button></div></form> : <p className="game-wait">Người ấy đang viết một điều dành riêng cho bạn.</p>)}
        {truth.phase === 'answer' && <div className="truth-stage"><span className="eyebrow">{truth.mode === 'truth' ? 'Một điều thật lòng' : 'Thử thách nhỏ'}</span><blockquote>{truth.prompt}</blockquote><p className="hint">{nameOf(truth.chooser)} gửi đến {nameOf(truth.responder)}</p>{truth.completed ? <div className="truth-answer"><Icon name="check" /><p>{truth.answer}</p></div> : truth.responder === uid ? <form onSubmit={submitAnswer} className="game-form"><label className="field"><span className="field-label">{truth.mode === 'truth' ? 'Câu trả lời của bạn' : 'Bạn đã thực hiện thế nào?'}</span><textarea className="textarea" rows={3} value={answer} onChange={event => setAnswer(event.target.value)} minLength={truth.mode === 'truth' ? 2 : undefined} maxLength={500} required={truth.mode === 'truth'} /></label><Button disabled={busy || !!truth.endRequest} type="submit">{truth.mode === 'truth' ? 'Gửi câu trả lời' : 'Đã hoàn thành'} <Icon name="check" /></Button></form> : <p className="game-wait">Chờ người ấy chia sẻ. Mình lắng nghe nhé.</p>}</div>}
        {truth.phase === 'ended' && <EmptyState icon="moon" title="Một phiên chơi, thêm một chút hiểu nhau" description="Hai bạn đã cùng đồng ý kết thúc. Khi muốn, mình có thể bắt đầu lại." action={<Button disabled={busy} onClick={() => void restartTruth()}>Bắt đầu phiên mới <Icon name="refresh" /></Button>} />}
        {truth.endRequest && truth.phase !== 'ended' && <div className="game-confirm" role="status"><p>{truth.endRequest.by === uid ? 'Đã gửi lời đề nghị kết thúc. Chờ người ấy đồng ý.' : 'Người ấy muốn kết thúc phiên chơi. Bạn đồng ý chứ?'}</p>{truth.endRequest.by !== uid && <div className="actions"><Button disabled={busy} onClick={() => void respondEnd(true)}>Đồng ý kết thúc</Button><Button variant="secondary" disabled={busy} onClick={() => void respondEnd(false)}>Mình chơi tiếp</Button></div>}</div>}
        {confirmNext && <div className="game-confirm"><p>Phiên này chưa hoàn thành. Chuyển lượt sẽ bỏ nội dung đang chơi. Bạn muốn tiếp tục chứ?</p><div className="actions"><Button disabled={busy} onClick={() => void nextTruthRound()}>Chuyển lượt</Button><Button variant="ghost" onClick={() => setConfirmNext(false)}>Ở lại phiên này</Button></div></div>}
        <div className="game-footer">{canNext && <Button disabled={busy} variant="secondary" onClick={() => truth.phase === 'answer' && truth.completed ? void nextTruthRound() : setConfirmNext(true)}>Đổi lượt cho nhau <Icon name="refresh" /></Button>}{truth.phase !== 'ended' && <Button variant="ghost" disabled={busy || !!truth.endRequest} onClick={() => void requestEnd()}>Đề nghị kết thúc</Button>}</div>
      </>}
    </div> : <div id="xo-panel" role="tabpanel" aria-labelledby="xo-tab" className="game-panel">
      <div className="game-status"><Badge>Ván {xo?.round || 1}</Badge><span aria-live="polite">{!xo || xo.status === 'waiting' ? 'Chọn quân để bắt đầu' : xo.status === 'playing' ? xo.roles?.[xo.turn] === uid ? `Lượt của bạn · ${xo.turn}` : `Lượt người ấy · ${xo.turn}` : xo.status === 'matchOver' ? xo.championUid === uid ? 'Bạn đã thắng trận này' : 'Người ấy đã thắng trận này' : xo.winner === 'draw' ? 'Một ván hòa thật cân sức' : `Quân ${xo.winner} thắng ván này`}</span></div>
      <div className="xo-score"><div><span className="xo-mark">X</span><span>{xo?.roles?.X === uid ? 'Bạn' : xo?.roles?.X ? 'Người ấy' : 'Chưa chọn'}</span><strong>{xo?.score?.X || 0}</strong></div><span className="xo-score-goal">CHẠM {MATCH_WINS}<small>ván thắng</small></span><div><span className="xo-mark is-o">O</span><span>{xo?.roles?.O === uid ? 'Bạn' : xo?.roles?.O ? 'Người ấy' : 'Chưa chọn'}</span><strong>{xo?.score?.O || 0}</strong></div></div>
      {(!xo || xo.status === 'waiting') && <div className="xo-start">{!myMark ? <div className="actions"><Button disabled={busy || !!xo?.roles?.X} onClick={() => void chooseMark('X')}>Tôi chọn X</Button><Button disabled={busy || !!xo?.roles?.O} variant="secondary" onClick={() => void chooseMark('O')}>Tôi chọn O</Button></div> : <p className="hint">Bạn đã chọn {myMark}. Chờ người ấy chọn quân còn lại.</p>}<p className="hint">Bàn cờ 15 × 15. Nối năm quân liên tiếp để thắng một ván.</p></div>}
      {xo && xo.status !== 'waiting' && <><div className="xo-scroll"><div className="xo-board" role="group" aria-label="Bàn cờ XO 15 hàng 15 cột">{Array.from({ length: BOARD_SIDE * BOARD_SIDE }, (_, index) => { const mark = xo.board?.[String(index)]; return <button key={index} type="button" className={`xo-cell${mark ? ` mark-${mark.toLowerCase()}` : ''}${wins.has(index) ? ' is-winning' : ''}`} aria-label={`Hàng ${Math.floor(index / 15) + 1}, cột ${index % 15 + 1}${mark ? `: ${mark}` : ': trống'}`} disabled={busy || xo.status !== 'playing' || xo.roles?.[xo.turn] !== uid || !!mark} onClick={() => void playCell(index)}>{mark && <span aria-hidden="true">{mark}</span>}</button>; })}</div></div>{(xo.status === 'roundOver' || xo.status === 'matchOver') && <div className="game-footer"><Button disabled={busy || !myMark} onClick={() => void (xo.status === 'matchOver' ? newXOMatch() : nextXORound())}>{xo.status === 'matchOver' ? 'Chơi một trận mới' : 'Sang ván tiếp theo'} <Icon name="arrowRight" /></Button></div>}</>}
      <div className="game-wallet"><Icon name="star" size={17} /><span>Xu ảo hôm nay <strong>{walletTotal.toLocaleString('vi-VN')}</strong><small>Thắng đủ sáu ván: +5.000 xu · tối đa 25.000 xu/ngày</small></span></div>
      {rewardNote && <p className="game-note" role="status">{rewardNote}</p>}
      <p className="game-fairplay"><Icon name="shield" size={15} /> Một trò chơi để vui cùng nhau. Điểm và xu trong game không có giá trị quy đổi.</p>
    </div>}
  </section>;
}
