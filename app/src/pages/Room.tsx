import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createRoom, joinRoom, subscribeRoom, getOwnerPassword, getRoomMeta, subscribeOpenRooms, subscribeRoomPresence } from '../lib/firebase';
import type { Member, OpenRoom, RoomMeta } from '../types';
import { useApp, localKey } from '../state/AppContext';
import { AvatarView, Badge, Button, EmptyState, Icon, Modal, PageHeading } from '../components/ui';
import ChatPanel from '../features/chat/ChatPanel';
import CoupleGames from '../features/games/CoupleGames';

type Tab = 'chat' | 'games';

export default function Room() {
  const { profile, uid, room, ready, selectRoom, notify } = useApp();
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get('code')?.toUpperCase() || '');
  const [password, setPassword] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const createdPassword = useRef<{ code: string; password: string } | null>(null);
  const [members, setMembers] = useState<Record<string, Member>>({});
  const [present, setPresent] = useState<string[] | null>(null);
  const [presenceError, setPresenceError] = useState('');
  const [meta, setMeta] = useState<RoomMeta | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>('chat');
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [passwordEnabled, setPasswordEnabled] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [listed, setListed] = useState(true);
  const [openRooms, setOpenRooms] = useState<OpenRoom[]>([]);
  const [listError, setListError] = useState('');
  const [listLoading, setListLoading] = useState(false);
  const [selected, setSelected] = useState<OpenRoom | null>(null);
  const [selectedPassword, setSelectedPassword] = useState('');

  useEffect(() => {
    setMembers({}); setError('');
    setOwnerPassword(createdPassword.current && createdPassword.current.code === room?.code ? createdPassword.current.password : '');
    if (!room || !ready) return;
    try { const saved = localStorage.getItem(localKey(':password:' + room.code)); if (saved !== null) setOwnerPassword(saved); } catch { /* The password just created remains available in memory. */ }
    return subscribeRoom(room, { members: setMembers, messages: () => {}, error: setError });
  }, [room?.code, room?.kind, ready]);

  useEffect(() => {
    setMeta(null);
    if (!room || !ready) return;
    let active = true;
    void getRoomMeta(room).then(value => { if (active) setMeta(value); }).catch(() => {});
    if (room.kind === 'rooms') void getOwnerPassword(room.code).then(value => { if (active && value) setOwnerPassword(value); }).catch(() => {});
    return () => { active = false; };
  }, [room?.code, room?.kind, ready]);

  useEffect(() => {
    setOpenRooms([]); setListError(''); setListLoading(false);
    if (!ready || room) return;
    setListLoading(true);
    return subscribeOpenRooms(values => { setOpenRooms(values); setListLoading(false); }, message => { setListError(message); setListLoading(false); });
  }, [ready, room?.code, room?.kind]);

  useEffect(() => {
    setPresent(null); setPresenceError('');
    if (!room || !ready) return;
    return subscribeRoomPresence(room, uids => { setPresent(uids); setPresenceError(''); }, message => { setPresent(null); setPresenceError(message); });
  }, [room?.code, room?.kind, ready]);

  async function create(event: FormEvent) {
    event.preventDefault();
    if (!profile || !ready || busy) return;
    setBusy(true); setError('');
    try {
      const result = await createRoom(profile, { passwordless: !passwordEnabled, password: passwordEnabled ? newPassword : undefined, listed });
      createdPassword.current = result;
      try { localStorage.setItem(localKey(':password:' + result.code), result.password); } catch { /* The current page can still show the password. */ }
      setOwnerPassword(result.password); setNewPassword('');
      selectRoom({ code: result.code, kind: 'rooms' }); setTab('chat');
      notify('Căn phòng của hai người đã sẵn sàng.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Không tạo được phòng.'); }
    finally { setBusy(false); }
  }

  async function enter(roomCode: string, roomPassword: string) {
    if (!profile || !ready || busy) return;
    setBusy(true); setError('');
    try {
      const clean = roomCode.trim().toUpperCase();
      await joinRoom(clean, roomPassword.trim(), profile);
      selectRoom({ code: clean, kind: 'rooms' }); setTab('chat'); setPassword(''); setSelectedPassword(''); setSelected(null);
      notify('Đã mở cửa căn phòng.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Không vào được phòng.'); }
    finally { setBusy(false); }
  }

  function choose(item: OpenRoom) {
    setError(''); setSelectedPassword('');
    if (item.locked) setSelected(item);
    else void enter(item.code, '');
  }

  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); notify('Đã sao chép.'); }
    catch { notify('Trình duyệt chưa cho phép sao chép. Anh có thể chọn và chép nội dung hiển thị.'); }
  }

  const currentMembers = Object.entries(members).filter(([id]) => present?.includes(id));
  const isHost = meta?.hostUid === uid;
  const passwordless = meta?.passwordless === true;
  const invitation = room ? 'Mình hẹn nhau dưới trăng nhé.\n' + location.origin + '/room?code=' + room.code + '\nMã phòng: ' + room.code + (ownerPassword && !passwordless ? '\nMật khẩu: ' + ownerPassword : '') : '';

  return <div className="page-stack room-page">
    <PageHeading eyebrow={room ? 'CHỈ RIÊNG HAI NGƯỜI' : 'MỘT CÁNH CỬA, MỘT CÂU CHUYỆN'} title="Căn phòng dưới trăng" description={room ? 'Một nơi để kể chuyện, lắng nghe và cùng tạo những kỷ niệm.' : 'Mở một căn phòng của riêng bạn, hoặc ghé vào một lời hẹn đang chờ.'} action={room ? <Button variant="ghost" onClick={() => setConfirmLeave(true)}><Icon name="logout" size={17} />Rời phòng</Button> : undefined} />
    {!ready && <div className="notice" role="status"><Icon name="wifi" size={18} />Đang chờ kết nối để mở phòng trực tuyến.</div>}

    {!room ? <>
      <div className="split-grid room-entry-grid">
        <section className="surface room-create">
          <div className="room-entry-heading"><span className="connect-icon"><Icon name="moon" size={24} /></span><div><span className="eyebrow">BẮT ĐẦU MỘT LỜI HẸN</span><h2>Tạo phòng của bạn</h2></div></div>
          <form className="room-entry-form" onSubmit={event => void create(event)}>
            <label className="room-option">
              <span><strong>Bảo vệ bằng mật khẩu</strong><small>{passwordEnabled ? 'Chỉ người có mật khẩu mới vào được.' : 'Ai biết mã phòng đều có thể tham gia.'}</small></span>
              <input role="switch" aria-label="Bảo vệ bằng mật khẩu" type="checkbox" checked={passwordEnabled} onChange={event => setPasswordEnabled(event.target.checked)} disabled={busy} />
            </label>
            {passwordEnabled && <div className="field">
              <label className="field-label" htmlFor="new-room-password">Mật khẩu bạn đặt</label>
              <input id="new-room-password" className="input" type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} minLength={8} maxLength={64} autoComplete="new-password" aria-describedby="new-room-password-hint" placeholder="Đặt mật khẩu riêng…" disabled={busy} />
              <p id="new-room-password-hint" className="hint">8–64 ký tự. Để trống nếu muốn tạo mật khẩu tự động.</p>
            </div>}
            <label className="room-option">
              <span><strong>Hiện trong danh sách phòng</strong><small>{listed ? 'Mọi người sẽ thấy mã phòng, tên và ảnh đại diện của bạn.' : 'Chỉ những người bạn gửi mã mới biết phòng.'}</small></span>
              <input role="switch" aria-label="Hiện trong danh sách phòng" type="checkbox" checked={listed} onChange={event => setListed(event.target.checked)} disabled={busy} />
            </label>
            <Button type="submit" disabled={!ready || busy}><Icon name="plus" size={18} />{busy ? 'Đang mở cửa…' : 'Tạo phòng mới'}</Button>
          </form>
        </section>
        <section className="surface room-join">
          <div className="room-entry-heading"><span className="connect-icon"><Icon name="link" size={24} /></span><div><span className="eyebrow">ĐÃ CÓ LỜI HẸN?</span><h2>Vào phòng của người ấy</h2></div></div>
          <p className="text-muted">Nhập mã được gửi cho bạn. Phòng không khóa thì không cần mật khẩu.</p>
          <form className="room-entry-form" onSubmit={event => { event.preventDefault(); void enter(code, password); }}>
            <div className="field"><label className="field-label" htmlFor="room-code">Mã phòng</label><input id="room-code" className="input code-input" value={code} onChange={event => setCode(event.target.value.toUpperCase())} minLength={8} maxLength={8} required autoComplete="off" placeholder="8 ký tự" disabled={busy} /></div>
            <div className="field"><label className="field-label" htmlFor="room-password">Mật khẩu phòng</label><input id="room-password" className="input" type="password" value={password} onChange={event => setPassword(event.target.value)} maxLength={64} autoComplete="off" placeholder="Để trống nếu phòng không khóa" disabled={busy} /></div>
            <Button type="submit" variant="secondary" disabled={!ready || busy}>Mở cửa căn phòng<Icon name="arrowRight" size={18} /></Button>
          </form>
        </section>
      </div>
      <section className="surface room-lobby" aria-labelledby="open-rooms-title">
        <div className="room-lobby-heading"><div><span className="eyebrow">DƯỚI CÙNG MỘT VẦNG TRĂNG</span><h2 id="open-rooms-title">Những căn phòng đang mở</h2></div>{ready && !listLoading && !listError && <Badge tone="success">{openRooms.length} phòng</Badge>}</div>
        <p className="hint">Chủ phòng đang trực tuyến và chọn hiển thị tại đây. Phòng có khóa vẫn cần mật khẩu để vào.</p>
        {listError ? <p className="error-text" role="alert">Chưa tải được danh sách phòng. {listError}</p> : !ready ? <p className="hint" role="status">Danh sách sẽ hiện khi kết nối được khôi phục.</p> : listLoading ? <p className="hint" role="status">Đang tìm những căn phòng dưới trăng…</p> : !openRooms.length ? <EmptyState icon="moon" title="Chưa có căn phòng nào đang mở" description="Bạn có thể mở phòng và bật hiển thị để mọi người ghé qua." /> : <ul className="open-room-list">
          {openRooms.map(item => <li className="open-room-card" key={item.hostUid}>
            <AvatarView avatar={item.avatar} name={item.hostName} size="md" />
            <div className="open-room-info"><h3>Phòng của {item.hostName}</h3><span className="open-room-code">{item.code}</span></div>
            <Badge tone={item.locked ? 'default' : 'success'}><Icon name={item.locked ? 'shield' : 'users'} size={14} />{item.locked ? 'Có mật khẩu' : 'Không mật khẩu'}</Badge>
            <Button variant="secondary" disabled={!ready || busy} onClick={() => choose(item)} aria-label={'Vào phòng của ' + item.hostName}>Vào phòng<Icon name="arrowRight" size={16} /></Button>
          </li>)}
        </ul>}
      </section>
    </> : <>
      <section className="surface room-summary">
        <div><span className="eyebrow">{room.kind === 'selectedRooms' ? 'KẾT NỐI CỦA HAI BẠN' : 'PHÒNG RIÊNG'}</span><div className="room-code">{room.code}<Button variant="ghost" aria-label="Sao chép mã phòng" onClick={() => void copy(room.code)}><Icon name="copy" size={18} /></Button></div>{meta && room.kind === 'rooms' && <p className="hint">{passwordless ? 'Không cần mật khẩu để vào' : 'Được bảo vệ bằng mật khẩu'}{isHost && (meta.listed ? ' · Hiện khi bạn đang ở trong phòng' : ' · Không hiện trong danh sách')}</p>}</div>
        <div className="room-members" role="group" aria-label="Người đang trong phòng">{currentMembers.map(([id, m]) => <div key={id} className="room-member"><AvatarView avatar={m.avatar} name={m.name} size="sm" /><span>{m.name}</span></div>)}<Badge>{presenceError ? 'Chưa rõ hiện diện' : present === null ? 'Đang đồng bộ…' : currentMembers.length + ' người đang trong phòng'}</Badge></div>
        {isHost && room.kind === 'rooms' && <details className="room-password"><summary>{ownerPassword && !passwordless ? 'Xem mật khẩu & lời mời' : 'Chia sẻ lời mời'}</summary><div className="actions">{ownerPassword && !passwordless && <code>{ownerPassword}</code>}<Button variant="secondary" onClick={() => void copy(invitation)}>Chép lời mời<Icon name="copy" size={16} /></Button></div>{!ownerPassword && !passwordless && <p className="hint">Mật khẩu bạn đặt không thể xem lại nếu dữ liệu trên trình duyệt đã bị xóa.</p>}</details>}
      </section>
      <div className="tab-row" role="tablist" aria-label="Hoạt động trong phòng"><button role="tab" aria-selected={tab === 'chat'} className={'tab-button' + (tab === 'chat' ? ' active' : '')} onClick={() => setTab('chat')}><Icon name="chat" size={18} />Trò chuyện</button><button role="tab" aria-selected={tab === 'games'} className={'tab-button' + (tab === 'games' ? ' active' : '')} onClick={() => setTab('games')}><Icon name="game" size={18} />Chơi cùng nhau</button></div>
      {tab === 'chat' ? <div className="surface chat-layout"><ChatPanel room={room} /></div> : profile && <CoupleGames room={room} profile={profile} onError={notify} />}
    </>}
    {room && presenceError && <p role="alert" className="error-text">Chưa đồng bộ được người đang trong phòng. {presenceError}</p>}
    {error && !selected && <p role="alert" className="error-text">{error}</p>}
    {selected && <Modal title={'Vào phòng của ' + selected.hostName} onClose={() => { setSelected(null); setError(''); }}>
      <p>Phòng <strong>{selected.code}</strong> có mật khẩu. Nhập mật khẩu chủ phòng đã gửi cho bạn.</p>
      <form className="room-entry-form" onSubmit={event => { event.preventDefault(); void enter(selected.code, selectedPassword); }}>
        <div className="field"><label className="field-label" htmlFor="listed-room-password">Mật khẩu phòng</label><input id="listed-room-password" className="input" type="password" value={selectedPassword} onChange={event => setSelectedPassword(event.target.value)} required minLength={8} maxLength={64} autoComplete="off" disabled={busy} /></div>
        {error && <p className="error-text" role="alert">{error}</p>}
        <div className="actions"><Button variant="secondary" onClick={() => { setSelected(null); setError(''); }}>Để sau</Button><Button type="submit" disabled={!ready || busy}>{busy ? 'Đang mở cửa…' : 'Vào phòng'}</Button></div>
      </form>
    </Modal>}
    {confirmLeave && <Modal title="Rời căn phòng này?" onClose={() => setConfirmLeave(false)}><p className="text-muted">Tin nhắn vẫn ở lại. Bạn có thể quay lại bằng mã{passwordless ? ' phòng.' : ' và mật khẩu của phòng.'}{isHost && meta?.listed ? ' Phòng sẽ ẩn khỏi danh sách khi bạn rời đi.' : ''}</p><div className="actions"><Button variant="secondary" onClick={() => setConfirmLeave(false)}>Ở lại</Button><Button variant="danger" onClick={() => { selectRoom(null); setOwnerPassword(''); setConfirmLeave(false); }}>Rời phòng</Button></div></Modal>}
  </div>;
}
