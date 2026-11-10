import { useNavigate } from 'react-router-dom';
import { AnimatedLink as Link } from '../components/AnimatedLink';
import { useApp } from '../state/AppContext';
import { updateRoomProfile } from '../lib/firebase';
import { AvatarView, Icon } from '../components/ui';
import ProfileForm from '../components-extra/ProfileForm';

type Props={musicEnabled:boolean;onToggleMusic:()=>void;hearts:boolean;onToggleHearts:()=>void;onInstall?:()=>void};
export function ProfileEditor(){
  const {profile,room,saveProfile,notify}=useApp();const navigate=useNavigate();
  return <section className="surface profile-editor"><h1>Chỉnh sửa hồ sơ</h1><ProfileForm initial={profile!} onSave={p=>{saveProfile(p);if(room)void updateRoomProfile(room,p).catch(e=>notify(e.message));notify('Đã cập nhật hồ sơ của bạn.');navigate('/profile')}}/></section>;
}
export default function ProfilePage({musicEnabled,onToggleMusic,hearts,onToggleHearts,onInstall}:Props){
  const {profile}=useApp();
  const relationship=({secret:'Một chút bí mật','in-love':'Đang yêu',single:'Độc thân',crush:'Đang thương một người'} as Record<string,string>)[profile?.relationship||'secret'];
  return <div className="app-profile page-stack">
    <section className="profile-identity-card"><span className="eyebrow">GÓC CỦA BẠN</span><Link to="/profile/edit" className="profile-edit-link" aria-label="Chỉnh sửa hồ sơ"><Icon name="edit" size={21}/></Link><div className="profile-identity"><AvatarView avatar={profile?.avatar} name={profile?.name} size="xl"/><div><h1>{profile?.name}</h1><p>{relationship}</p></div></div>{profile?.bio&&<p className="profile-bio">{profile.bio}</p>}<Link to="/profile/edit" className="profile-edit-action">Chỉnh sửa hồ sơ<Icon name="arrowRight" size={17}/></Link></section>
    <section><div className="app-section-heading"><h2>Những điều của mình</h2></div><div className="app-menu"><Link to="/memories" className="app-menu-row"><span className="menu-icon gold"><Icon name="bookmark" size={23}/></span><span><strong>Ngăn kỷ niệm</strong><small>Ngày hẹn và những điều muốn giữ</small></span><Icon name="arrowRight" size={18}/></Link><Link to="/little-things" className="app-menu-row"><span className="menu-icon"><Icon name="sparkles" size={23}/></span><span><strong>Một chút vui</strong><small>Câu hỏi và những bất ngờ nhỏ</small></span><Icon name="arrowRight" size={18}/></Link>{onInstall&&<button className="app-menu-row" onClick={onInstall}><span className="menu-icon"><Icon name="download" size={23}/></span><span><strong>Cài ứng dụng</strong><small>Giữ ánh trăng trên màn hình chính</small></span><Icon name="arrowRight" size={18}/></button>}</div></section>
    <section className="app-settings"><div className="app-section-heading"><h2>Không gian của bạn</h2><span id="space-development" className="badge">Đang phát triển</span></div><div className="app-menu"><div className="setting-row"><span><Icon name="music" size={21}/>Nhạc nền dịu nhẹ</span><button role="switch" aria-checked={musicEnabled} className={'switch'+(musicEnabled?' on':'')} onClick={onToggleMusic} aria-label="Nhạc nền" aria-describedby="space-development" disabled/></div><div className="setting-row"><span><Icon name="sparkles" size={21}/>Hiệu ứng động</span><button role="switch" aria-checked={hearts} className={'switch'+(hearts?' on':'')} onClick={onToggleHearts} aria-label="Hiệu ứng động" aria-describedby="space-development motion-description" disabled/></div></div><p id="motion-description" className="hint">Nhạc và hiệu ứng đang được hoàn thiện.</p></section>
    <div className="privacy-footnote"><Icon name="shield" size={18}/><p>Hồ sơ và kỷ niệm được lưu trên thiết bị này. Giữ dữ liệu trình duyệt để không mất những điều đã lưu.</p></div>
  </div>;
}
