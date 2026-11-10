import { useEffect, useId, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { AnimateIcon } from '@animate-ui/react/icons';
import { Icon } from './Icon';

export { Icon } from './Icon';

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
  return <AnimateIcon asChild animateOnHover={!props.disabled} animateOnTap={!props.disabled} completeOnStop><button type={type} className={`button button-${variant} ${className}`} {...props}>{children}</button></AnimateIcon>;
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
