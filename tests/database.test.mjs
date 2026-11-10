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

const openRoom = () => ({meta:{hostUid:'alice',createdAt:Date.now(),passwordless:true,listed:true},members:{alice:profile('alice')}});
async function createListedRoom() {
  await db('alice').ref('rooms/'+code).set({meta:{hostUid:'alice',createdAt:Date.now(),listed:true,passwordFormat:'sha256'},members:{alice:profile('alice')}});
  await db('alice').ref('roomPasswords/'+code).set('a'.repeat(64));
}
const listing = (over = {}) => ({hostUid:'alice',code,hostName:'Alice',avatar:{kind:'emoji',value:'🥰'},locked:true,updatedAt:Date.now(),...over});
test('password-free room lets anyone with the code join, without a stored password', async () => {
  await assertSucceeds(db('alice').ref('rooms/'+code).set(openRoom()));
  await assertFails(db('bob').ref('rooms/'+code+'/members/alice').set(profile('alice')));
  await assertSucceeds(db('bob').ref('rooms/'+code+'/members/bob').set(profile('bob')));
  await assertSucceeds(db('bob').ref('rooms/'+code+'/messages').once('value'));
  await assertFails(db('eve').ref('rooms/'+code+'/messages').once('value'));
  await assertFails(db('eve').ref('rooms/'+code+'/members/bob').set(profile('bob')));
});
test('password rooms stay closed to a guest without the password, flag cannot be added later', async () => {
  await createRoom();
  await assertFails(db('bob').ref('rooms/'+code+'/members/bob').set(profile('bob')));
  await assertFails(db('alice').ref('rooms/'+code+'/meta/passwordless').set(true));
  await assertFails(db('bob').ref('rooms/'+code+'/meta/passwordless').set(true));
  await assertFails(db('alice').ref('rooms/'+code).set({meta:{hostUid:'alice',createdAt:Date.now(),passwordless:false},members:{alice:profile('alice')}}));
});
test('open room list is readable by signed-in users and locked matches the room', async () => {
  await createListedRoom();
  await assertSucceeds(db('alice').ref('roomLobby/alice').set(listing()));
  await assertSucceeds(db('bob').ref('roomLobby').orderByChild('updatedAt').limitToLast(30).once('value'));
  await assertFails(db().ref('roomLobby').once('value'));
  await assertFails(db('alice').ref('roomLobby/alice').set(listing({locked:false})));
  await env.clearDatabase();
  await assertSucceeds(db('alice').ref('rooms/'+code).set(openRoom()));
  await assertSucceeds(db('alice').ref('roomLobby/alice').set(listing({locked:false})));
  await assertFails(db('alice').ref('roomLobby/alice').set(listing({locked:true})));
});
test('only the host can list or unlist their own room, once per host', async () => {
  await createListedRoom();
  await assertFails(db('bob').ref('roomLobby/bob').set(listing({hostUid:'bob'})));
  await assertFails(db('bob').ref('roomLobby/alice').set(listing()));
  await assertFails(db('alice').ref('roomLobby/bob').set(listing()));
  await assertSucceeds(db('alice').ref('roomLobby/alice').set(listing()));
  await assertFails(db('bob').ref('roomLobby/alice').remove());
  await assertSucceeds(db('alice').ref('roomLobby/alice').remove());
});
test('room list entries reject forged fields, codes and timestamps', async () => {
  await createListedRoom();
  const entry = db('alice').ref('roomLobby/alice');
  for (const value of [listing({code:'ZZZZ9999'}),listing({code:'abc'}),listing({extra:'x'}),listing({hostName:'A'}),listing({updatedAt:0}),listing({updatedAt:Date.now()+86400000}),listing({avatar:{kind:'data',value:'data:image/png;base64,'+'A'.repeat(12001)}}),listing({locked:'yes'})]) await assertFails(entry.set(value));
  await assertSucceeds(entry.set(listing()));
});
test('legacy and unlisted rooms cannot be published and metadata cannot be downgraded', async () => {
  await createRoom();
  await assertFails(db('alice').ref('roomLobby/alice').set(listing()));
  await assertFails(db('alice').ref('rooms/'+code+'/meta/listed').set(true));
  await assertFails(db('alice').ref('rooms/'+code+'/meta/passwordFormat').set('sha256'));
  await env.clearDatabase();
  await db('alice').ref('rooms/'+code).set({meta:{hostUid:'alice',createdAt:Date.now(),listed:false},members:{alice:profile('alice')}});
  await assertFails(db('alice').ref('roomLobby/alice').set(listing()));
});

const sessionA = 'ABCDEFGHIJKLMNOPQRST', sessionB = 'QRSTUVWXYZABCDEFGHIJ';
const roomPresence = (uid, session = sessionA, kind = 'rooms') => `roomPresence/${kind}/${code}/${uid}/${session}`;
test('room presence is private to members and only the current user can publish their own session', async () => {
  await createRoom(); await joinRoom();
  await assertSucceeds(db('alice').ref(roomPresence('alice')).set(Date.now()));
  await assertSucceeds(db('bob').ref('roomPresence/rooms/'+code).once('value'));
  await assertFails(db('eve').ref('roomPresence/rooms/'+code).once('value'));
  await assertFails(db().ref('roomPresence/rooms/'+code).once('value'));
  await assertFails(db('alice').ref('roomPresence').once('value'));
  await assertFails(db('eve').ref(roomPresence('eve')).set(Date.now()));
  await assertFails(db('bob').ref(roomPresence('alice')).set(Date.now()));
  await assertFails(db('bob').ref(roomPresence('alice')).remove());
});
test('presence sessions reject forged kinds, timestamps, payloads and parent writes', async () => {
  await createRoom();
  const own = db('alice').ref(roomPresence('alice'));
  for (const value of [0,Date.now()+86400000,true,'online',{at:Date.now()}]) await assertFails(own.set(value));
  await assertFails(db('alice').ref(roomPresence('alice','bad')).set(Date.now()));
  await assertFails(db('alice').ref(roomPresence('alice',sessionA,'unknown')).set(Date.now()));
  await assertFails(db('alice').ref('roomPresence/rooms/'+code+'/alice').set({[sessionA]:Date.now()}));
  await assertSucceeds(own.set(Date.now()));
});
test('each tab can leave independently without deleting membership or chat access', async () => {
  await createRoom(); await joinRoom();
  const a = db('alice').ref(roomPresence('alice')), b = db('alice').ref(roomPresence('alice',sessionB));
  await assertSucceeds(a.set(Date.now()));
  await assertSucceeds(b.set(Date.now()));
  await assertSucceeds(a.remove());
  assert.equal((await db('bob').ref('roomPresence/rooms/'+code+'/alice').once('value')).numChildren(),1);
  await assertSucceeds(b.remove());
  assert.equal((await db('bob').ref('roomPresence/rooms/'+code+'/alice').once('value')).exists(),false);
  await assertSucceeds(db('alice').ref('rooms/'+code+'/messages').push(message()));
  assert.equal((await db('bob').ref('rooms/'+code+'/members').once('value')).numChildren(),2);
});
test('matched room presence uses the same membership boundary without altering the matched pair', async () => {
  await pendingInvite();
  await db('bob').ref('selectedRooms/'+code).set(selectedRoom());
  await assertSucceeds(db('alice').ref(roomPresence('alice',sessionA,'selectedRooms')).set(Date.now()));
  await assertSucceeds(db('bob').ref('roomPresence/selectedRooms/'+code).once('value'));
  await assertFails(db('eve').ref(roomPresence('eve',sessionA,'selectedRooms')).set(Date.now()));
  await assertFails(db('eve').ref('roomPresence/selectedRooms/'+code).once('value'));
  await assertSucceeds(db('alice').ref(roomPresence('alice',sessionA,'selectedRooms')).remove());
  assert.equal((await db('bob').ref('selectedRooms/'+code+'/members').once('value')).numChildren(),2);
});

const grantSupportAdmin = () => env.withSecurityRulesDisabled(c => c.database().ref('supportAdmins/admin').set(true));
function supportBatch(from = 'alice', target = 'alice', change = {}, previewChange = {}) {
  const id = db(from).ref('supportMessages/'+target).push().key;
  const value = {uid:from,name:from==='admin'?'Quản trị':'Alice',text:'Mình cần hỗ trợ.',at:Date.now(),sender:from==='admin'?'admin':'user',category:'help',...change};
  const preview = {uid:target,name:'Alice',updatedAt:value.at,lastMessageId:id,lastText:value.text,lastSender:value.sender,category:value.category,...previewChange};
  return {id,value,patch:{['supportMessages/'+target+'/'+id]:value,['supportThreads/'+target]:preview}};
}
test('support chat is private to its author and privileged support admins', async () => {
  const sent = supportBatch();
  await assertSucceeds(db('alice').ref().update(sent.patch));
  await assertSucceeds(db('alice').ref('supportMessages/alice').once('value'));
  await assertSucceeds(db('alice').ref('supportThreads/alice').once('value'));
  await assertFails(db('bob').ref('supportMessages/alice').once('value'));
  await assertFails(db('bob').ref('supportThreads/alice').once('value'));
  await assertFails(db().ref('supportMessages/alice').once('value'));
  await assertFails(db('alice').ref('supportThreads').once('value'));
  await grantSupportAdmin();
  await assertSucceeds(db('admin').ref('supportThreads').orderByChild('updatedAt').limitToLast(50).once('value'));
  await assertSucceeds(db('admin').ref('supportMessages/alice').once('value'));
});
test('support users cannot self-promote, impersonate admins or send into another users thread', async () => {
  await assertSucceeds(db('alice').ref('supportAdmins/alice').once('value'));
  await assertFails(db('alice').ref('supportAdmins/alice').set(true));
  await assertFails(db('alice').ref('supportAdmins').once('value'));
  await assertFails(db('alice').ref().update(supportBatch('alice','bob').patch));
  await assertFails(db('alice').ref().update(supportBatch('alice','alice',{sender:'admin'}).patch));
  await assertFails(db('alice').ref().update(supportBatch('alice','alice',{uid:'admin'}).patch));
  await assertFails(db().ref().update(supportBatch().patch));
});
test('support admins reply without acquiring room access or permission to grant admin roles', async () => {
  await db('alice').ref().update(supportBatch().patch);
  await grantSupportAdmin();
  const reply = supportBatch('admin');
  await assertSucceeds(db('admin').ref().update(reply.patch));
  assert.equal((await db('alice').ref('supportMessages/alice/'+reply.id+'/sender').once('value')).val(),'admin');
  await assertFails(db('admin').ref('supportAdmins/bob').set(true));
  await assertFails(db('admin').ref().update(supportBatch('admin','alice',{}, {name:'Fake'}).patch));
  await assertFails(db('admin').ref().update(supportBatch('admin','bob').patch));
  await createRoom();
  await assertFails(db('admin').ref('rooms/'+code).once('value'));
  await env.withSecurityRulesDisabled(c=>c.database().ref('supportAdmins/admin').remove());
  await assertFails(db('admin').ref('supportMessages/alice').once('value'));
  await assertFails(db('admin').ref().update(supportBatch('admin').patch));
});
test('support inbox previews and messages must be created together and cannot rewrite history', async () => {
  const first = supportBatch();
  await assertFails(db('alice').ref('supportMessages/alice/'+first.id).set(first.value));
  await assertFails(db('alice').ref('supportThreads/alice').set(first.patch['supportThreads/alice']));
  await assertFails(db('alice').ref().update(supportBatch('alice','alice',{}, {lastText:'Different'}).patch));
  await assertFails(db('alice').ref().update(supportBatch('alice','alice',{}, {lastMessageId:sessionA}).patch));
  await assertSucceeds(db('alice').ref().update(first.patch));
  await assertFails(db('alice').ref('supportMessages/alice/'+first.id+'/text').set('Changed'));
  await assertFails(db('alice').ref('supportMessages/alice/'+first.id).remove());
  await assertFails(db('alice').ref('supportThreads/alice').remove());
  await assertFails(db('alice').ref('supportThreads/alice/lastText').set('Forged'));
});
test('support chat validates message sizes, categories, timestamps and unrecognized fields', async () => {
  for (const change of [{text:''},{text:'x'.repeat(1501)},{at:0},{at:Date.now()+86400000},{category:'other'},{extra:true},{name:'A'}]) await assertFails(db('alice').ref().update(supportBatch('alice','alice',change).patch));
  await assertFails(db('alice').ref().update(supportBatch('alice','alice',{}, {extra:true}).patch));
  await assertSucceeds(db('alice').ref().update(supportBatch('alice','alice',{category:'bug'}).patch));
  await assertSucceeds(db('alice').ref().update(supportBatch('alice','alice',{category:'feature',text:'Mình muốn thêm tính năng.'}).patch));
});