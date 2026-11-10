import { useEffect, useState } from 'react';
import { AnimatedLink as Link } from '../components/AnimatedLink';
import { useApp } from '../state/AppContext';
import { subscribeWallet } from '../lib/firebase';
import { AvatarView, Icon } from '../components/ui';
import MoonOrbit from '../components/MoonOrbit';

export default function Home(){
  const {profile,room,connection,uid}=useApp();
  const [walletTotal,setWalletTotal]=useState(0);
  useEffect(()=>{if(!uid)return;return subscribeWallet(wallet=>setWalletTotal(wallet.total))},[uid]);
  return <div className="app-home page-stack">
    <section className="dashboard-person" aria-label="Hồ sơ của bạn">
      <Link to="/profile" className="dashboard-identity"><AvatarView avatar={profile?.avatar} name={profile?.name} size="lg"/><span><span className="text-muted">Chào bạn dưới trăng,</span><h1>{profile?.name||'Bạn của trăng'}</h1><span className="identity-status"><span className={`status-dot ${connection==='online'?'':'dim'}`}/>{connection==='online'?'Đang trực tuyến':'Chưa kết nối'}</span></span></Link>
      <span className="dashboard-wallet" title="Số xu hiện có"><Icon name="star" size={18}/><strong>{walletTotal.toLocaleString('vi-VN')}</strong><span>xu</span></span>
    </section>
    <section className="moon-banner"><div><span className="eyebrow">MỘT KHOẢNG TRỜI RIÊNG</span><h2>Mình kể nhau nghe.</h2><p>Một lời chào, một chút dịu dàng.</p></div><div className="banner-moon" aria-hidden="true"><MoonOrbit/></div></section>
    <section aria-labelledby="connect-title"><div className="app-section-heading"><h2 id="connect-title">Hẹn nhau dưới trăng</h2><Icon name="sparkles" size={18}/></div><div className="connect-grid">
      <Link to="/room" className="connect-tile connect-private"><span className="connect-icon"><Icon name="chat" size={29}/></span><h3>Phòng đôi</h3><p>{room?'Căn phòng đang chờ bạn':'Một nơi chỉ có hai người'}</p><span className="connect-action">{room?'Về phòng':'Vào phòng'}<Icon name="arrowRight" size={18}/></span></Link>
      <Link to="/discover" className="connect-tile connect-discover"><span className="connect-icon"><Icon name="users" size={29}/></span><h3>Tìm người</h3><p>Gặp một người đồng điệu</p><span className="connect-action">Khám phá<Icon name="arrowRight" size={18}/></span></Link>
    </div></section>
    <section aria-labelledby="moments-title"><div className="app-section-heading"><h2 id="moments-title">Góc nhỏ mỗi ngày</h2></div><div className="app-menu">
      <Link to="/chat" className="app-menu-row"><span className="menu-icon"><Icon name="chat" size={23}/></span><span><strong>Chuyện dưới trăng</strong><small>Ghé chat chung, chào mọi người</small></span><Icon name="arrowRight" size={18}/></Link>
      <Link to="/memories" className="app-menu-row"><span className="menu-icon gold"><Icon name="bookmark" size={23}/></span><span><strong>Kỷ niệm</strong><small>Giữ lại những điều đáng nhớ</small></span><Icon name="arrowRight" size={18}/></Link>
      <Link to="/little-things" className="app-menu-row"><span className="menu-icon"><Icon name="sparkles" size={23}/></span><span><strong>Một chút vui</strong><small>Câu hỏi nhỏ, bói vui cùng nhau</small></span><Icon name="arrowRight" size={18}/></Link>
    </div></section>
  </div>;
}
