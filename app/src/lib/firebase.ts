import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  connectAuthEmulator,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInAnonymously,
  type Auth,
} from 'firebase/auth';
import {
  connectDatabaseEmulator,
  get,
  getDatabase,
  limitToLast,
  onDisconnect,
  onValue,
  orderByChild,
  orderByKey,
  push,
  query,
  ref,
  remove,
  runTransaction,
  serverTimestamp,
  set,
  update,
  type Database,
  type DataSnapshot,
} from 'firebase/database';
import type { Avatar, ConnectionState, Invite, Member, Message, OpenRoom, Person, Profile, RoomMeta, RoomRef, SupportCategory, SupportMessage, SupportThread, Wallet } from '../types';

// Keep the legacy Firebase app name so an existing browser retains its anonymous UID
// and the room membership associated with that UID when the React app replaces it.
const APP_NAME = '[DEFAULT]';
const SYMBOLS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PRESENCE_MAX_AGE = 240_000;
const STICKER_MAX_LENGTH = 62_000;
let auth: Auth | null = null;
let database: Database | null = null;
let initializePromise: Promise<{ uid: string }> | null = null;
let listenersStarted = false;
let state: ConnectionState = { uid: null, ready: false, error: null };
let connected = false;
let serverOffset = 0;
const connectionListeners = new Set<(value: ConnectionState) => void>();
let presenceProfile: Profile | null = null;
let presenceTimer: ReturnType<typeof setInterval> | null = null;
let presenceEpoch = 0;
let presenceQueue: Promise<void> = Promise.resolve();
let lastGlobalSend = 0;
let sendingGlobal = false;
const outgoingChanged = new Set<() => void>();
const outgoingMemory = new Map<string, Set<string>>();

function emitConnection(patch: Partial<ConnectionState>) {
  state = { ...state, ...patch };
  for (const listener of connectionListeners) listener({ ...state });
}

function humanError(error: unknown): string {
  if (error instanceof Error) {
    if (/auth\/(operation-not-allowed|admin-restricted-operation)/i.test(error.message)) return 'Đăng nhập đang chưa được bật. Vui lòng báo người quản lý ứng dụng.';
    if (/auth\/(invalid-api-key|app-not-authorized|unauthorized-domain)/i.test(error.message)) return 'Kết nối ứng dụng chưa được cấu hình đúng. Vui lòng báo người quản lý ứng dụng.';
    if (/auth\/too-many-requests/i.test(error.message)) return 'Có quá nhiều yêu cầu. Vui lòng đợi một chút rồi thử lại.';
    if (/permission[\s_-]denied/i.test(error.message)) return 'Bạn chưa có quyền thực hiện thao tác này. Vui lòng kiểm tra quyền truy cập hoặc vào lại phòng.';
    if (/network|disconnected|offline/i.test(error.message)) return 'Kết nối bị gián đoạn. Vui lòng thử lại khi có mạng.';
    return error.message;
  }
  return 'Không thể thực hiện thao tác. Vui lòng thử lại.';
}

function reportError(error: unknown) {
  emitConnection({ error: humanError(error) });
}

function requireConnection() {
  if (!database || !auth?.currentUser) throw new Error('Chưa kết nối tài khoản. Vui lòng chờ hoặc tải lại trang.');
  return { db: database, uid: auth.currentUser.uid };
}

function randomCode(length: number) {
  const numbers = new Uint8Array(length);
  crypto.getRandomValues(numbers);
  return Array.from(numbers, value => SYMBOLS[value % SYMBOLS.length]).join('');
}

function cleanName(profile: Profile) {
  const name = profile.name.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 26) throw new Error('Tên hiển thị cần từ 2 đến 26 ký tự.');
  return name;
}

function validAvatar(avatar: Avatar | undefined, allowData = true): Avatar {
  if (avatar?.kind === 'emoji' && avatar.value && avatar.value.length <= 30) return { ...avatar };
  if (avatar?.kind === 'url' && avatar.value.length <= 700 && /^https?:\/\//i.test(avatar.value)) return { ...avatar };
  if (allowData && avatar?.kind === 'data' && avatar.value.length <= 250_000 && /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(avatar.value)) return { ...avatar };
  return { kind: 'emoji', value: '🌙' };
}

async function chatAvatar(avatar: Avatar): Promise<Avatar> {
  const safe = validAvatar(avatar);
  if (safe.kind !== 'data' || safe.value.length <= 12_000) return safe;
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Không thể đọc ảnh đại diện.'));
      image.src = safe.value;
    });
    const canvas = document.createElement('canvas');
    for (const size of [80, 64, 48]) {
      canvas.width = canvas.height = size;
      canvas.getContext('2d')?.drawImage(image, 0, 0, size, size);
      for (const quality of [0.72, 0.52]) {
        let data = canvas.toDataURL('image/webp', quality);
        if (!data.startsWith('data:image/webp')) data = canvas.toDataURL('image/jpeg', quality);
        if (data.length <= 12_000) return { kind: 'data', value: data };
      }
    }
  } catch {
    // A profile image may be too large for the chat payload; keep messages usable with the default avatar.
  }
  return { kind: 'emoji', value: '🌙' };
}

function member(profile: Profile): Member {
  return { name: cleanName(profile), avatar: validAvatar(profile.avatar), joinedAt: serverNow() };
}

function roomPath(room: RoomRef) {
  if (!/^[A-Z0-9]{8}$/.test(room.code) || !['rooms', 'selectedRooms'].includes(room.kind)) throw new Error('Mã phòng không hợp lệ.');
  return `${room.kind}/${room.code}`;
}

function messages(snapshot: DataSnapshot): Message[] {
  const result: Message[] = [];
  snapshot.forEach(child => {
    const value = child.val();
    if (value && typeof value.uid === 'string' && typeof value.text === 'string' && typeof value.at === 'number') {
      result.push({ ...value, id: child.key! });
    }
  });
  return result.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
}

export function getUid() { return auth?.currentUser?.uid ?? null; }
export function serverNow() { return Date.now() + serverOffset; }

export function initializeConnection(): Promise<{ uid: string }> {
  if (initializePromise) return initializePromise;
  initializePromise = (async () => {
    const config = window.APP_CONFIG?.firebase;
    if (!config?.apiKey || !config.authDomain || !config.databaseURL || !config.projectId || !config.appId) {
      throw new Error('Chưa có cấu hình kết nối. Các nội dung đã lưu trên thiết bị vẫn được giữ nguyên.');
    }
    if (!auth || !database) {
      const app = getApps().some(item => item.name === APP_NAME) ? getApp(APP_NAME) : initializeApp(config, APP_NAME);
      if (app.options.projectId !== config.projectId || app.options.databaseURL !== config.databaseURL) throw new Error('Cấu hình kết nối đã thay đổi. Vui lòng tải lại trang.');
      auth = getAuth(app);
      database = getDatabase(app);
      if (window.APP_CONFIG?.emulators === true && ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
        connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
        connectDatabaseEmulator(database, '127.0.0.1', 9000);
      }
    }
    await setPersistence(auth, browserLocalPersistence);
    await auth.authStateReady();
    const user = auth.currentUser ?? (await signInAnonymously(auth)).user;
    if (!listenersStarted) {
      listenersStarted = true;
      onAuthStateChanged(auth, userState => {
        if (state.uid && state.uid !== userState?.uid) {
          presenceEpoch++;
          presenceProfile = null;
          if (presenceTimer) { clearInterval(presenceTimer); presenceTimer = null; }
        }
        emitConnection({ uid: userState?.uid ?? null, ready: !!userState && connected });
      });
      onValue(ref(database, '.info/serverTimeOffset'), snapshot => { serverOffset = Number(snapshot.val()) || 0; });
      onValue(ref(database, '.info/connected'), snapshot => {
        const wasConnected = connected;
        connected = snapshot.val() === true;
        emitConnection({ uid: getUid(), ready: !!getUid() && connected, error: connected ? null : 'Đang kết nối lại…' });
        if (connected && !wasConnected && presenceProfile) void queuePresence(() => publishPresence(presenceEpoch)).catch(reportError);
      });
    }
    emitConnection({ uid: user.uid, ready: connected, error: null });
    return { uid: user.uid };
  })().catch(error => {
    initializePromise = null;
    emitConnection({ ready: false, error: humanError(error) });
    throw error;
  });
  return initializePromise;
}

export function onConnection(callback: (value: ConnectionState) => void) {
  connectionListeners.add(callback);
  callback({ ...state });
  void initializeConnection().catch(() => undefined);
  return () => { connectionListeners.delete(callback); };
}

export type CreateRoomOptions = { passwordless?: boolean; password?: string; listed?: boolean };

async function roomPasswordHash(code: string, password: string) {
  const bytes = new TextEncoder().encode(`moonlight-room:${code}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function createRoom(profile: Profile, options?: CreateRoomOptions) {
  const { db, uid } = requireConnection();
  const ownMember = member(profile);
  const custom = options?.password?.trim() || '';
  if (!options?.passwordless && custom && (custom.length < 8 || custom.length > 64)) throw new Error('Mật khẩu cần từ 8 đến 64 ký tự.');
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = randomCode(8), password = options?.passwordless ? '' : custom || randomCode(16);
    const meta: RoomMeta = { hostUid: uid, createdAt: serverNow() };
    // Calls without options retain the legacy private-room format.
    if (options) {
      meta.listed = options.listed ?? true;
      if (options.passwordless) meta.passwordless = true;
      else meta.passwordFormat = 'sha256';
    }
    try {
      await set(ref(db, `rooms/${code}`), { meta, members: { [uid]: ownMember } });
    } catch (error) {
      if (attempt < 5 && /permission[\s_-]denied/i.test(String(error))) continue;
      throw new Error(humanError(error));
    }
    try {
      if (password) await set(ref(db, `roomPasswords/${code}`), options ? await roomPasswordHash(code, password) : password);
      return { code, password };
    } catch (error) { throw new Error(humanError(error)); }
  }
  throw new Error('Không thể tạo phòng. Vui lòng thử lại.');
}

export async function joinRoom(code: string, password: string, profile: Profile) {
  const { db, uid } = requireConnection();
  const room: RoomRef = { code: code.trim().toUpperCase(), kind: 'rooms' };
  roomPath(room);
  if (password && (password.length < 8 || password.length > 64)) throw new Error('Mật khẩu phòng không đúng.');
  try {
    if (password) {
      try {
        await set(ref(db, `roomAccess/${room.code}/${uid}`), await roomPasswordHash(room.code, password));
      } catch (error) {
        // Previously created rooms use a 16–64 character token, not a digest.
        if (password.length < 16 || !/permission[\s_-]denied/i.test(String(error))) throw error;
        await set(ref(db, `roomAccess/${room.code}/${uid}`), password);
      }
    }
    await update(ref(db, `${roomPath(room)}/members/${uid}`), member(profile));
  } catch (error) {
    if (/permission[\s_-]denied/i.test(String(error))) throw new Error('Sai mã hoặc mật khẩu phòng, hoặc bạn chưa được cấp quyền.');
    throw new Error(humanError(error));
  }
}

export function subscribeRoom(room: RoomRef, callbacks: { members: (value: Record<string, Member>) => void; messages: (value: Message[]) => void; error?: (message: string) => void }) {
  const { db } = requireConnection();
  const fail = (error: Error) => callbacks.error?.(humanError(error));
  const path = roomPath(room);
  const stopMembers = onValue(ref(db, `${path}/members`), snapshot => callbacks.members(snapshot.val() || {}), fail);
  const stopMessages = onValue(query(ref(db, `${path}/messages`), limitToLast(150)), snapshot => callbacks.messages(messages(snapshot)), fail);
  return () => { stopMembers(); stopMessages(); };
}

const ROOM_PRESENCE_MAX_AGE = 90_000;

/** Membership is persistent access; presence is one disposable record per connected tab. */
export function trackRoomPresence(room: RoomRef, onError: (message: string) => void) {
  const { db, uid } = requireConnection();
  const session = push(ref(db, `roomPresence/${roomPath(room)}/${uid}`));
  let disposed = false;
  let timer: ReturnType<typeof setInterval> | undefined;
  let queue: Promise<void> = Promise.resolve();
  const enqueue = (operation: () => Promise<void>) => {
    const pending = queue.then(operation, operation);
    queue = pending.catch(() => undefined);
    return pending;
  };
  const fail = (error: unknown) => { if (!disposed) onError(humanError(error)); };
  void enqueue(async () => {
    if (disposed) return;
    await onDisconnect(session).remove();
    if (disposed) return;
    await set(session, serverTimestamp());
    if (disposed) return;
    timer = setInterval(() => {
      if (!connected || disposed) return;
      void enqueue(async () => {
        if (!disposed) await set(session, serverTimestamp());
      }).catch(fail);
    }, 30_000);
  }).catch(fail);
  return () => {
    disposed = true;
    if (timer) clearInterval(timer);
    void enqueue(async () => {
      await remove(session);
      await onDisconnect(session).cancel();
    }).catch(() => undefined);
  };
}

export function subscribeRoomPresence(room: RoomRef, callback: (uids: string[]) => void, onError: (message: string) => void) {
  const { db } = requireConnection();
  let sessions: Record<string, Record<string, number>> = {};
  let failed = false;
  const emit = () => {
    if (!failed) callback(Object.entries(sessions).filter(([, tabs]) =>
      Object.values(tabs).some(at => typeof at === 'number' && at > serverNow() - ROOM_PRESENCE_MAX_AGE)
    ).map(([uid]) => uid));
  };
  const stop = onValue(ref(db, `roomPresence/${roomPath(room)}`), snapshot => {
    sessions = snapshot.val() || {};
    failed = false;
    emit();
  }, error => { failed = true; onError(humanError(error)); });
  const timer = setInterval(emit, 5_000);
  return () => { stop(); clearInterval(timer); };
}

export async function getRoomMeta(room: RoomRef): Promise<RoomMeta> {
  const { db } = requireConnection();
  return (await get(ref(db, `${roomPath(room)}/meta`))).val() as RoomMeta;
}

export function subscribeOpenRooms(callback: (value: OpenRoom[]) => void, onError: (message: string) => void) {
  const { db } = requireConnection();
  let current: OpenRoom[] = [];
  const emit = () => callback(current.filter(item => item.updatedAt > serverNow() - PRESENCE_MAX_AGE).sort((a, b) => b.updatedAt - a.updatedAt || a.code.localeCompare(b.code)));
  const stop = onValue(query(ref(db, 'roomLobby'), orderByChild('updatedAt'), limitToLast(60)), snapshot => {
    current = Object.values(snapshot.val() || {}) as OpenRoom[];
    emit();
  }, error => { current = []; callback([]); onError(humanError(error)); });
  const timer = setInterval(emit, 15_000);
  return () => { stop(); clearInterval(timer); };
}

let roomListingEpoch = 0;
let roomListingQueue: Promise<void> = Promise.resolve();
function queueRoomListing(operation: () => Promise<void>) {
  const pending = roomListingQueue.then(operation, operation);
  roomListingQueue = pending.catch(() => undefined);
  return pending;
}

/** Publish only an opted-in host's active room; never expose the room's contents. */
export function trackOpenRoom(room: RoomRef, profile: Profile, onError: (message: string) => void) {
  const { db, uid } = requireConnection();
  const epoch = ++roomListingEpoch;
  const node = ref(db, `roomLobby/${uid}`);
  let registered = false;
  let disposed = false;
  let timer: ReturnType<typeof setInterval> | undefined;
  const fail = (error: unknown) => { if (!disposed) onError(humanError(error)); };
  void queueRoomListing(async () => {
    if (disposed || epoch !== roomListingEpoch || room.kind !== 'rooms') return;
    const meta = await getRoomMeta(room);
    if (disposed || epoch !== roomListingEpoch || meta.hostUid !== uid || meta.listed !== true) return;
    const avatar = await chatAvatar(profile.avatar);
    if (disposed || epoch !== roomListingEpoch) return;
    registered = true;
    await onDisconnect(node).remove();
    if (disposed || epoch !== roomListingEpoch) return;
    const listing = { hostUid: uid, code: room.code, hostName: cleanName(profile), avatar, locked: meta.passwordless !== true };
    await set(node, { ...listing, updatedAt: serverTimestamp() });
    if (disposed || epoch !== roomListingEpoch) return;
    timer = setInterval(() => {
      if (!connected || disposed) return;
      void queueRoomListing(async () => {
        if (!disposed && epoch === roomListingEpoch) await set(node, { ...listing, updatedAt: serverTimestamp() });
      }).catch(fail);
    }, 45_000);
  }).catch(fail);
  return () => {
    disposed = true;
    if (epoch === roomListingEpoch) roomListingEpoch++;
    if (timer) clearInterval(timer);
    if (registered) void queueRoomListing(async () => {
      await remove(node);
      await onDisconnect(node).cancel();
    }).catch(() => undefined);
  };
}

export async function updateRoomProfile(room: RoomRef, profile: Profile) {
  const { db, uid } = requireConnection();
  await update(ref(db, `${roomPath(room)}/members/${uid}`), { name: cleanName(profile), avatar: validAvatar(profile.avatar) });
}

/** Recover legacy passwords only; new custom passwords are stored as digests. */
export async function getOwnerPassword(code: string): Promise<string | null> {
  const { db } = requireConnection();
  const normalized = code.trim().toUpperCase();
  roomPath({ kind: 'rooms', code: normalized });
  try {
    const meta = await getRoomMeta({ kind: 'rooms', code: normalized });
    if (meta.passwordFormat === 'sha256' || meta.passwordless) return null;
    const snapshot = await get(ref(db, `roomPasswords/${normalized}`));
    return typeof snapshot.val() === 'string' ? snapshot.val() : null;
  } catch (error) {
    if (/permission[\s_-]denied/i.test(String(error))) return null;
    throw new Error(humanError(error));
  }
}

async function makeMessage(profile: Profile, text: string, maxLength: number, sticker?: string) {
  const { uid } = requireConnection();
  const clean = text.trim();
  if (!clean || clean.length > maxLength) throw new Error(`Tin nhắn cần từ 1 đến ${maxLength} ký tự.`);
  if (sticker && (sticker.length > STICKER_MAX_LENGTH || !/^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(sticker))) throw new Error('Sticker không hợp lệ hoặc quá lớn.');
  return { uid, name: cleanName(profile), text: clean, at: serverTimestamp(), avatar: await chatAvatar(profile.avatar), ...(sticker ? { sticker } : {}) };
}

export async function sendMessage(room: RoomRef, profile: Profile, text: string, sticker?: string) {
  const { db } = requireConnection();
  const payload = await makeMessage(profile, text, 500, sticker);
  try { await push(ref(db, `${roomPath(room)}/messages`), payload); }
  catch (error) { throw new Error(humanError(error)); }
}

export function subscribeGlobalChat(callback: (value: Message[]) => void, error?: (message: string) => void) {
  const { db } = requireConnection();
  return onValue(query(ref(db, 'globalChat/messages'), orderByKey(), limitToLast(35)), snapshot => callback(messages(snapshot)), reason => error?.(humanError(reason)));
}

export async function sendGlobalMessage(profile: Profile, text: string, sticker?: string) {
  const { db } = requireConnection();
  if (sendingGlobal || Date.now() - lastGlobalSend < 1800) throw new Error('Chờ một chút trước khi gửi tin tiếp theo nhé.');
  sendingGlobal = true;
  try {
    const payload = await makeMessage(profile, text, 400, sticker);
    await push(ref(db, 'globalChat/messages'), payload);
    lastGlobalSend = Date.now();
  } catch (error) { throw new Error(humanError(error)); }
  finally { sendingGlobal = false; }
}

function publicAvatar(profile: Profile) { return validAvatar(profile.avatar, false); }

function queuePresence(operation: () => Promise<void>) {
  const pending = presenceQueue.then(operation, operation);
  // Serialize writes, reconnect registration and heartbeats. A late enable must never
  // overwrite a newer disable, and a failed request must not poison subsequent toggles.
  presenceQueue = pending.catch(() => undefined);
  return pending;
}

async function publishPresence(epoch: number) {
  const { db, uid } = requireConnection();
  if (!presenceProfile || epoch !== presenceEpoch) return;
  const profile = presenceProfile;
  const node = ref(db, `matchLounge/${uid}`);
  await onDisconnect(node).remove();
  if (!presenceProfile || epoch !== presenceEpoch) return;
  await set(node, { uid, name: cleanName(profile), bio: (profile.bio || 'Đang tìm một người để trò chuyện').slice(0, 100), avatar: publicAvatar(profile), status: 'available', joinedAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function setPresence(profile: Profile, enabled: boolean) {
  const { db, uid } = requireConnection();
  const epoch = ++presenceEpoch;
  if (presenceTimer) { clearInterval(presenceTimer); presenceTimer = null; }
  presenceProfile = enabled ? profile : null;
  const node = ref(db, `matchLounge/${uid}`);
  try {
    await queuePresence(async () => {
      if (epoch !== presenceEpoch) return;
      if (!enabled) { await remove(node); await onDisconnect(node).cancel(); return; }
      await publishPresence(epoch);
      if (epoch !== presenceEpoch || !presenceProfile) return;
      presenceTimer = setInterval(() => {
        if (presenceProfile && connected) void queuePresence(async () => {
          if (presenceProfile && connected && epoch === presenceEpoch) await update(node, { updatedAt: serverTimestamp() });
        }).catch(reportError);
      }, 45_000);
    });
  } catch (error) { if (epoch === presenceEpoch) presenceProfile = null; throw new Error(humanError(error)); }
}

export function subscribePeople(callback: (value: Person[]) => void) {
  const { db } = requireConnection();
  let current: Person[] = [];
  const emit = () => callback(current.filter(person => person.uid !== getUid() && person.status === 'available' && person.updatedAt > serverNow() - PRESENCE_MAX_AGE));
  const stop = onValue(query(ref(db, 'matchLounge'), orderByChild('updatedAt'), limitToLast(120)), snapshot => {
    current = Object.values(snapshot.val() || {}) as Person[];
    emit();
  }, reportError);
  const timer = setInterval(emit, 15_000);
  return () => { stop(); clearInterval(timer); };
}

export function subscribeInvites(callback: (value: Invite[]) => void) {
  const { db, uid } = requireConnection();
  return onValue(ref(db, `matchInvites/${uid}`), snapshot => {
    callback((Object.values(snapshot.val() || {}) as Invite[]).filter(invite => invite?.toUid === uid).sort((a, b) => b.createdAt - a.createdAt));
  }, reportError);
}

function outgoingStorageKey() { return `moonlight-outgoing:${window.APP_CONFIG?.firebase?.projectId}:${getUid()}`; }
function readOutgoingTargets(): string[] {
  const key = outgoingStorageKey();
  const targets = outgoingMemory.get(key) || new Set<string>();
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || '[]');
    if (Array.isArray(value)) for (const item of value) if (typeof item === 'string') targets.add(item);
  } catch { /* In-memory subscriptions remain available when browser storage is unavailable. */ }
  outgoingMemory.set(key, targets);
  return [...targets].slice(-100);
}
function rememberOutgoing(target: string, keep: boolean) {
  const targets = new Set(readOutgoingTargets());
  if (keep) targets.add(target); else targets.delete(target);
  outgoingMemory.set(outgoingStorageKey(), targets);
  try { localStorage.setItem(outgoingStorageKey(), JSON.stringify([...targets].slice(-100))); } catch { /* The active subscription can still work if browser storage is full. */ }
  for (const refresh of outgoingChanged) refresh();
}

export async function sendInvite(person: Person, profile: Profile) {
  const { db, uid } = requireConnection();
  if (!presenceProfile) throw new Error('Bật tìm đôi trước khi gửi lời mời.');
  if (person.uid === uid || !person.uid || /[.#$\[\]/]/.test(person.uid)) throw new Error('Người nhận không hợp lệ.');
  if (person.status !== 'available' || person.updatedAt <= serverNow() - PRESENCE_MAX_AGE) throw new Error('Người ấy đã tạm ngừng tìm đôi.');
  const payload: Invite = { fromUid: uid, toUid: person.uid, fromName: cleanName(profile), fromAvatar: publicAvatar(profile), status: 'pending', roomCode: randomCode(8), createdAt: serverNow() };
  const result = await runTransaction(ref(db, `matchInvites/${person.uid}/${uid}`), current => current?.status === 'pending' ? undefined : payload, { applyLocally: false });
  if (!result.committed) throw new Error('Bạn đã có lời mời đang chờ người này phản hồi.');
  rememberOutgoing(person.uid, true);
}

export function subscribeOutgoing(callback: (value: Invite[]) => void) {
  const { db, uid } = requireConnection();
  const records = new Map<string, Invite>();
  const stops = new Map<string, () => void>();
  const emit = () => callback([...records.values()].sort((a, b) => b.createdAt - a.createdAt));
  const refresh = () => {
    const targets = new Set(readOutgoingTargets());
    for (const [target, stop] of stops) if (!targets.has(target)) { stop(); stops.delete(target); records.delete(target); }
    for (const target of targets) if (!stops.has(target)) {
      stops.set(target, onValue(ref(db, `matchInvites/${target}/${uid}`), snapshot => {
        const invite = snapshot.val() as Invite | null;
        if (invite?.fromUid === uid) records.set(target, invite); else records.delete(target);
        emit();
      }, reportError));
    }
    emit();
  };
  outgoingChanged.add(refresh);
  const storageChanged = (event: StorageEvent) => {
    if (event.key === outgoingStorageKey()) { outgoingMemory.delete(outgoingStorageKey()); refresh(); }
  };
  window.addEventListener('storage', storageChanged);
  refresh();
  return () => { outgoingChanged.delete(refresh); window.removeEventListener('storage', storageChanged); for (const stop of stops.values()) stop(); };
}

export async function withdrawInvite(toUid: string) {
  const { db, uid } = requireConnection();
  if (!toUid || /[.#$\[\]/]/.test(toUid)) throw new Error('Người nhận không hợp lệ.');
  await remove(ref(db, `matchInvites/${toUid}/${uid}`));
  rememberOutgoing(toUid, false);
}

export async function respondInvite(invite: Invite, accept: boolean, profile: Profile): Promise<RoomRef | null> {
  const { db, uid } = requireConnection();
  if (invite.toUid !== uid || !invite.fromUid || /[.#$\[\]/]/.test(invite.fromUid)) throw new Error('Lời mời không thuộc tài khoản này.');
  const node = ref(db, `matchInvites/${uid}/${invite.fromUid}`);
  const snapshot = await get(node);
  const latest = snapshot.val() as Invite | null;
  if (!latest || latest.status !== 'pending' || latest.roomCode !== invite.roomCode) throw new Error('Lời mời đã hết hiệu lực.');
  if (accept) {
    if (latest.createdAt <= serverNow() - 86_400_000) throw new Error('Lời mời đã hết hạn.');
    const selected: RoomRef = { kind: 'selectedRooms', code: latest.roomCode };
    const selectedNode = ref(db, roomPath(selected));
    try {
      await set(selectedNode, {
        meta: { hostUid: uid, guestUid: latest.fromUid, createdAt: serverNow() },
        members: { [uid]: member(profile), [latest.fromUid]: { name: latest.fromName, avatar: latest.fromAvatar, joinedAt: latest.createdAt } },
      });
    } catch (error) {
      let existing: { hostUid?: string; guestUid?: string } | null = null;
      try { existing = (await get(ref(db, `${roomPath(selected)}/meta`))).val(); } catch { /* Preserve the creation error when the room is not readable. */ }
      if (existing?.hostUid !== uid || existing.guestUid !== latest.fromUid) throw new Error(humanError(error));
    }
  }
  // A transaction can first run with an empty local cache. The server retries a stale proposal
  // against its actual value, so the checked snapshot is a safe initial proposal.
  const result = await runTransaction(node, current => {
    const candidate = current ?? latest;
    return candidate.status === 'pending' && candidate.roomCode === latest.roomCode ? { ...candidate, status: accept ? 'accepted' : 'declined' } : undefined;
  }, { applyLocally: false });
  if (!result.committed) throw new Error('Người ấy đã thu hồi hoặc phản hồi lời mời này.');
  if (!accept) return null;
  await setPresence(profile, false);
  return { kind: 'selectedRooms', code: latest.roomCode };
}

export function subscribeGame(room: RoomRef, game: 'truth' | 'xo', callback: (value: any) => void, error?: (message: string) => void) {
  const { db } = requireConnection();
  return onValue(ref(db, `coupleGames/${roomPath(room)}/${game}`), snapshot => callback(snapshot.val()), reason => error?.(humanError(reason)));
}

export async function transactGame(room: RoomRef, game: 'truth' | 'xo', mutator: (value: any) => any): Promise<boolean> {
  const { db } = requireConnection();
  const result = await runTransaction(ref(db, `coupleGames/${roomPath(room)}/${game}`), current => mutator(current), { applyLocally: false });
  return result.committed;
}

function supportUid(uid: string) {
  if (!uid || uid.length > 128 || /[.#$\[\]/]/.test(uid)) throw new Error('Cuộc trò chuyện không hợp lệ.');
  return uid;
}

export function subscribeSupportAdmin(callback: (admin: boolean) => void, onError: (message: string) => void) {
  const { db, uid } = requireConnection();
  return onValue(ref(db, `supportAdmins/${uid}`), snapshot => callback(snapshot.val() === true), error => onError(humanError(error)));
}

export function subscribeSupportMessages(userUid: string, callback: (value: SupportMessage[]) => void, onError: (message: string) => void) {
  const { db } = requireConnection();
  return onValue(query(ref(db, `supportMessages/${supportUid(userUid)}`), orderByChild('at'), limitToLast(100)), snapshot => {
    const values: SupportMessage[] = [];
    snapshot.forEach(child => { values.push({ ...child.val(), id: child.key! }); });
    callback(values.sort((a, b) => a.at - b.at || a.id.localeCompare(b.id)));
  }, error => onError(humanError(error)));
}

export function subscribeSupportInbox(callback: (value: SupportThread[]) => void, onError: (message: string) => void) {
  const { db } = requireConnection();
  return onValue(query(ref(db, 'supportThreads'), orderByChild('updatedAt'), limitToLast(50)), snapshot => {
    callback((Object.values(snapshot.val() || {}) as SupportThread[]).sort((a, b) => b.updatedAt - a.updatedAt || a.uid.localeCompare(b.uid)));
  }, error => onError(humanError(error)));
}

export function subscribeSupportThread(userUid: string, callback: (value: SupportThread | null) => void, onError: (message: string) => void) {
  const { db } = requireConnection();
  return onValue(ref(db, `supportThreads/${supportUid(userUid)}`), snapshot => callback(snapshot.val()), error => onError(humanError(error)));
}

export async function sendSupportMessage(userUid: string, profile: Profile, text: string, category: SupportCategory, asAdmin = false) {
  const { db, uid } = requireConnection();
  const target = supportUid(userUid), clean = text.trim();
  if (!clean || clean.length > 1500) throw new Error('Tin nhắn cần từ 1 đến 1500 ký tự.');
  if (!['help', 'bug', 'feature'].includes(category)) throw new Error('Chọn nội dung cần hỗ trợ.');
  try {
    const name = cleanName(profile);
    const previous = asAdmin ? (await get(ref(db, `supportThreads/${target}`))).val() as SupportThread | null : null;
    if (asAdmin && !previous) throw new Error('Cuộc trò chuyện này chưa có tin nhắn.');
    const id = push(ref(db, `supportMessages/${target}`)).key!;
    const sender = asAdmin ? 'admin' : 'user';
    const topic = previous?.category || category;
    // One commit keeps the private inbox preview and its append-only message consistent.
    await update(ref(db), {
      [`supportMessages/${target}/${id}`]: { uid, name, text: clean, category: topic, sender, at: serverTimestamp() },
      [`supportThreads/${target}`]: { uid: target, name: previous?.name || name, category: topic, lastSender: sender, lastText: clean, lastMessageId: id, updatedAt: serverTimestamp() },
    });
  } catch (error) { throw new Error(humanError(error)); }
}

export function subscribeHearts(callback: (enabled: boolean) => void) {
  const { db } = requireConnection();
  return onValue(ref(db, 'serverSettings/hearts'), snapshot => callback(snapshot.val() === true), reportError);
}

export async function setHearts(enabled: boolean) {
  const { db } = requireConnection();
  await set(ref(db, 'serverSettings/hearts'), enabled);
}

function walletDay() { return new Date(serverNow() + 7 * 3600_000).toISOString().slice(0, 10); }

export function subscribeWallet(callback: (wallet: Wallet) => void) {
  const { db, uid } = requireConnection();
  let day = walletDay();
  const listen = () => onValue(ref(db, `xoWallets/${uid}/${day}`), snapshot => callback(snapshot.val() || { total: 0, claims: {} }), reportError);
  let stop = listen();
  const timer = setInterval(() => { if (walletDay() !== day) { stop(); day = walletDay(); stop = listen(); } }, 30_000);
  return () => { stop(); clearInterval(timer); };
}

/** Legacy non-redeemable virtual coins. This client ledger is not an authoritative monetary balance. */
export async function claimVirtualReward(matchId: string): Promise<number> {
  const { db, uid } = requireConnection();
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(matchId)) throw new Error('Mã trận không hợp lệ.');
  const result = await runTransaction(ref(db, `xoWallets/${uid}/${walletDay()}`), current => {
    const wallet = (current || { total: 0, claims: {} }) as Wallet;
    if (wallet.claims?.[matchId]) return;
    const amount = (Number(wallet.total) || 0) < 25_000 ? 5000 : 0;
    return { total: (Number(wallet.total) || 0) + amount, claims: { ...wallet.claims, [matchId]: { amount, at: serverNow() } } };
  }, { applyLocally: false });
  return result.committed ? Number(result.snapshot.val()?.claims?.[matchId]?.amount || 0) : 0;
}
