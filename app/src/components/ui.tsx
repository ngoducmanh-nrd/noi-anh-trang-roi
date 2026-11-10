import { useEffect, useId, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type IconProps = { name: string; size?: number; className?: string };

export function Icon({ name, size = 20, className = '' }: IconProps) {
  const paths: Record<string, ReactNode> = {
    moon: <path d="M20.8 14.7A9 9 0 0 1 9.3 3.2a9 9 0 1 0 11.5 11.5Z" />,
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /><path d="M9 10h6" /></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
    chat: <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.9" /><circle cx="9" cy="7" r="4" /><path d="M16 3.1a4 4 0 0 1 0 7.8" /></>,
    game: <><path d="M7.5 6h9a4 4 0 0 1 3.9 3.1l1.5 7a3 3 0 0 1-5 2.7L14 16h-4l-2.9 2.8a3 3 0 0 1-5-2.7l1.5-7A4 4 0 0 1 7.5 6Z" /><path d="M7 9v5M4.5 11.5h5M16 10h.01M18 13h.01" /></>,
    sparkles: <><path d="m12 3 2.7 6.3L21 12l-6.3 2.7L12 21l-2.7-6.3L3 12l6.3-2.7ZM20 2v4M18 4h4" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    arrowRight: <path d="M4 12h16m-6-6 6 6-6 6" />,
    arrowLeft: <path d="M20 12H4m6-6-6 6 6 6" />,
    settings: <><path d="m9.5 3-.6 2.2-2 .9L4.8 5.5l-2.5 4.3L4 11.5v1L2.3 14l2.5 4.3 2.1-.6 2 .9.6 2.4h5l.6-2.4 2-.9 2.1.6 2.5-4.3-1.7-1.5v-1l1.7-1.7-2.5-4.3-2.1.6-2-.9-.6-2.2Z" /><circle cx="12" cy="12" r="3" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18M8 15h.01M12 15h.01M16 15h.01" /></>,
    bookmark: <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z" />,
    send: <><path d="m22 2-7 20-4-9-9-4 20-7ZM11 13 22 2" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    check: <path d="m5 12 4 4L19 6" />,
    copy: <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
    link: <><path d="m10 13 4-4M9 15l-2 2a3.5 3.5 0 0 1-5-5l4-4a3.5 3.5 0 0 1 5 0M13 9l2-2a3.5 3.5 0 0 1 5 5l-4 4a3.5 3.5 0 0 1-5 0" /></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 8l5-5 5 5M12 3v12" /></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>,
    music: <><path d="M9 18V5l12-2v13M9 9l12-2" /><ellipse cx="6" cy="18" rx="3" ry="3" /><ellipse cx="18" cy="16" rx="3" ry="3" /></>,
    volume: <><path d="m11 5-6 4H2v6h3l6 4ZM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    shield: <><path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z" /><path d="m8 12 3 3 5-6" /></>,
    wifi: <><path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8.5 15.5a5.5 5.5 0 0 1 7 0" /><circle cx="12" cy="19" r=".7" /></>,
    offline: <><path d="m2 2 20 20M2 8a16 16 0 0 1 4-2M10 4.2A16 16 0 0 1 22 8M5 12a11 11 0 0 1 6-2M16 11a11 11 0 0 1 3 1M8.5 15.5a5.5 5.5 0 0 1 7 0" /><circle cx="12" cy="19" r=".7" /></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></>,
    edit: <><path d="m16 3 5 5L9 20l-6 1 1-6ZM13 6l5 5" /></>,
    search: <><circle cx="10.5" cy="10.5" r="7.5" /><path d="m16 16 5 5" /></>,
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3L7.5 14 3 9.6l6.2-.9Z" />,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6.1 6.1A8 8 0 0 1 20 12M4 12a8 8 0 0 0 13.9 5.9" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={`icon ${className}`}>{paths[name] || paths.sparkles}</svg>;
}

type AvatarLike = { kind: string; value: string };
export function AvatarView({ avatar, name = '', size = 'md' }: { avatar?: AvatarLike; name?: string; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const [failed, setFailed] = useState(false);
  const value = avatar?.value || '';
  const image = avatar && (avatar.kind === 'url' && /^https?:\/\//i.test(value) || avatar.kind === 'data' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)) && value.length <= 250000;
  useEffect(() => setFailed(false), [value]);
  return <span className={`avatar avatar-${size}`}>
    {image && !failed ? <img src={value} alt={name ? `Ảnh đại diện của ${name}` : 'Ảnh đại diện'} onError={() => setFailed(true)} referrerPolicy="no-referrer" /> : avatar?.kind === 'emoji' && value && !value.startsWith('i-') ? <span aria-hidden="true">{Array.from(value).slice(0, 12).join('')}</span> : name ? <span aria-hidden="true">{name.trim().split(/\s+/).slice(-2).map(n => n[0]).join('').toUpperCase()}</span> : <Icon name="moon" size={size === 'xl' ? 34 : 22} />}
  </span>;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' };
export function Button({ children, variant = 'primary', className = '', type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); previous?.focus(); };
  }, []);
  return <dialog ref={dialog} className="modal" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal-content"><header className="modal-header"><h2 id={titleId}>{title}</h2><Button variant="ghost" className="icon-button" onClick={onClose} aria-label="Đóng"><Icon name="close" /></Button></header><div className="modal-body">{children}</div></div>
  </dialog>;
}

export function EmptyState({ icon = 'moon', title, description, action }: { icon?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon"><Icon name={icon} size={30} /></div><h3>{title}</h3>{description && <p>{description}</p>}{action && <div className="actions">{action}</div>}</div>;
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{action && <div className="page-heading-action">{action}</div>}</div>;
}

export function Badge({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'success' | 'warning' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function MoonScene({ className = '' }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  return <svg className={`moon-scene ${className}`} viewBox="0 0 440 350" fill="none" aria-hidden="true">
    <defs><radialGradient id={`${id}moon`} cx=".28" cy=".24" r=".9"><stop stopColor="#fff9e8" /><stop offset=".55" stopColor="#e6dcc6" /><stop offset="1" stopColor="#a69b86" /></radialGradient><radialGradient id={`${id}glow`}><stop stopColor="#d4c3ef" stopOpacity=".14" /><stop offset="1" stopColor="#d4c3ef" stopOpacity="0" /></radialGradient></defs>
    <circle cx="235" cy="164" r="155" fill={`url(#${id}glow)`} />
    <ellipse cx="225" cy="176" rx="182" ry="74" transform="rotate(-27 225 176)" stroke="#a899ce" strokeOpacity=".25" />
    <ellipse cx="225" cy="176" rx="148" ry="120" transform="rotate(30 225 176)" stroke="#a899ce" strokeOpacity=".12" />
    <circle cx="235" cy="154" r="83" fill={`url(#${id}moon)`} />
    <g fill="#b7aa94" opacity=".24"><circle cx="202" cy="115" r="17" /><circle cx="272" cy="164" r="23" /><circle cx="211" cy="186" r="10" /><circle cx="255" cy="117" r="7" /><circle cx="188" cy="153" r="6" /><circle cx="241" cy="201" r="13" /></g>
    <path d="M161 116c-12 21-16 47-8 72" stroke="#fff9e8" strokeOpacity=".35" strokeWidth="2" strokeLinecap="round" />
    <path d="M56 217c39 16 113 2 178-30 67-34 119-79 131-113" stroke="#d5c0e9" strokeOpacity=".4" strokeLinecap="round" />
    <circle cx="78" cy="218" r="8" fill="#c8b7ea" /><circle cx="78" cy="218" r="15" stroke="#c8b7ea" strokeOpacity=".2" />
    <g fill="#e8d4a9"><circle cx="105" cy="76" r="2" /><circle cx="358" cy="215" r="2" /><circle cx="167" cy="286" r="1.5" /><circle cx="334" cy="66" r="1.5" /><circle cx="84" cy="144" r="1" /><circle cx="294" cy="282" r="1" /></g>
    <g stroke="#d6c6ea" strokeLinecap="round"><path d="M360 121v12m-6-6h12M119 270v8m-4-4h8M174 46v8m-4-4h8" /></g>
  </svg>;
}
