import { useEffect, useRef, useState } from 'react';
import { AnimatedLink as Link } from '../components/AnimatedLink';
import { Button, EmptyState, Icon, Badge } from '../components/ui';


type MiniGame = 'horse' | 'caro';
type PlayMode = 'local' | 'computer';
const CARO_SIDE = 10;
const CARO_CELLS = Array.from({ length: CARO_SIDE * CARO_SIDE }, (_, index) => index);

type CaroMark = 'X' | 'O';
function caroWinner(board: Record<number, CaroMark>, index: number, mark: CaroMark) {
  const row = Math.floor(index / CARO_SIDE), column = index % CARO_SIDE;
  return [[1, 0], [0, 1], [1, 1], [1, -1]].some(([dr, dc]) => {
    let count = 1;
    for (const direction of [-1, 1]) {
      for (let step = 1; step < 5; step++) {
        const nextRow = row + dr * step * direction, nextColumn = column + dc * step * direction;
        if (nextRow < 0 || nextRow >= CARO_SIDE || nextColumn < 0 || nextColumn >= CARO_SIDE) break;
        if (board[nextRow * CARO_SIDE + nextColumn] !== mark) break;
        count++;
      }
    }
    return count >= 5;
  });
}

function MiniGames() {
  const [game, setGame] = useState<MiniGame>('horse');
  const [playMode, setPlayMode] = useState<PlayMode>('computer');
  const [positions, setPositions] = useState([0, 0]);
  const [turn, setTurn] = useState(0);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [caroBoard, setCaroBoard] = useState<Record<number, CaroMark>>({});
  const [caroTurn, setCaroTurn] = useState<CaroMark>('X');
  const [caroStatus, setCaroStatus] = useState('X đi trước');
  const aiTimer = useRef<number | null>(null);

  useEffect(() => () => { if (aiTimer.current !== null) window.clearTimeout(aiTimer.current); }, []);

  function rollHorse() {
    if (positions.some(position => position >= 20) || (playMode === 'computer' && turn === 1)) return;
    const roll = 1 + Math.floor(Math.random() * 6);
    const nextPosition = Math.min(20, positions[turn] + roll);
    setPositions(current => current.map((position, index) => index === turn ? nextPosition : position));
    setLastRoll(roll);
    if (playMode === 'computer' && turn === 0 && nextPosition < 20) {
      setTurn(1);
      aiTimer.current = window.setTimeout(() => {
        const computerRoll = 1 + Math.floor(Math.random() * 6);
        setPositions(current => current.map((position, index) => index === 1 ? Math.min(20, position + computerRoll) : position));
        setLastRoll(computerRoll);
        setTurn(0);
      }, 450);
    } else setTurn(current => current === 0 ? 1 : 0);
  }

  function resetHorse() { if (aiTimer.current !== null) window.clearTimeout(aiTimer.current); setPositions([0, 0]); setTurn(0); setLastRoll(null); }

  function playCaro(index: number) {
    if (caroBoard[index] || caroStatus.includes('thắng') || caroStatus.includes('hoà') || (playMode === 'computer' && caroTurn === 'O')) return;
    const nextBoard = { ...caroBoard, [index]: caroTurn };
    const hasWinner = caroWinner(nextBoard, index, caroTurn);
    setCaroBoard(nextBoard);
    if (hasWinner) setCaroStatus(`${caroTurn} thắng rồi!`);
    else if (Object.keys(nextBoard).length === CARO_CELLS.length) setCaroStatus('Ván hoà!');
    else if (playMode === 'computer') {
      setCaroTurn('O');
      setCaroStatus('Máy đang nghĩ…');
      aiTimer.current = window.setTimeout(() => {
        const freeCells = CARO_CELLS.filter(cell => !nextBoard[cell]);
        const computerIndex = freeCells[Math.floor(Math.random() * freeCells.length)];
        const computerBoard = { ...nextBoard, [computerIndex]: 'O' as CaroMark };
        setCaroBoard(computerBoard);
        if (caroWinner(computerBoard, computerIndex, 'O')) { setCaroStatus('Máy thắng rồi!'); return; }
        if (Object.keys(computerBoard).length === CARO_CELLS.length) { setCaroStatus('Ván hoà!'); return; }
        setCaroTurn('X');
        setCaroStatus('Đến lượt bạn');
      }, 450);
    } else { const nextTurn = caroTurn === 'X' ? 'O' : 'X'; setCaroTurn(nextTurn); setCaroStatus(`${nextTurn} đi nào`); }
  }

  function resetCaro() { if (aiTimer.current !== null) window.clearTimeout(aiTimer.current); setCaroBoard({}); setCaroTurn('X'); setCaroStatus('X đi trước'); }

  const horseWinner = positions[0] >= 20 ? 'Ngựa tím thắng!' : positions[1] >= 20 ? playMode === 'computer' ? 'Máy thắng rồi!' : 'Ngựa vàng thắng!' : '';
  return <section className="surface mini-games" aria-labelledby="mini-games-title">
    <div className="feature-icon gold"><Icon name="game" size={25}/></div>
    <div className="mini-game-heading"><h2 className="section-title" id="mini-games-title">Mini game dưới trăng</h2><Badge tone="warning">DEMO</Badge></div>
    <p className="text-muted">Bản demo chơi nhanh ngay trên thiết bị. Chưa đồng bộ giữa nhiều người.</p>
    <div className="play-mode-tabs" role="group" aria-label="Chọn đối thủ">
      <button type="button" className={playMode === 'computer' ? 'active' : ''} onClick={() => { setPlayMode('computer'); resetHorse(); resetCaro(); }}>Chơi với máy</button>
      <button type="button" className={playMode === 'local' ? 'active' : ''} onClick={() => { setPlayMode('local'); resetHorse(); resetCaro(); }}>Hai người cùng máy</button>
    </div>
    <div className="mini-game-tabs" role="tablist" aria-label="Chọn mini game">
      <button type="button" role="tab" aria-selected={game === 'horse'} className={game === 'horse' ? 'active' : ''} onClick={() => setGame('horse')}><span aria-hidden="true">♞</span> Cờ cá ngựa</button>
      <button type="button" role="tab" aria-selected={game === 'caro'} className={game === 'caro' ? 'active' : ''} onClick={() => setGame('caro')}><span aria-hidden="true">✦</span> Cờ caro</button>
    </div>
    {game === 'horse' ? <div className="mini-game-panel" role="tabpanel">
      <div className="race-track" aria-label="Bàn đua cá ngựa">
        {[0, 1].map(index => <div className="race-lane" key={index}><span className="race-label">{index === 0 ? 'Ngựa tím' : playMode === 'computer' ? 'Máy' : 'Ngựa vàng'}</span><div className="race-line"><span className={`race-piece race-piece-${index}`} style={{ left: `${positions[index] / 20 * 100}%` }}>♞</span></div><span className="race-score">{positions[index]}/20</span></div>)}
      </div>
      <p className="game-status" role="status">{horseWinner || `Lượt của ${turn === 0 ? 'ngựa tím' : 'ngựa vàng'}${lastRoll ? ` · Đổ được ${lastRoll} ô` : ''}`}</p>
      <div className="actions"><Button onClick={rollHorse} disabled={!!horseWinner}>Đổ xúc xắc <Icon name="sparkles" size={17}/></Button><Button variant="secondary" onClick={resetHorse}>Chơi lại</Button></div>
    </div> : <div className="mini-game-panel" role="tabpanel">
      <p className="game-status" role="status">{caroStatus}</p>
      <div className="caro-board" role="grid" aria-label="Bàn cờ caro 10 x 10">{CARO_CELLS.map(index => <button type="button" role="gridcell" className={`caro-cell ${caroBoard[index] ? `mark-${caroBoard[index].toLowerCase()}` : ''}`} key={index} onClick={() => playCaro(index)} disabled={!!caroBoard[index] || caroStatus.includes('thắng') || caroStatus.includes('hoà')} aria-label={caroBoard[index] ? `Ô ${index + 1}: ${caroBoard[index]}` : `Ô ${index + 1}`}>{caroBoard[index] || ''}</button>)}</div>
      <div className="actions"><Button variant="secondary" onClick={resetCaro}>Ván mới</Button></div>
    </div>}
  </section>;
}

function safeUrl(url: string) { try { const u = new URL(url, location.href); return ['https:', 'http:'].includes(u.protocol) ? u.href : null; } catch { return null; } }

export default function LittleThings() {
  const site = window.APP_CONFIG?.site;
  return <div className="page-stack">
    <MiniGames />
    <section className="surface multiplayer-callout" aria-labelledby="multiplayer-title"><div className="multiplayer-callout-heading"><div><Badge tone="success">PWA · NHIỀU NGƯỜI</Badge><h2 className="section-title" id="multiplayer-title">Chơi thật cùng người ấy</h2></div><Icon name="users" size={25}/></div><p className="text-muted">Tạo một phòng riêng, nhận mã mời rồi gửi cho người ấy. Cả hai cùng vào PWA để chơi Thật hay Thách hoặc XO và đồng bộ lượt theo thời gian thực.</p><Link to="/room" className="button button-secondary">Tạo phòng riêng <Icon name="arrowRight" size={17}/></Link></section>
    {!!site?.MINIGAMES?.length && <section><h2 className="section-title">Thêm trò để chơi</h2><div className="section-grid">{site.MINIGAMES.map(g => { const url = safeUrl(g.url); return url ? <a className="surface feature-card" key={g.name} href={url} target="_blank" rel="noopener noreferrer"><Icon name="game" size={25}/><h3>{g.name}</h3><p>{g.description}</p><span className="feature-link">Mở trò chơi<Icon name="arrowRight" size={16}/></span></a> : null; })}</div></section>}
    {(Object.values(site?.CONTACTS || {}).some(Boolean) || site?.DONATE_QR_IMAGE) && <section className="surface"><h2 className="section-title">Gửi một chút thương</h2><div className="actions">{Object.entries(site?.CONTACTS || {}).map(([name, link]) => { const url = link && safeUrl(link); return url ? <a className="button button-secondary" href={url} target="_blank" rel="noopener noreferrer" key={name}>{name}<Icon name="link" size={16}/></a> : null; })}</div>{site?.DONATE_QR_IMAGE && safeUrl(site.DONATE_QR_IMAGE) && <img className="donate-qr" src={site.DONATE_QR_IMAGE} alt="Mã QR ủng hộ website"/>}</section>}
    <div className="surface"><EmptyState icon="game" title="Những trò vui nhất cần hai người" description="Thật hay Thách và XO đang chờ trong căn phòng riêng của hai bạn."/></div>
  </div>;
}
