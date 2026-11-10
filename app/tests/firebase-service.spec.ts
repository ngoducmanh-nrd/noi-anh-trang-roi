import { test, expect, type BrowserContext, type Page } from '@playwright/test';

const emulatorConfig = {
  firebase: {
    apiKey: 'demo-api-key',
    authDomain: 'demo-inlove-owned.firebaseapp.com',
    databaseURL: 'https://demo-inlove-owned-default-rtdb.firebaseio.com',
    projectId: 'demo-inlove-owned',
    appId: '1:123:web:demo',
  },
  emulators: true,
  site: { MINIGAMES: [], CONTACTS: {}, DONATE_QR_IMAGE: '', MUSIC_URL: '' },
};

async function boot(context: BrowserContext, name: string) {
  // Refuse any accidental live auth/database traffic, even if the configuration route regresses.
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname.endsWith('firebaseio.com') || url.hostname.endsWith('firebasedatabase.app') || url.hostname.endsWith('googleapis.com')) return route.abort('blockedbyclient');
    if (url.pathname === '/app-config.js') return route.fulfill({ contentType: 'application/javascript', body: `window.APP_CONFIG=${JSON.stringify(emulatorConfig)}` });
    return route.continue();
  });
  const page = await context.newPage();
  await page.goto('/');
  await page.evaluate(async name => {
    // Vite serves this TypeScript module to the browser; the spec itself is run in Node.
    // @ts-expect-error Browser-only Vite URL.
    const service = await import('/src/lib/firebase.ts');
    const state = window as any;
    state.__profile = { name, bio: 'Kiểm thử dịch vụ', avatar: { kind: 'emoji', value: '🌙' } };
    state.__connection = null;
    state.__stopConnection = service.onConnection((value: unknown) => { state.__connection = value; });
    await service.initializeConnection();
  }, name);
  await page.waitForFunction(() => (window as any).__connection?.ready === true);
  return page;
}

async function observeRoom(page: Page, room: { code: string; kind: 'rooms' | 'selectedRooms' }) {
  await page.evaluate(async room => {
    // @ts-expect-error Browser-only Vite URL.
    const service = await import('/src/lib/firebase.ts');
    const state = window as any;
    state.__room = room;
    state.__members = {};
    state.__messages = [];
    state.__errors = [];
    state.__messageCalls = 0;
    state.__stopRoom = service.subscribeRoom(room, {
      members: (value: unknown) => { state.__members = value; },
      messages: (value: unknown) => { state.__messages = value; state.__messageCalls++; },
      error: (value: unknown) => { state.__errors.push(value); },
    });
  }, room);
}

test('independent users preserve room schema, private access, owner password and subscription cleanup', async ({ browser }) => {
  const contexts = await Promise.all([browser.newContext(), browser.newContext(), browser.newContext()]);
  try {
    const [alice, bob, outsider] = await Promise.all(contexts.map((context, i) => boot(context, `Service ${['Alice', 'Bobby', 'Eve'][i]}`)));
    const aliceUid = await alice.evaluate(() => (window as any).__connection.uid);
    const bobUid = await bob.evaluate(() => (window as any).__connection.uid);
    expect(aliceUid).not.toBe(bobUid);
    const created = await alice.evaluate(async () => {
      // @ts-expect-error Browser-only Vite URL.
      const service = await import('/src/lib/firebase.ts');
      return service.createRoom((window as any).__profile);
    });
    const room = { code: created.code, kind: 'rooms' as const };
    const wrongPassword = await bob.evaluate(async code => {
      // @ts-expect-error Browser-only Vite URL.
      const service = await import('/src/lib/firebase.ts');
      try { await service.joinRoom(code, 'WRONGPASSWORD1234', (window as any).__profile); return false; } catch { return true; }
    }, room.code);
    expect(wrongPassword).toBe(true);
    await bob.evaluate(async created => {
      // @ts-expect-error Browser-only Vite URL.
      const service = await import('/src/lib/firebase.ts');
      await service.joinRoom(created.code, created.password, (window as any).__profile);
    }, created);
    await Promise.all([observeRoom(alice, room), observeRoom(bob, room), observeRoom(outsider, room)]);
    await alice.waitForFunction(() => Object.keys((window as any).__members).length === 2);
    await outsider.waitForFunction(() => (window as any).__errors.length > 0);
    const members = await alice.evaluate(() => (window as any).__members);
    expect(members[aliceUid]).toMatchObject({ name: 'Service Alice', avatar: { kind: 'emoji', value: '🌙' } });
    expect(typeof members[bobUid].joinedAt).toBe('number');
    expect(await outsider.evaluate(() => Object.keys((window as any).__members))).toHaveLength(0);
    expect(await outsider.evaluate(() => (window as any).__messages)).toHaveLength(0);
    const passwords = await Promise.all([alice, bob, outsider].map(page => page.evaluate(async code => {
      // @ts-expect-error Browser-only Vite URL.
      return (await import('/src/lib/firebase.ts')).getOwnerPassword(code);
    }, room.code)));
    expect(passwords).toEqual([created.password, null, null]);
    for (const [page, text] of [[alice, 'Dịch vụ Alice gửi'], [bob, 'Dịch vụ Bobby gửi']] as const) {
      await page.evaluate(async text => {
        // @ts-expect-error Browser-only Vite URL.
        const service = await import('/src/lib/firebase.ts');
        await service.sendMessage((window as any).__room, (window as any).__profile, text);
      }, text);
    }
    await alice.waitForFunction(() => (window as any).__messages.length === 2);
    await bob.waitForFunction(() => (window as any).__messages.length === 2);
    const messages = await bob.evaluate(() => (window as any).__messages);
    expect(messages.map((item: any) => item.uid).sort()).toEqual([aliceUid, bobUid].sort());
    expect(messages.every((item: any) => typeof item.at === 'number' && typeof item.id === 'string')).toBe(true);
    const calls = await bob.evaluate(() => { (window as any).__stopRoom(); return (window as any).__messageCalls; });
    await alice.evaluate(async () => {
      // @ts-expect-error Browser-only Vite URL.
      await (await import('/src/lib/firebase.ts')).sendMessage((window as any).__room, (window as any).__profile, 'Sau khi hủy đăng ký');
    });
    await alice.waitForFunction(() => (window as any).__messages.length === 3);
    // Give an erroneous still-active listener an event-loop turn after the server acknowledgement.
    await expect.poll(() => bob.evaluate(() => (window as any).__messageCalls)).toBe(calls);
    await alice.reload();
    await alice.evaluate(async () => {
      // Wait for auth persistence restoration, not just a transient cached currentUser.
      // @ts-expect-error Browser-only Vite URL.
      await (await import('/src/lib/firebase.ts')).initializeConnection();
    });
    const restored = await alice.evaluate(async code => {
      // @ts-expect-error Browser-only Vite URL.
      const service = await import('/src/lib/firebase.ts');
      return { uid: service.getUid(), password: await service.getOwnerPassword(code) };
    }, room.code);
    expect(restored).toEqual({ uid: aliceUid, password: created.password });
  } finally { await Promise.all(contexts.map(context => context.close())); }
});

test('large profile avatars are retained for membership and compressed for chat', async ({ browser }) => {
  const context = await browser.newContext();
  try {
    const page = await boot(context, 'Service Avatar');
    const result = await page.evaluate(async () => {
      // @ts-expect-error Browser-only Vite URL.
      const service = await import('/src/lib/firebase.ts');
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 240;
      const ctx = canvas.getContext('2d')!;
      const pixels = ctx.createImageData(240, 240);
      for (let i = 0; i < pixels.data.length; i += 4) { pixels.data[i] = (i * 31) % 256; pixels.data[i + 1] = Math.floor(i / 29) % 256; pixels.data[i + 2] = Math.floor(i / 503) % 256; pixels.data[i + 3] = 255; }
      ctx.putImageData(pixels, 0, 0);
      const avatar = canvas.toDataURL('image/png');
      const profile = { ...(window as any).__profile, avatar: { kind: 'data', value: avatar } };
      const { code } = await service.createRoom(profile);
      (window as any).__avatarLength = avatar.length;
      (window as any).__profile = profile;
      (window as any).__room = { code, kind: 'rooms' };
      return { code, length: avatar.length };
    });
    expect(result.length).toBeGreaterThan(12_000);
    expect(result.length).toBeLessThan(250_000);
    await observeRoom(page, { code: result.code, kind: 'rooms' });
    await page.evaluate(async () => {
      // @ts-expect-error Browser-only Vite URL.
      await (await import('/src/lib/firebase.ts')).sendMessage((window as any).__room, (window as any).__profile, 'Ảnh đại diện trong chat');
    });
    await page.waitForFunction(() => (window as any).__messages.length === 1);
    const avatarResult = await page.evaluate(() => {
      const state = window as any;
      return { memberLength: state.__members[state.__connection.uid].avatar.value.length, messageAvatar: state.__messages[0].avatar };
    });
    expect(avatarResult.memberLength).toBe(result.length);
    expect(avatarResult.messageAvatar.kind).toBe('data');
    expect(avatarResult.messageAvatar.value.length).toBeLessThanOrEqual(12_000);
  } finally { await context.close(); }
});

test('presence toggles serialize and invitations create a private selected room before acceptance', async ({ browser }) => {
  const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
  try {
    const [alice, bob] = await Promise.all(contexts.map((context, i) => boot(context, `Invite ${i === 0 ? 'Alice' : 'Bobby'}`)));
    for (const page of [alice, bob]) await page.evaluate(async () => {
      // @ts-expect-error Browser-only Vite URL.
      const service = await import('/src/lib/firebase.ts');
      const state = window as any;
      state.__people = []; state.__invites = []; state.__outgoing = [];
      state.__stopPeople = service.subscribePeople((value: unknown) => { state.__people = value; });
      state.__stopInvites = service.subscribeInvites((value: unknown) => { state.__invites = value; });
      state.__stopOutgoing = service.subscribeOutgoing((value: unknown) => { state.__outgoing = value; });
      await service.setPresence(state.__profile, true);
    });
    const bobUid = await bob.evaluate(() => (window as any).__connection.uid);
    await alice.waitForFunction(uid => (window as any).__people.some((person: any) => person.uid === uid), bobUid);
    await alice.evaluate(async uid => {
      // @ts-expect-error Browser-only Vite URL.
      const service = await import('/src/lib/firebase.ts');
      await service.sendInvite((window as any).__people.find((person: any) => person.uid === uid), (window as any).__profile);
    }, bobUid);
    await bob.waitForFunction(() => (window as any).__invites.some((invite: any) => invite.status === 'pending'));
    const selected = await bob.evaluate(async () => {
      // @ts-expect-error Browser-only Vite URL.
      return (await import('/src/lib/firebase.ts')).respondInvite((window as any).__invites.find((invite: any) => invite.status === 'pending'), true, (window as any).__profile);
    });
    expect(selected?.kind).toBe('selectedRooms');
    await alice.waitForFunction(() => (window as any).__outgoing.some((invite: any) => invite.status === 'accepted'));
    await Promise.all([observeRoom(alice, selected!), observeRoom(bob, selected!)]);
    await alice.waitForFunction(() => Object.keys((window as any).__members).length === 2);
    await alice.evaluate(async () => {
      // @ts-expect-error Browser-only Vite URL.
      await (await import('/src/lib/firebase.ts')).sendMessage((window as any).__room, (window as any).__profile, 'Phòng ghép đôi đã sẵn sàng');
    });
    await bob.waitForFunction(() => (window as any).__messages.some((message: any) => message.text === 'Phòng ghép đôi đã sẵn sàng'));
    await bob.evaluate(async () => {
      // @ts-expect-error Browser-only Vite URL.
      const service = await import('/src/lib/firebase.ts');
      const profile = (window as any).__profile;
      await Promise.all([service.setPresence(profile, true), service.setPresence(profile, false), service.setPresence(profile, true), service.setPresence(profile, false)]);
    });
    await alice.waitForFunction(uid => !(window as any).__people.some((person: any) => person.uid === uid), bobUid);
    await alice.evaluate(async () => {
      // @ts-expect-error Browser-only Vite URL.
      const service = await import('/src/lib/firebase.ts');
      await service.setPresence((window as any).__profile, false);
    });
  } finally { await Promise.all(contexts.map(context => context.close())); }
});
