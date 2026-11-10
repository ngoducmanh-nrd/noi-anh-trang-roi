import { useLayoutEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatedNavLink as NavLink } from './AnimatedLink';
import { AvatarView, Button, Icon } from './ui';
import ThemeToggle from './ThemeToggle';

type ShellProps = {
  children: ReactNode;
  profileName: string;
  avatar?: { kind: string; value: string };
  connection: 'connecting' | 'online' | 'offline' | 'error';
  onEditProfile: () => void;
  onInstall?: () => void;
  immersive?: boolean;
  unread?: number;
};

const navigation = [
  { to: '/', name: 'Khoảng trời', short: 'Trang chủ', icon: 'home' },
  { to: '/room', name: 'Phòng của hai ta', short: 'Phòng đôi', icon: 'chat' },
  { to: '/discover', name: 'Tìm một người', short: 'Khám phá', icon: 'users' },
  { to: '/memories', name: 'Điều muốn giữ', short: 'Kỷ niệm', icon: 'bookmark' },
  { to: '/profile', name: 'Góc của bạn', short: 'Cá nhân', icon: 'heart' },
];

export default function Shell({ children, profileName, avatar, connection, onEditProfile, onInstall, immersive=false, unread=0 }: ShellProps) {
  const location = useLocation();
  useLayoutEffect(()=>{window.scrollTo({top:0,left:0,behavior:'instant'})},[location.pathname]);
  const active = navigation.find(item => item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to));
  const status = { online: 'Đã kết nối', connecting: 'Đang kết nối', offline: 'Đang ngoại tuyến', error: 'Chưa kết nối' }[connection];
  const date = new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'long' }).format(new Date());
  const support=location.pathname.startsWith('/support');
    const detail=location.pathname==='/profile/edit'||location.pathname==='/little-things'||support||immersive;
    const back=location.pathname==='/profile/edit'?'/profile':support?(location.pathname.startsWith('/support/inbox/')?'/support/inbox':location.pathname==='/support/inbox'?'/support':'/profile'):'/';
  const title=support?(location.pathname.startsWith('/support/inbox')?'Hộp thư hỗ trợ':'Hỗ trợ & góp ý'):location.pathname==='/profile/edit'?'Sửa hồ sơ':location.pathname==='/chat'?'Chuyện dưới trăng':location.pathname==='/little-things'?'Một chút vui':active?.short||'Nơi Ánh Trăng Rơi';
  return <div className={`app-shell app-interface${immersive?' immersive-shell':''}${detail?' detail-shell':''}`}>
    <a className="skip-link" href="#main-content">Đến nội dung chính</a>
    <aside className="shell-sidebar">
      <NavLink to="/" className="brand" aria-label="Nơi Ánh Trăng Rơi — trang chủ"><span className="brand-mark"><Icon name="moon" size={27} /></span><span>Nơi Ánh Trăng Rơi<small>MỘT KHOẢNG TRỜI RIÊNG</small></span></NavLink>
      <div className="sidebar-divider" />
      <div className="nav-label">CÙNG NHAU DƯỚI ÁNH TRĂNG</div>
      <nav className="desktop-nav" aria-label="Điều hướng chính">{navigation.map(item => <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}><Icon name={item.icon} /><span>{item.name}</span><span className="nav-active-dot" /></NavLink>)}</nav>
      <div className="nav-label utility-nav-label">TIỆN ÍCH & HỖ TRỢ</div>
      <nav className="desktop-nav" aria-label="Tiện ích và hỗ trợ">{[{to:'/little-things',name:'Một chút vui',icon:'sparkles'},{to:'/support',name:'Hỗ trợ & góp ý',icon:'shield'}].map(item=><NavLink key={item.to} to={item.to} className={({isActive})=>`nav-item${isActive?' active':''}`}><Icon name={item.icon}/><span>{item.name}</span><span className="nav-active-dot"/></NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><Icon name="sparkles" size={18} /><p>Chậm lại một chút.<br />Thương nhau nhiều hơn.</p><span className="sidebar-note-line" /></div>
        {onInstall && <Button variant="ghost" className="install-button" onClick={onInstall}><Icon name="download" size={18} />Thêm vào thiết bị</Button>}
        <button type="button" className="sidebar-profile" onClick={onEditProfile}><AvatarView avatar={avatar} name={profileName} size="sm" /><span><strong>{profileName}</strong><small>Góc nhỏ của bạn</small></span><Icon name="settings" size={17} /></button>
      </div>
    </aside>
    <div className="shell-body">
      <header className="shell-header"><div className="shell-breadcrumb">{detail?<NavLink className="screen-back" to={back} aria-label="Quay lại"><Icon name="arrowLeft" size={22}/></NavLink>:<span className="mobile-brand"><Icon name="moon" size={23} /></span>}<span className="screen-title">{title}</span><span className="breadcrumb-divider">/</span><span className="shell-date">{date}</span></div><div className="shell-header-actions"><ThemeToggle />{!detail&&<NavLink className="header-chat-link" to="/chat" aria-label={unread?`Chat chung, ${unread} tin nhắn chưa đọc`:'Chat chung'}><Icon name="chat" size={22}/>{unread>0&&<span className="header-unread">{unread>99?'99+':unread}</span>}</NavLink>}<span className={`connection-status connection-${connection}`} role="status"><span className="status-dot" /><span>{status}</span></span><button type="button" className="header-avatar-button" aria-label="Mở hồ sơ của bạn" onClick={onEditProfile}><AvatarView avatar={avatar} name={profileName} size="sm" /></button></div></header>
      <main id="main-content" className="main-content" tabIndex={-1}>{children}</main>
      <footer className="shell-footer"><span>Nơi Ánh Trăng Rơi</span><span>Mỗi khoảnh khắc, một chút dịu dàng.</span><Icon name="moon" size={14} /></footer>
    </div>
    <nav className="mobile-nav" aria-label="Điều hướng di động">{navigation.map(item => <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}><Icon name={item.icon} size={21} /><span>{item.short}</span></NavLink>)}</nav>
  </div>;
}
