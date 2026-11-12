// Docker development only. Compose mounts this over app/public/app-config.js.
window.APP_CONFIG = {
  firebase: {
    apiKey: 'demo-key',
    authDomain: 'demo-inlove-owned.firebaseapp.com',
    databaseURL: 'https://demo-inlove-owned-default-rtdb.firebaseio.com',
    projectId: 'demo-inlove-owned',
    appId: 'demo-inlove-owned'
  },
  emulators: true,
  site: {
    MINIGAMES: [],
    CONTACTS: { zalo: '', facebook: '', telegram: '' },
    DONATE_QR_IMAGE: '',
    MUSIC_URL: 'vendor/xfoolumm.mp3'
  }
};
