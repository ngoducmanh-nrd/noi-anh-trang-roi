import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Profile, RoomRef } from '../types';
import { initializeConnection, onConnection, setPresence } from '../lib/firebase';

const project=(window as Window & {APP_CONFIG?:{firebase?:{projectId?:string}}}).APP_CONFIG?.firebase?.projectId||'local';
const key='moonlight:'+project;
function read<T>(suffix:string,fallback:T):T{try{return JSON.parse(localStorage.getItem(key+suffix)||'null')??fallback}catch{return fallback}}
function legacyProfile():Profile|null{try{return JSON.parse(localStorage.getItem('inlove_owned_v1_'+project)||'null')?.profile||null}catch{return null}}
function legacyRoom():RoomRef|null{try{const room=JSON.parse(localStorage.getItem('inlove_owned_v1_'+project)||'null')?.room;if(!room?.cloud||!room.code||(room.matched&&!room.selected))return null;return {code:room.code,kind:room.selected?'selectedRooms':'rooms'}}catch{return null}}
type Connection='connecting'|'online'|'offline'|'error';
type State={profile:Profile|null;room:RoomRef|null;uid:string|null;ready:boolean;connection:Connection;connectionError:string|null;looking:boolean;setLooking:(value:boolean)=>Promise<void>;saveProfile:(p:Profile)=>void;selectRoom:(room:RoomRef|null)=>void;notify:(text:string)=>void};
const Context=createContext<State|null>(null);
export function useApp(){const value=useContext(Context);if(!value)throw Error('AppProvider missing');return value}
export function AppProvider({children}:{children:ReactNode}){
  const [profile,setProfile]=useState<Profile|null>(()=>read(':profile',legacyProfile()));
  const [room,setRoom]=useState<RoomRef|null>(()=>read(':room',legacyRoom()));
  const [uid,setUid]=useState<string|null>(null),[ready,setReady]=useState(false),[connectionError,setConnectionError]=useState<string|null>(null);
  const [online,setOnline]=useState(navigator.onLine),[toast,setToast]=useState('');
  const [looking,setLookingState]=useState(false);
  useEffect(()=>{const yes=()=>setOnline(true),no=()=>setOnline(false);window.addEventListener('online',yes);window.addEventListener('offline',no);return()=>{window.removeEventListener('online',yes);window.removeEventListener('offline',no)}},[]);
  useEffect(()=>{const stop=onConnection(s=>{setUid(s.uid);setReady(s.ready);setConnectionError(s.error)});void initializeConnection().catch(e=>setConnectionError(e instanceof Error?e.message:'Không thể kết nối'));return stop},[]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),5000);return()=>clearTimeout(timer)},[toast]);
  function saveProfile(value:Profile){try{localStorage.setItem(key+':profile',JSON.stringify(value));setProfile(value)}catch{setToast('Không lưu được hồ sơ. Kiểm tra dung lượng trình duyệt.')}}
  function selectRoom(value:RoomRef|null){try{localStorage.setItem(key+':room',JSON.stringify(value));setRoom(value)}catch{setToast('Không lưu được phòng trên thiết bị.')}}
  async function setLooking(value:boolean){if(!profile)throw Error('Bạn cần tạo hồ sơ trước.');await setPresence(profile,value);setLookingState(value)}
  const connection:Connection=!online?'offline':connectionError?'error':ready?'online':'connecting';
  return <Context.Provider value={{profile,room,uid,ready,connection,connectionError,looking,setLooking,saveProfile,selectRoom,notify:setToast}}>{children}{toast&&<div className="toast" role="status">{toast}<button aria-label="Đóng thông báo" onClick={()=>setToast('')}>×</button></div>}</Context.Provider>
}
export function localKey(suffix:string){return key+suffix}
