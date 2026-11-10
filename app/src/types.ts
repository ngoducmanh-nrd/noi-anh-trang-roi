export interface Avatar {
  kind: 'emoji' | 'url' | 'data';
  value: string;
}

export interface Profile {
  name: string;
  avatar: Avatar;
  bio: string;
  birthday?: string;
  relationship?: string;
}

export interface Member {
  name: string;
  avatar: Avatar;
  joinedAt: number;
}

export interface RoomRef {
  code: string;
  kind: 'rooms' | 'selectedRooms';
}

export interface OpenRoom {
  hostUid: string;
  code: string;
  hostName: string;
  avatar?: Avatar;
  locked: boolean;
  updatedAt: number;
}

export interface RoomMeta {
  hostUid: string;
  createdAt: number;
  passwordless?: boolean;
  passwordFormat?: 'sha256';
  listed?: boolean;
}

export interface Message {
  id: string;
  uid: string;
  name: string;
  text: string;
  at: number;
  avatar?: Avatar;
  sticker?: string;
}

export interface Person {
  uid: string;
  name: string;
  bio: string;
  avatar: Avatar;
  status: string;
  updatedAt: number;
}

export interface Invite {
  fromUid: string;
  toUid: string;
  fromName: string;
  fromAvatar: Avatar;
  status: 'pending' | 'accepted' | 'declined';
  roomCode: string;
  createdAt: number;
}

export interface ConnectionState {
  uid: string | null;
  ready: boolean;
  error: string | null;
}

export interface Wallet {
  total: number;
  claims: Record<string, { amount: number; at: number }>;
}

export interface AppConfig {
  firebase?: {
    apiKey?: string;
    authDomain?: string;
    databaseURL?: string;
    projectId?: string;
    appId?: string;
    storageBucket?: string;
    messagingSenderId?: string;
  };
  emulators?: boolean;
  site?: {
    MINIGAMES?: Array<{ name: string; emoji?: string; description?: string; url: string }>;
    CONTACTS?: Record<string, string>;
    DONATE_QR_IMAGE?: string;
    MUSIC_URL?: string;
  };
}

declare global {
  interface Window {
    APP_CONFIG?: AppConfig;
  }
}
