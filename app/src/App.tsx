import { Component, Suspense, lazy, useEffect, useRef, useState, type ReactNode, type ErrorInfo } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { AppProvider, useApp, localKey } from './state/AppContext';
import Shell from './components/Shell';
import ThemeToggle from './components/ThemeToggle';
import { AvatarView, Button, Icon } from './components/ui';
import ProfileForm from './components-extra/ProfileForm';
import Home from './pages/Home';
const Room=lazy(()=>import('./pages/Room'));
const Discover=lazy(()=>import('./pages/Discover'));
const Memories=lazy(()=>import('./pages/Memories'));
const Profile=lazy(()=>import('./pages/Profile'));
const ProfileEditor=lazy(()=>import('./pages/Profile').then(module=>({default:module.ProfileEditor})));
const LittleThings=lazy(()=>import('./pages/LittleThings'));
const Support=lazy(()=>import('./pages/Support'));
const SupportInbox=lazy(()=>import('./pages/Support').then(module=>({default:module.SupportInbox})));
import ChatPanel from './features/chat/ChatPanel';
import { respondInvite, subscribeHearts, setHearts, subscribeInvites, subscribeOutgoing, withdrawInvite, subscribeGlobalChat, serverNow } from './lib/firebase';
import type { Invite } from './types';

class ErrorBoundary extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return{failed:true}}componentDidCatch(error:Error,info:ErrorInfo){console.error('App render error',error,info)}render(){return this.state.failed?<main className="onboarding"><section className="surface"><h1>Mình cần tải lại một chút</h1><p>Đã có lỗi khi hiển thị. Dữ liệu đã lưu vẫn được giữ trên thiết bị.</p><button className="button button-primary" onClick={()=>location.reload()}>Tải lại ứng dụng</button></section></main>:this.props.children}}
type InstallPrompt=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
function Application(){
  const {profile,saveProfile,room,ready,uid,connection,connectionError,selectRoom,notify,setLooking}=useApp();const navigate=useNavigate();
  const [invites,setInvites]=useState<Invite[]>([]),[responding,setResponding]=useState(''),[hearts,setHeartsState]=useState(false),[musicEnabled,setMusicEnabled]=useState(false),[install,setInstall]=useState<InstallPrompt|null>(null);
  const routeLocation=useLocation();const globalChat=routeLocation.pathname==='/chat';const supportRoute=routeLocation.pathname.startsWith('/support');
  useEffect(()=>{if(!globalChat)return;function close(e:KeyboardEvent){if(e.key==='Escape')navigate('/')}window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[globalChat,navigate]);
  const opened=useRef(new Set<string>()),audio=useRef<HTMLAudioElement|null>(null);
  const [unread,setUnread]=useState(0);
  const lastRead=useRef((()=>{try{return Number(localStorage.getItem(localKey(':chat-last-read')))||Date.now()}catch{return Date.now()}})());
  const {needRefresh:[needRefresh,setNeedRefresh],updateServiceWorker}=useRegisterSW();
  useEffect(()=>{function before(e:Event){e.preventDefault();setInstall(e as InstallPrompt)}window.addEventListener('beforeinstallprompt',before);return()=>window.removeEventListener('beforeinstallprompt',before)},[]);
  useEffect(()=>()=>{audio.current?.pause()},[]);
  useEffect(()=>{if(!ready)return;return subscribeHearts(setHeartsState)},[ready]);
  useEffect(()=>{if(!ready||!profile)return;const a=subscribeInvites(setInvites);const b=subscribeOutgoing(values=>{for(const inv of values){if(inv.status!=='accepted'||opened.current.has(inv.roomCode))continue;opened.current.add(inv.roomCode);selectRoom({kind:'selectedRooms',code:inv.roomCode});void setLooking(false).catch(()=>{});void withdrawInvite(inv.toUid).catch(()=>{});navigate('/room');notify('Người ấy đã đồng ý. Căn phòng của hai bạn đã sẵn sàng.')}});return()=>{a();b()}},[ready,uid,profile?.name]);
  useEffect(()=>{if(!ready||!profile)return;return subscribeGlobalChat(messages=>{if(globalChat){lastRead.current=serverNow();setUnread(0);try{localStorage.setItem(localKey(':chat-last-read'),String(lastRead.current))}catch{}}else setUnread(messages.filter(m=>m.uid!==uid&&m.at>lastRead.current).length)})},[ready,uid,!!profile,globalChat]);
  async function respond(inv:Invite,accept:boolean){if(!profile)return;setResponding(inv.fromUid);try{const joined=await respondInvite(inv,accept,profile);if(joined){opened.current.add(joined.code);selectRoom(joined);await setLooking(false);navigate('/room');notify('Một kết nối mới đã bắt đầu.')}}catch(e){notify(e instanceof Error?e.message:'Không phản hồi được lời mời.')}finally{setResponding('')}}
  async function toggleMusic(){try{if(musicEnabled){audio.current?.pause();setMusicEnabled(false);return}const url=window.APP_CONFIG?.site?.MUSIC_URL;if(!url){notify('Chưa có bản nhạc được chọn cho không gian này.');return}if(!audio.current){audio.current=new Audio(new URL(url,location.origin).href);audio.current.loop=true;audio.current.volume=.35}await audio.current.play();setMusicEnabled(true)}catch{notify('Chưa phát được nhạc. Hãy thử bật lại sau một thao tác chạm.')}}
  async function installApp(){if(!install)return;await install.prompt();await install.userChoice;setInstall(null)}
  const pending=invites.filter(i=>i.status==='pending');
  if(!profile)return <main className="onboarding"><div className="onboarding-art" aria-hidden="true"><div className="onboard-moon"/><div className="onboard-orbit"/><span className="onboard-star one">✦</span><span className="onboard-star two">✧</span><div className="onboard-story"><span className="eyebrow">NƠI ÁNH TRĂNG RƠI</span><h1>Một nơi để lòng<br/>mình dịu lại.</h1><p>Giữa bao nhiêu điều vội vã,<br/>mình dành nhau một khoảng trời riêng.</p></div></div><section className="onboarding-card"><div className="onboarding-toolbar"><Link className="onboarding-brand" to="/"><Icon name="moon" size={24}/>Nơi Ánh Trăng Rơi</Link><ThemeToggle /></div><span className="eyebrow">BẮT ĐẦU BẰNG MỘT LỜI CHÀO</span><h2>Bạn mang tên gì<br/>dưới ánh trăng này?</h2><p className="text-muted">Một hồ sơ nhỏ, để những câu chuyện tìm thấy bạn.</p><ProfileForm onSave={saveProfile} submitLabel="Bước vào không gian của mình"/><p className="hint onboarding-privacy"><Icon name="shield" size={14}/>Hồ sơ được giữ trên trình duyệt của bạn.</p></section></main>;
  return <Shell profileName={profile.name} avatar={profile.avatar} connection={connection} unread={unread} onEditProfile={()=>navigate('/profile')} immersive={globalChat||supportRoute||(routeLocation.pathname==='/room'&&!!room)} onInstall={install?()=>void installApp():undefined}>
    {connection==='offline'&&<div className="notice" role="status"><Icon name="offline" size={18}/>Bạn đang ngoại tuyến. Kỷ niệm vẫn mở được; trò chuyện sẽ cần kết nối mạng.</div>}
    {connectionError&&<div className="notice notice-error" role="alert"><Icon name="wifi" size={18}/><span>Chưa kết nối được. {connectionError}</span></div>}
    {pending.map(inv=><section className="surface invite-banner" key={inv.fromUid}><AvatarView avatar={inv.fromAvatar} name={inv.fromName} size="sm"/><div><strong>{inv.fromName} muốn bắt đầu một câu chuyện</strong><p className="hint">Một lời mời kết nối dành cho bạn.</p></div><div className="actions"><Button variant="ghost" disabled={!!responding} onClick={()=>void respond(inv,false)}>Để lần khác</Button><Button disabled={!!responding} onClick={()=>void respond(inv,true)}>Đồng ý<Icon name="heart" size={16}/></Button></div></section>)}
    <Suspense fallback={<div className="loading" role="status">Đang mở khoảng trời của bạn…</div>}><Routes><Route path="/" element={<Home/>}/><Route path="/room" element={<Room/>}/><Route path="/discover" element={<Discover/>}/><Route path="/memories" element={<Memories/>}/><Route path="/profile" element={<Profile musicEnabled={musicEnabled} onToggleMusic={()=>void toggleMusic()} hearts={hearts} onToggleHearts={()=>void setHearts(!hearts).catch(e=>notify(e.message))} onInstall={install?()=>void installApp():undefined}/>}/><Route path="/profile/edit" element={<ProfileEditor/>}/><Route path="/chat" element={<section className="chat-screen"><h1 className="visually-hidden">Chuyện dưới trăng</h1><p className="chat-screen-caption">Góc trò chuyện chung · Một lời chào để bắt đầu</p><ChatPanel global/></section>}/><Route path="/little-things" element={<LittleThings/>}/><Route path="/support" element={<Support/>}/><Route path="/support/inbox" element={<SupportInbox/>}/><Route path="/support/inbox/:threadUid" element={<SupportInbox/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></Suspense>
    {!globalChat&&!supportRoute&&<Link className="global-chat-fab" aria-label="Mở chat chung" to="/chat"><Icon name="chat" size={22}/><span>Chuyện dưới trăng</span>{unread>0&&<span className="chat-unread" aria-label={unread+' tin nhắn chưa đọc'}>{unread>99?'99+':unread}</span>}</Link>}
    {hearts&&<div className="heart-rain" aria-hidden="true">{Array.from({length:12},(_,i)=><span key={i} style={{left:(i*8+3)+'%',animationDelay:(i*.7)+'s'}}><Icon name="heart" size={15+i%3*6}/></span>)}</div>}
    {needRefresh&&<div className="update-notice" role="status"><span>Một phiên bản mới đang chờ bạn.</span><Button variant="secondary" onClick={()=>void updateServiceWorker(true)}>Cập nhật</Button><button className="icon-button" aria-label="Để sau" onClick={()=>setNeedRefresh(false)}><Icon name="close" size={17}/></button></div>}
  </Shell>
}
export default function App(){return <ErrorBoundary><AppProvider><Application/></AppProvider></ErrorBoundary>}
