import { before, after, beforeEach, test } from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';

let env;
const code = 'ABCD1234', pass = 'ABCDEFGHIJKLMNOP';
const db = uid => uid ? env.authenticatedContext(uid).database() : env.unauthenticatedContext().database();
const profile = uid => ({name: uid === 'alice' ? 'Alice' : 'Bobby', avatar:{kind:'emoji',value:'🥰'}, joinedAt:Date.now()});
const message = (uid = 'alice') => ({uid,name:'Alice',text:'Xin chào',at:Date.now(),avatar:{kind:'emoji',value:'🥰'}});
async function createRoom() {
  await db('alice').ref('rooms/'+code).set({meta:{hostUid:'alice',createdAt:Date.now()},members:{alice:profile('alice')}});
  await db('alice').ref('roomPasswords/'+code).set(pass);
}
async function joinRoom() {
  await db('bob').ref('roomAccess/'+code+'/bob').set(pass);
  await db('bob').ref('rooms/'+code+'/members/bob').set(profile('bob'));
}
const invite = () => ({fromUid:'alice',toUid:'bob',fromName:'Alice',fromAvatar:{kind:'emoji',value:'🥰'},status:'pending',roomCode:code,createdAt:Date.now()});
async function pendingInvite() {
  for (const uid of ['alice','bob']) await db(uid).ref('matchLounge/'+uid).set({uid,...profile(uid),bio:'Xin chào',status:'available',updatedAt:Date.now()});
  await db('alice').ref('matchInvites/bob/alice').set(invite());
}
const selectedRoom = () => ({meta:{hostUid:'bob',guestUid:'alice',createdAt:Date.now()},members:{alice:profile('alice'),bob:profile('bob')}});
const xo = () => ({roles:{X:'alice'},status:'waiting',turn:'X',score:{X:0,O:0},round:1,matchId:'testmatch1',winner:'',championUid:'',updatedAt:Date.now()});
const truth = () => ({phase:'waiting',round:1,players:{alice:{name:'Alice'}},chooser:'',responder:'',mode:'',prompt:'',answer:'',completed:false,note:'',updatedAt:Date.now()});
before(async () => {
  env = await initializeTestEnvironment({projectId:'demo-inlove-owned',database:{host:'127.0.0.1',port:9000,rules:readFileSync('database.rules.json','utf8')}});
});
beforeEach(async () => {await env.clearDatabase();});
after(async () => {await env?.cleanup();});

test('anonymous visitors cannot read data or create rooms', async () => {
  await assertFails(db().ref('/').once('value'));
  await assertFails(db().ref('globalChat/messages').push(message()));
  await assertFails(db().ref('rooms/'+code).set({meta:{hostUid:'alice',createdAt:Date.now()},members:{alice:profile('alice')}}));
});
test('room creator can create and read their room and password', async () => {
  await createRoom();
  await assertSucceeds(db('alice').ref('rooms/'+code).once('value'));
  await assertSucceeds(db('alice').ref('roomPasswords/'+code).once('value'));
});
test('outsiders cannot list rooms, read metadata, messages, or passwords', async () => {
  await createRoom();
  for (const path of ['rooms','rooms/'+code,'rooms/'+code+'/meta','rooms/'+code+'/members','rooms/'+code+'/messages','roomPasswords/'+code]) {
    await assertFails(db('eve').ref(path).once('value'));
  }
});
test('wrong password and direct membership bypass are denied', async () => {
  await createRoom();
  await assertFails(db('bob').ref('roomAccess/'+code+'/bob').set('WRONGPASSWORD1234'));
  await assertFails(db('bob').ref('rooms/'+code+'/members/bob').set(profile('bob')));
  await assertFails(db('eve').ref('roomAccess/'+code+'/bob').set(pass));
});
test('correct password grants own membership and two-way private chat', async () => {
  await createRoom(); await joinRoom();
  await assertSucceeds(db('bob').ref('rooms/'+code+'/messages').once('value'));
  await assertSucceeds(db('alice').ref('rooms/'+code+'/messages').push(message('alice')));
  await assertSucceeds(db('bob').ref('rooms/'+code+'/messages').push({...message('bob'),sticker:'data:image/png;base64,AAAA'}));
  await assertFails(db('bob').ref('roomPasswords/'+code).once('value'));
});
test('members cannot impersonate senders, edit existing messages, or change hosts', async () => {
  await createRoom(); await joinRoom();
  await assertFails(db('bob').ref('rooms/'+code+'/messages').push(message('alice')));
  const ref = await db('alice').ref('rooms/'+code+'/messages').push(message());
  await assertFails(ref.update({text:'Changed'}));
  await assertFails(db('bob').ref('rooms/'+code+'/meta/hostUid').set('bob'));
  await assertFails(db('bob').ref('rooms/'+code+'/members/alice/name').set('Fake'));
  await assertFails(db('bob').ref('rooms/'+code).remove());
});
test('global chat validates UID, message size, type, and timestamp', async () => {
  const messages = db('alice').ref('globalChat/messages');
  await assertSucceeds(messages.push(message()));
  for (const value of [message('bob'),{...message(),text:'x'.repeat(401)},{...message(),at:0},{...message(),admin:true},{...message(),sticker:'javascript:bad'}]) await assertFails(messages.push(value));
});
test('only own lobby profile can be written and removed', async () => {
  await pendingInvite();
  await assertSucceeds(db('bob').ref('matchLounge').orderByChild('updatedAt').limitToLast(50).once('value'));
  await assertSucceeds(db('alice').ref('matchLounge/alice').update({updatedAt:Date.now()}));
  await assertFails(db('bob').ref('matchLounge/alice').update({name:'Fake'}));
  await assertSucceeds(db('alice').ref('matchLounge/alice').remove());
});
test('invites are private, only sender creates, only recipient accepts', async () => {
  await pendingInvite();
  await assertSucceeds(db('bob').ref('matchInvites/bob').once('value'));
  await assertSucceeds(db('alice').ref('matchInvites/bob/alice').once('value'));
  await assertFails(db('eve').ref('matchInvites/bob').once('value'));
  await assertFails(db('alice').ref('matchInvites/bob/alice').update({status:'accepted'}));
  await assertFails(db('bob').ref('matchInvites/bob/alice').update({status:'accepted',fromUid:'eve'}));
  await db('bob').ref('selectedRooms/'+code).set(selectedRoom());
  await assertSucceeds(db('bob').ref('matchInvites/bob/alice').transaction(v=>({...v,status:'accepted'})));
});
test('selected room requires genuine pending invite and isolates both members', async () => {
  await pendingInvite();
  const room = {meta:{hostUid:'bob',guestUid:'alice',createdAt:Date.now()},members:{alice:profile('alice'),bob:profile('bob')}};
  await assertFails(db('eve').ref('selectedRooms/'+code).set(room));
  await assertFails(db('bob').ref('selectedRooms/ZZZZ9999').set(room));
  await assertSucceeds(db('bob').ref('selectedRooms/'+code).set(room));
  await assertSucceeds(db('alice').ref('selectedRooms/'+code+'/messages').push(message()));
  await assertFails(db('eve').ref('selectedRooms/'+code).once('value'));
  await assertFails(db('bob').ref('selectedRooms/'+code+'/members/eve').set(profile('bob')));
});
test('only room members access casual game state', async () => {
  await createRoom(); await joinRoom();
  const path = 'coupleGames/rooms/'+code+'/xo';
  const value = xo();
  await assertSucceeds(db('alice').ref(path).set(value));
  const bobGame=db('bob').ref(path);
  await bobGame.once('value');
  // RTDB may first invoke a transaction with an empty local cache, then retry against the server.
  const result=await assertSucceeds(bobGame.transaction(v=>{const current=v||value;return {...current,roles:{...current.roles,O:'bob'},status:'playing',board:{0:'X'}}}));
  assert.equal(result.committed,true);
  await assertFails(db('eve').ref(path).once('value'));
  await assertFails(db('eve').ref(path).set(value));
  await assertFails(db('alice').ref('coupleGames/rooms/'+code+'/unknown').set(value));
});
test('acceptance requires an existing matching selected room', async () => {
  await pendingInvite();
  await assertFails(db('bob').ref('matchInvites/bob/alice').update({status:'accepted'}));
  await assertSucceeds(db('bob').ref('matchInvites/bob/alice').update({status:'declined'}));
});
test('forged future invite timestamps and expired invitations are denied', async () => {
  await pendingInvite();
  await db('alice').ref('matchInvites/bob/alice').remove();
  await assertFails(db('alice').ref('matchInvites/bob/alice').set({...invite(),createdAt:Date.now()+86400000}));
  await env.withSecurityRulesDisabled(async c=>{
    await c.database().ref('matchInvites/bob/alice').set({...invite(),createdAt:Date.now()-86400001});
  });
  await assertFails(db('bob').ref('selectedRooms/'+code).set(selectedRoom()));
});
test('inactive lobby profiles cannot be used to send invitations', async () => {
  await pendingInvite();
  await db('alice').ref('matchInvites/bob/alice').remove();
  await env.withSecurityRulesDisabled(async c=>{await c.database().ref('matchLounge/bob/updatedAt').set(Date.now()-300000)});
  await assertFails(db('alice').ref('matchInvites/bob/alice').set(invite()));
});
test('XO rejects arbitrary fields, invalid cells, outsiders and corrupt scores', async () => {
  await createRoom();await joinRoom();
  const game=db('alice').ref('coupleGames/rooms/'+code+'/xo');
  await game.set(xo());
  for(const patch of [{extra:'x'.repeat(10000)},{board:{225:'X'}},{board:{'-1':'O'}},{board:{'01':'X'}},{board:{0:'Z'}},{score:{X:999,O:0}},{roles:{X:'alice',O:'eve'}},{roles:{X:'alice',O:'alice'}},{updatedAt:Date.now()+86400000}])await assertFails(game.update(patch));
  await assertSucceeds(game.update({board:{224:'X'}}));
});
test('XO roles cannot be stolen, deleted or assigned on behalf of someone else', async () => {
  await createRoom();await joinRoom();
  const path='coupleGames/rooms/'+code+'/xo';
  await db('alice').ref(path).set(xo());
  await assertFails(db('bob').ref(path+'/roles/X').set('bob'));
  await assertFails(db('alice').ref(path+'/roles').remove());
  await assertFails(db('alice').ref(path+'/roles/O').set('bob'));
  await assertSucceeds(db('bob').ref(path+'/roles/O').set('bob'));
});
test('Truth rejects unknown fields, invalid phases, draws and outsiders', async () => {
  await createRoom();await joinRoom();
  const game=db('alice').ref('coupleGames/rooms/'+code+'/truth');
  await game.set(truth());
  for(const patch of [{extra:'bad'},{phase:'admin'},{round:0},{draws:{alice:14}},{players:{eve:{name:'Eve'}}},{prompt:'x'.repeat(401)},{completed:'yes'},{endRequest:{by:'eve',at:Date.now()}}])await assertFails(game.update(patch));
  await assertSucceeds(db('bob').ref('coupleGames/rooms/'+code+'/truth').update({players:{alice:{name:'Alice'},bob:{name:'Bobby'}},phase:'draw'}));
  await assertSucceeds(game.update({draws:{alice:13}}));
});
test('virtual wallets are private and bounded, hearts accept boolean only', async () => {
  const path = 'xoWallets/alice/2026-11-10';
  await assertSucceeds(db('alice').ref(path).set({total:5000,claims:{match1:{amount:5000,at:Date.now()}}}));
  await assertFails(db('bob').ref(path).once('value'));
  await assertFails(db('bob').ref(path).set({total:5000,claims:{}}));
  await assertFails(db('alice').ref(path).update({total:30000}));
  await assertSucceeds(db('alice').ref('serverSettings/hearts').set(true));
  await assertFails(db('alice').ref('serverSettings/hearts').set('yes'));
});
