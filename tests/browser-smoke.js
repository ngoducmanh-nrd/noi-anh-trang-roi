async (page) => {
  const browser = page.context().browser();
  const live = new URL(page.url()).searchParams.get('live-smoke') === '1';
  const names = live ? ['Kiểm thử Alice','Kiểm thử Bobby'] : ['Alice Browser','Bobby Browser'];
  const contexts = [], pages = [], errors = [];
  const configuration = {firebase:{apiKey:'demo-api-key',authDomain:'demo-inlove-owned.firebaseapp.com',databaseURL:'https://demo-inlove-owned-default-rtdb.firebaseio.com',projectId:'demo-inlove-owned',appId:'1:123:web:demo'},emulators:true,site:{MINIGAMES:[],CONTACTS:{},DONATE_QR_IMAGE:'',MUSIC_URL:''}};
  try {
    for (const name of names) {
      const context = await browser.newContext(); contexts.push(context);
      if(!live)await context.route('**/app-config.js', route=>route.fulfill({contentType:'application/javascript',body:'window.APP_CONFIG='+JSON.stringify(configuration)}));
      const p = await context.newPage(); pages.push(p);
      p.on('pageerror',e=>errors.push(e.message));
      await p.goto('http://127.0.0.1:8088/');
      await p.waitForFunction(()=>cloudReady===true);
      await p.evaluate(()=>{if(window.Swal)Swal.close()});
      await p.locator('#onboardName').fill(name);
      await p.locator('#onboardForm').evaluate(form=>form.requestSubmit());
      await p.waitForFunction(()=>!!state.profile);
      await p.evaluate(()=>{if(window.Swal)Swal.close();confirmBox=async()=>true});
    }
    const [a,b] = pages;
    const room = await a.evaluate(async()=>{const r=await createCloudRoom();await setRoom({code:r.code,cloud:true});return r});
    const wrongPasswordDenied = await b.evaluate(async r=>{try{await joinCloudRoom(r.code,'WRONGPASSWORD1234');return false}catch{return true}},room);
    if(!wrongPasswordDenied)throw Error('Wrong room password was accepted');
    await b.evaluate(async r=>{await joinCloudRoom(r.code,r.password);await setRoom({code:r.code,cloud:true})},room);
    await a.evaluate(async()=>{$('chatText').value='Tin từ Alice';await sendMessage({preventDefault(){}})});
    await b.waitForFunction(()=>currentMessages.some(m=>m.text==='Tin từ Alice'));
    await b.evaluate(async()=>{$('chatText').value='Tin từ Bobby';await sendMessage({preventDefault(){}})});
    await a.waitForFunction(()=>currentMessages.some(m=>m.text==='Tin từ Bobby'));
    const sticker='data:image/png;base64,'+'A'.repeat(100);
    await a.evaluate(data=>sendRoomSticker(data),sticker);
    await b.waitForFunction(()=>currentMessages.some(m=>m.sticker));
    await a.evaluate(()=>cgTruthJoin());await b.waitForFunction(()=>!!cgTruth);
    await b.evaluate(()=>cgTruthJoin());await a.waitForFunction(()=>Object.keys(cgTruth?.players||{}).length===2);
    await a.evaluate(async()=>{const random=Math.random;Math.random=()=>.9;try{await cgTruthDraw()}finally{Math.random=random}});
    await b.evaluate(async()=>{const random=Math.random;Math.random=()=>.1;try{await cgTruthDraw()}finally{Math.random=random}});
    await a.waitForFunction(()=>cgTruth?.phase==='choose'&&cgTruth.chooser===firebaseUid);
    await a.evaluate(()=>{cgSelect('truth');return cgTruthMode('truth')});
    await a.waitForFunction(()=>cgTruth?.phase==='compose');
    await a.evaluate(()=>{$('cgTruthPrompt').value='Kỷ niệm vui nhất của bạn?';return cgTruthPublish()});
    await b.waitForFunction(()=>cgTruth?.phase==='answer');
    await b.evaluate(()=>{cgSelect('truth');$('cgTruthAnswer').value='Buổi hẹn đầu tiên';return cgTruthRespond()});
    await a.waitForFunction(()=>cgTruth?.completed===true);
    await a.evaluate(()=>cgTruthNext());await b.waitForFunction(()=>cgTruth?.round===2);
    await a.evaluate(()=>cgTruthEndRequest());await b.waitForFunction(()=>cgTruth?.phase==='ended');
    await a.evaluate(()=>cgTruthRestart());await b.waitForFunction(()=>cgTruth?.phase==='draw'&&cgTruth.round===1);
    await a.evaluate(()=>cgPickMark('X'));await b.waitForFunction(()=>!!cgXO?.roles?.X);
    await b.evaluate(()=>cgPickMark('O'));await a.waitForFunction(()=>cgXO?.status==='playing');
    await a.evaluate(()=>cgMove(0));await b.waitForFunction(()=>cgXO?.board?.[0]==='X');
    for(let i=1;i<=4;i++){
      await b.evaluate(index=>cgMove(index),14+i);
      await a.waitForFunction(index=>cgXO?.board?.[index]==='O',14+i);
      await a.evaluate(index=>cgMove(index),i);
      await b.waitForFunction(index=>cgXO?.board?.[index]==='X',i);
    }
    await a.waitForFunction(()=>cgXO?.status==='roundOver'&&cgXO.score.X===1);
    await a.evaluate(()=>cgNextXORound());await b.waitForFunction(()=>cgXO?.status==='playing'&&cgXO.round===2);
    await a.evaluate(async()=>{$('serverChatInput').value='Chat chung browser';await serverChatSend({preventDefault(){}})});
    await b.waitForFunction(()=>[...serverChatMessages.values()].some(m=>m.text==='Chat chung browser'));
    await a.evaluate(()=>enableMatchLobby());await b.evaluate(()=>enableMatchLobby());
    await a.waitForFunction(name=>[...activePeople.values()].some(p=>p.name===name),names[1]);
    await a.evaluate(name=>sendMatchInvite([...activePeople.values()].find(p=>p.name===name)),names[1]);
    await b.waitForFunction(()=>Object.values(inboxData).some(x=>x.status==='pending'));
    await b.evaluate(async()=>{const [uid,inv]=Object.entries(inboxData).find(([,x])=>x.status==='pending');await acceptMatchInvite(uid,inv)});
    await a.waitForFunction(()=>state.room?.selected===true);
    await b.waitForFunction(()=>state.room?.selected===true);
    await a.evaluate(()=>cgTruthJoin());await b.waitForFunction(()=>!!cgTruth);
    await b.evaluate(()=>cgTruthJoin());await a.waitForFunction(()=>Object.keys(cgTruth?.players||{}).length===2);
    await a.evaluate(()=>cgPickMark('X'));await b.waitForFunction(()=>!!cgXO?.roles?.X);
    await b.evaluate(()=>cgPickMark('O'));await a.waitForFunction(()=>cgXO?.status==='playing');
    const result = {live,wrongPasswordDenied,room:room.code,first:await a.evaluate(()=>({uid:firebaseUid,matchedRoom:state.room.code})),second:await b.evaluate(()=>({uid:firebaseUid,matchedRoom:state.room.code})),errors};
    if(result.first.uid===result.second.uid||result.first.matchedRoom!==result.second.matchedRoom||errors.length)throw Error(JSON.stringify(result));
    return {passed:['two anonymous users','profiles through form','password-protected room','two-way messages','sticker','truth draw/question/answer/next/end/restart','XO roles/complete round/next round','global chat','lobby and invite acceptance','shared selected room','games in selected room'],...result};
  } finally { for(const context of contexts)await context.close(); }
}
