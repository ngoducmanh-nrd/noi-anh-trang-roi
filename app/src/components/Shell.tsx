import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AvatarView, Button, Icon } from './ui';
import ThemeToggle from './ThemeToggle';

type ShellProps = {
  children: ReactNode;
  profileName: string;
  avatar?: { kind: string; value: string };
  connection: 'connecting' | 'online' | 'offline' | 'error';
  onEditProfile: () => void;
  onInstall?: () => void;
};

const navigation = [
  { to: '/', name: 'Khoảng trời', short: 'Trang chủ', icon: 'home' },
  { to: '/room', name: 'Phòng của hai ta', short: 'Phòng đôi', icon: 'chat' },
  { to: '/discover', name: 'Tìm một người', short: 'Khám phá', icon: 'users' },
  { to: '/memories', name: 'Điều muốn giữ', short: 'Kỷ niệm', icon: 'bookmark' },
  { to: '/profile', name: 'Góc của bạn', short: 'Cá nhân', icon: 'heart' },
];

export default function Shell({ children, profileName, avatar, connection, onEditProfile, onInstall }: ShellProps) {
  const location = useLocation();
  const active = navigation.find(item => item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to));
  const status = { online: 'Đã kết nối', connecting: 'Đang kết nối', offline: 'Đang ngoại tuyến', error: 'Chưa kết nối' }[connection];
  const date = new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'long' }).format(new Date());
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Đến nội dung chính</a>
    <aside className="shell-sidebar">
      <NavLink to="/" className="brand" aria-label="Nơi Ánh Trăng Rơi — trang chủ"><span className="brand-mark"><Icon name="moon" size={27} /></span><span>Nơi Ánh Trăng Rơi<small>MỘT KHOẢNG TRỜI RIÊNG</small></span></NavLink>
      <div className="sidebar-divider" />
      <div className="nav-label">CÙNG NHAU DƯỚI ÁNH TRĂNG</div>
      <nav className="desktop-nav" aria-label="Điều hướng chính">{navigation.map(item => <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}><Icon name={item.icon} /><span>{item.name}</span><span className="nav-active-dot" /></NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><Icon name="sparkles" size={18} /><p>Chậm lại một chút.<br />Thương nhau nhiều hơn.</p><span className="sidebar-note-line" /></div>
        {onInstall && <Button variant="ghost" className="install-button" onClick={onInstall}><Icon name="download" size={18} />Thêm vào thiết bị</Button>}
        <button type="button" className="sidebar-profile" onClick={onEditProfile}><AvatarView avatar={avatar} name={profileName} size="sm" /><span><strong>{profileName}</strong><small>Góc nhỏ của bạn</small></span><Icon name="settings" size={17} /></button>
      </div>
    </aside>
    <div className="shell-body">
      <header className="shell-header"><div className="shell-breadcrumb"><span className="mobile-brand"><Icon name="moon" size={21} /></span><span>{active?.name || 'Khoảnh khắc bên nhau'}</span><span className="breadcrumb-divider">/</span><span className="shell-date">{date}</span></div><div className="shell-header-actions"><ThemeToggle /><span className={`connection-status connection-${connection}`} role="status"><span className="status-dot" /><span>{status}</span></span><button type="button" className="header-avatar-button" aria-label="Mở hồ sơ của bạn" onClick={onEditProfile}><AvatarView avatar={avatar} name={profileName} size="sm" /></button></div></header>
      <main id="main-content" className="main-content" tabIndex={-1}>{children}</main>
      <footer className="shell-footer"><span>Nơi Ánh Trăng Rơi</span><span>Mỗi khoảnh khắc, một chút dịu dàng.</span><Icon name="moon" size={14} /></footer>
    </div>
    <nav className="mobile-nav" aria-label="Điều hướng di động">{navigation.map(item => <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}><Icon name={item.icon} size={21} /><span>{item.short}</span></NavLink>)}</nav>
  </div>;
}
