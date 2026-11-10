import { useEffect, useRef, useState, type FormEvent } from 'react';
import './Support.css';
import { useParams } from 'react-router-dom';
import { AnimatedLink as Link } from '../components/AnimatedLink';
import { AvatarView, Badge, Button, EmptyState, Icon, PageHeading } from '../components/ui';
import { useApp } from '../state/AppContext';
import { sendSupportMessage, subscribeSupportAdmin, subscribeSupportInbox, subscribeSupportMessages, subscribeSupportThread } from '../lib/firebase';
import type { SupportCategory, SupportMessage, SupportThread } from '../types';

const topics: { value: SupportCategory; label: string; icon: string }[] = [
  { value: 'help', label: 'Cần hỗ trợ', icon: 'chat' },
  { value: 'bug', label: 'Báo lỗi', icon: 'shield' },
  { value: 'feature', label: 'Góp ý tính năng', icon: 'sparkles' },
];
const topicName = (category: SupportCategory) => topics.find(topic => topic.value === category)?.label || 'Cần hỗ trợ';
const date = (at: number) => new Date(at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

function useSupportRole() {
  const { ready, uid } = useApp();
  const [admin, setAdmin] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setAdmin(null); setError('');
    if (!ready || !uid) return;
    return subscribeSupportAdmin(setAdmin, message => { setAdmin(false); setError(message); });
  }, [ready, uid]);
  return { admin, error };
}

function Conversation({ userUid, admin = false, name = '', initialCategory = 'help' }: { userUid: string; admin?: boolean; name?: string; initialCategory?: SupportCategory }) {
  const { profile, ready, connection } = useApp();
  const available = ready && connection === 'online';
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [category, setCategory] = useState<SupportCategory>(initialCategory);
  const [busy, setBusy] = useState(false);
  const feed = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  useEffect(() => {
    setError(''); setLoading(ready);
    if (!ready) return;
    return subscribeSupportMessages(userUid, values => { setMessages(values); setLoading(false); }, message => { setError(message); setLoading(false); });
  }, [ready, userUid]);
  useEffect(() => {
    if (follow.current && feed.current) feed.current.scrollTop = feed.current.scrollHeight;
  }, [messages]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!profile || !available || busy || !text.trim()) return;
    setBusy(true); setError('');
    try {
      await sendSupportMessage(userUid, profile, text, category, admin);
      follow.current = true; setText('');
      if (feed.current) feed.current.scrollTop = feed.current.scrollHeight;
    } catch (e) { setError(e instanceof Error ? e.message : 'Chưa gửi được tin nhắn. Nội dung vẫn được giữ để bạn thử lại.'); }
    finally { setBusy(false); }
  }

  return <section className="support-conversation" aria-label={admin ? 'Trao đổi với ' + name : 'Chat hỗ trợ riêng'}>
    <header className="support-chat-heading"><span className="menu-icon"><Icon name={admin ? 'users' : 'chat'} size={22} /></span><div><h2>{admin ? name : 'Nhắn với người quản trị'}</h2><p>{admin ? 'Trả lời trực tiếp trong cuộc trò chuyện này' : 'Báo lỗi, nhờ hỗ trợ hoặc chia sẻ ý tưởng của bạn'}</p></div><Badge><Icon name="shield" size={13} />Riêng tư</Badge></header>
    <div className="support-feed" ref={feed} role="log" aria-label="Tin nhắn hỗ trợ" aria-live="polite" aria-relevant="additions" onScroll={() => { const el = feed.current; if (el) follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}>
      {loading ? <p className="hint" role="status">Đang mở cuộc trò chuyện…</p> : !messages.length && !error && available ? <EmptyState icon="chat" title={admin ? 'Chưa có tin nhắn' : 'Có điều gì bạn muốn chia sẻ?'} description={admin ? 'Tin nhắn của người dùng sẽ xuất hiện tại đây.' : 'Kể lại lỗi bạn gặp hoặc điều bạn muốn có thêm. Phản hồi của người quản trị sẽ xuất hiện ngay tại đây.'} /> : null}
      {messages.map(message => {
        const mine = admin ? message.sender === 'admin' : message.sender === 'user';
        return <article className={'support-message' + (mine ? ' is-mine' : '')} key={message.id}>
          <div className="support-message-meta"><strong>{message.sender === 'admin' ? 'Quản trị' : admin ? message.name : 'Bạn'}</strong><time dateTime={new Date(message.at).toISOString()}>{date(message.at)}</time></div>
          {message.sender === 'user' && <span className="support-message-topic">{topicName(message.category)}</span>}
          <p>{message.text}</p>
        </article>;
      })}
    </div>
    <form className="support-compose" onSubmit={event => void send(event)}>
      {!admin && <fieldset className="support-topics"><legend className="visually-hidden">Loại nội dung</legend>{topics.map(topic => <label key={topic.value}><input className="visually-hidden" type="radio" name="support-category" value={topic.value} checked={category === topic.value} onChange={() => setCategory(topic.value)} disabled={busy} /><Icon name={topic.icon} size={16} />{topic.label}</label>)}</fieldset>}
      <label className="visually-hidden" htmlFor="support-text">Nội dung tin nhắn</label>
      <textarea id="support-text" className="textarea" rows={2} maxLength={1500} value={text} onChange={event => setText(event.target.value)} placeholder={admin ? 'Viết phản hồi cho người dùng…' : 'Mình đang gặp vấn đề…'} disabled={busy} aria-describedby="support-privacy" />
      {error && <p className="error-text" role="alert">{error}</p>}
      {!available && <p className="hint" role="status">Cần kết nối mạng để xem và gửi tin nhắn.</p>}
      <div className="support-send-row"><p id="support-privacy" className="hint">Không gửi mật khẩu hoặc thông tin nhạy cảm.</p><Button type="submit" disabled={!available || busy || !text.trim()} aria-label={admin ? 'Gửi phản hồi' : 'Gửi hỗ trợ'}>{busy ? 'Đang gửi…' : 'Gửi'}<Icon name="send" size={17} /></Button></div>
    </form>
  </section>;
}

export default function Support() {
  const { uid } = useApp();
  const { admin } = useSupportRole();
  return <div className="support-page">
    <PageHeading eyebrow="CÙNG LÀM KHOẢNG TRỜI NÀY TỐT HƠN" title="Hỗ trợ & góp ý" description="Một cuộc trò chuyện riêng để mình lắng nghe bạn." action={admin ? <Link className="button button-secondary" to="/support/inbox"><Icon name="users" size={18} />Hộp thư hỗ trợ</Link> : undefined} />
    {uid ? <Conversation key={uid} userUid={uid} /> : <section className="surface"><p className="hint" role="status">Đang kết nối để mở cuộc trò chuyện riêng của bạn…</p></section>}
    <p className="support-footnote"><Icon name="shield" size={15} />Chỉ bạn và người quản trị đọc được cuộc trò chuyện này. Giữ dữ liệu trình duyệt để có thể quay lại xem phản hồi.</p>
  </div>;
}

export function SupportInbox() {
  const { ready, uid, notify } = useApp();
  const { admin, error: roleError } = useSupportRole();
  const { threadUid } = useParams();
  const validTarget = !!threadUid && /^[A-Za-z0-9_-]{1,128}$/.test(threadUid);
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [selected, setSelected] = useState<SupportThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setThreads([]); setError(''); setLoading(true);
    if (!ready || !admin) return;
    return subscribeSupportInbox(values => { setThreads(values); setLoading(false); }, message => { setError(message); setLoading(false); });
  }, [ready, admin]);
  useEffect(() => {
    setSelected(null); setThreadLoading(false); setError('');
    if (!ready || !admin || !validTarget || !threadUid) return;
    setThreadLoading(true);
    return subscribeSupportThread(threadUid, value => { setSelected(value); setThreadLoading(false); }, message => { setError(message); setThreadLoading(false); });
  }, [ready, admin, threadUid, validTarget]);

  async function copyDevice() {
    if (!uid) return;
    try { await navigator.clipboard.writeText(uid); notify('Đã sao chép mã thiết bị.'); }
    catch { notify('Chưa sao chép được. Bạn có thể chọn và sao chép mã hiển thị.'); }
  }

  if (admin !== true) return <div className="support-page">
    <PageHeading eyebrow="DÀNH CHO NGƯỜI QUẢN TRỊ" title="Hộp thư hỗ trợ" />
    <section className="surface support-access">
      <Icon name="shield" size={28} /><h2>{!ready || admin === null ? 'Đang kiểm tra quyền truy cập…' : 'Hộp thư này dành cho người quản trị'}</h2>
      <p>Cuộc trò chuyện của mọi người được giữ riêng tư. Bạn vẫn có thể gửi yêu cầu của mình ở trang hỗ trợ.</p>
      {(roleError || !ready) && <p className="error-text" role="alert">{roleError || 'Kết nối mạng để kiểm tra quyền truy cập.'}</p>}
      <Link className="button button-secondary" to="/support">Về trang hỗ trợ<Icon name="arrowRight" size={17} /></Link>
      {uid && <details className="support-setup"><summary>Thiết lập dành cho chủ website</summary><p>Mã thiết bị này dùng để cấp quyền nhận và trả lời hỗ trợ. Việc cấp quyền cần thực hiện trong Firebase Console của chủ dự án; trang web không thể tự cấp quyền.</p><code>{uid}</code><Button variant="secondary" onClick={() => void copyDevice()}>Sao chép mã thiết bị<Icon name="copy" size={16} /></Button></details>}
    </section>
  </div>;

  return <div className="support-page">
    <PageHeading eyebrow="LẮNG NGHE MỌI NGƯỜI" title="Hộp thư hỗ trợ" description="Báo lỗi, câu hỏi và những ý tưởng được gửi riêng cho bạn." action={<Link className="button button-ghost" to="/support">Tin nhắn của tôi<Icon name="arrowRight" size={17} /></Link>} />
    {error && <p className="error-text" role="alert">{error}</p>}
    <div className={'support-inbox' + (threadUid ? ' has-thread' : '')}>
      <aside className="support-thread-list" aria-label="Cuộc trò chuyện hỗ trợ">
        <div className="support-list-heading"><h2>Cuộc trò chuyện</h2>{!loading && !error && <Badge>{threads.length}</Badge>}</div>
        {loading ? <p className="hint" role="status">Đang tải hộp thư…</p> : !threads.length && !error ? <p className="hint">Chưa có yêu cầu hỗ trợ nào.</p> : threads.map(thread => <Link className={'support-thread' + (thread.uid === threadUid ? ' is-selected' : '')} aria-current={thread.uid === threadUid ? 'page' : undefined} key={thread.uid} to={'/support/inbox/' + thread.uid} aria-label={'Mở cuộc trò chuyện với ' + thread.name}>
          <AvatarView name={thread.name} size="sm" /><div><strong>{thread.name}</strong><p>{thread.lastText}</p><span>{topicName(thread.category)} · {thread.lastSender === 'user' ? 'Chờ phản hồi' : 'Đã trả lời'}</span><time dateTime={new Date(thread.updatedAt).toISOString()}>{date(thread.updatedAt)}</time></div>
        </Link>)}
      </aside>
      {threadUid ? !validTarget ? <p className="error-text" role="alert">Đường dẫn cuộc trò chuyện không hợp lệ.</p> : threadLoading ? <div className="surface"><p className="hint" role="status">Đang mở cuộc trò chuyện…</p></div> : selected ? <Conversation key={selected.uid} userUid={selected.uid} admin name={selected.name} initialCategory={selected.category} /> : <div className="surface"><EmptyState icon="chat" title="Không tìm thấy cuộc trò chuyện" description="Quay lại hộp thư để chọn một yêu cầu khác." action={<Link className="button button-secondary" to="/support/inbox">Về hộp thư</Link>} /></div> : <div className="surface support-inbox-empty"><EmptyState icon="chat" title="Chọn một lời nhắn để bắt đầu" description="Phản hồi của bạn sẽ hiện trực tiếp trên trang hỗ trợ của người gửi." /></div>}
    </div>
  </div>;
}
