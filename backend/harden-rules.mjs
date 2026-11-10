// Backend-only transformation. Does not read or change any frontend file.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const path=fileURLToPath(new URL('../database.rules.json',import.meta.url));
const document=JSON.parse(readFileSync(path,'utf8'));
const rules=document.rules;
const validate=expression=>({'.validate':expression});
const string=max=>validate(`newData.isString() && newData.val().length <= ${max}`);
const integer=(min,max)=>validate(`newData.isNumber() && newData.val() % 1 === 0 && newData.val() >= ${min} && newData.val() <= ${max}`);
const oneOf=values=>validate(values.map(value=>`newData.val() === ${JSON.stringify(value)}`).join(' || '));
const timestamp=()=>validate('newData.isNumber() && newData.val() <= now + 60000 && (newData.val() === data.val() || newData.val() >= now - 300000)');

const invite=rules.matchInvites.$to.$from;
const validRoom="root.child('selectedRooms').child(data.child('roomCode').val())";
const immutable=['fromUid','toUid','fromName','fromAvatar/kind','fromAvatar/value','roomCode','createdAt'].map(k=>`newData.child('${k}').val() === data.child('${k}').val()`).join(' && ');
const freshLobby=uid=>`root.child('matchLounge').child(${uid}).child('status').val() === 'available' && root.child('matchLounge').child(${uid}).child('updatedAt').val() > now - 240000`;
invite['.write']=`auth != null && $from !== $to && ((auth.uid === $from && (!newData.exists() || ((!data.exists() || data.child('status').val() !== 'pending') && newData.child('status').val() === 'pending' && ${freshLobby('$from')} && ${freshLobby('$to')} && newData.child('createdAt').val() >= now - 300000 && newData.child('createdAt').val() <= now + 60000))) || (auth.uid === $to && data.child('status').val() === 'pending' && ${immutable} && (newData.child('status').val() === 'declined' || (newData.child('status').val() === 'accepted' && data.child('createdAt').val() > now - 86400000 && ${validRoom}.child('meta/hostUid').val() === $to && ${validRoom}.child('meta/guestUid').val() === $from && ${validRoom}.child('members').child($to).exists() && ${validRoom}.child('members').child($from).exists()))))`;

for(const kind of ['rooms','selectedRooms']){
  const member=uid=>`root.child('${kind}').child($code).child('members').child(${uid}).exists()`;
  const writable=`auth != null && ${member('auth.uid')} && newData.exists()`;
  const knownPlayer=()=>validate(`newData.val() === '' || (newData.isString() && newData.parent().child('players').child(newData.val()).exists() && ${member('newData.val()')})`);
  const role={
    '.validate':`newData.isString() && ${member('newData.val()')} && (data.exists() ? newData.val() === data.val() : newData.val() === auth.uid)`
  };
  const requiredXO=['status','turn','score','round','matchId','winner','championUid','updatedAt'];
  const xo={
    '.write':writable,
    '.validate':`newData.hasChildren(${JSON.stringify(requiredXO)}) && (!data.hasChild('roles') || newData.hasChild('roles'))`,
    roles:{
      '.validate':"(!newData.hasChildren(['X','O']) || newData.child('X').val() !== newData.child('O').val()) && (!data.hasChild('X') || newData.hasChild('X')) && (!data.hasChild('O') || newData.hasChild('O'))",
      X:role,O:role,'$other':validate(false)
    },
    board:{'$cell':validate("$cell.matches(/^([0-9]|[1-9][0-9]|1[0-9]{2}|2[01][0-9]|22[0-4])$/) && (newData.val() === 'X' || newData.val() === 'O')")},
    status:oneOf(['waiting','playing','roundOver','matchOver']),
    turn:oneOf(['X','O']),
    score:{'.validate':"newData.hasChildren(['X','O'])",X:integer(0,6),O:integer(0,6),'$other':validate(false)},
    round:integer(1,1000000),
    matchId:validate('newData.isString() && newData.val().matches(/^[A-Za-z0-9_-]{1,64}$/)'),
    winner:oneOf(['','X','O','draw']),
    championUid:validate("newData.val() === '' || (newData.isString() && (newData.val() === newData.parent().child('roles/X').val() || newData.val() === newData.parent().child('roles/O').val()))"),
    winCells:{'$index':{'.validate':"$index.matches(/^[0-8]$/) && newData.isNumber() && newData.val() % 1 === 0 && newData.val() >= 0 && newData.val() < 225"}},
    updatedAt:timestamp(),
    '$other':validate(false)
  };
  const requiredTruth=['phase','round','chooser','responder','mode','prompt','answer','completed','note','updatedAt'];
  const truth={
    '.write':writable,
    '.validate':`newData.hasChildren(${JSON.stringify(requiredTruth)}) && (newData.child('chooser').val() === '' || newData.child('responder').val() === '' || newData.child('chooser').val() !== newData.child('responder').val())`,
    phase:oneOf(['waiting','draw','choose','compose','answer','ended']),
    round:integer(1,1000000),
    players:{'$uid':{
      '.validate':`${member('$uid')} && newData.hasChildren(['name']) && (data.exists() || $uid === auth.uid)`,
      name:{'.validate':"newData.isString() && newData.val().length >= 2 && newData.val().length <= 26 && ($uid === auth.uid || newData.val() === data.val())"},
      '$other':validate(false)
    }},
    draws:{'$uid':validate(`${member('$uid')} && newData.parent().parent().child('players').child($uid).exists() && newData.isNumber() && newData.val() % 1 === 0 && newData.val() >= 1 && newData.val() <= 13`)},
    chooser:knownPlayer(),responder:knownPlayer(),mode:oneOf(['','truth','dare']),
    prompt:string(400),answer:string(500),completed:validate('newData.isBoolean()'),note:string(500),
    endRequest:{
      '.validate':"newData.hasChildren(['by','at'])",
      by:validate(`${member('newData.val()')} && newData.parent().parent().child('players').child(newData.val()).exists() && (data.exists() ? newData.val() === data.val() : newData.val() === auth.uid)`),
      at:timestamp(),'$other':validate(false)
    },
    updatedAt:timestamp(),'$other':validate(false)
  };
  rules.coupleGames[kind].$code={'.read':`auth != null && ${member('auth.uid')}`,truth,xo,'$other':validate(false)};
}
writeFileSync(path,JSON.stringify(document,null,2)+'\n');
console.log('Updated invitation checks and strict Truth/XO schemas. No frontend files changed.');
