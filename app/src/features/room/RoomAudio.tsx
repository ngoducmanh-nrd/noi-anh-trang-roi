import { useEffect, useMemo, useRef, useState } from 'react';
import type { Member, RoomRef } from '../../types';
import { Button, Icon } from '../../components/ui';
import {
  setMicApproval,
  setMicRequest,
  subscribeAudioSignals,
  subscribeMicRequests,
  writeAudioAnswer,
  writeAudioCandidate,
  writeAudioOffer,
  type AudioSignal,
  type MicRequest,
} from '../../lib/firebase';

type Props = { room: RoomRef; uid: string; isHost: boolean; approval: boolean; members: Record<string, Member>; present: string[] | null; onError: (message: string) => void };
type Peer = { pc: RTCPeerConnection; candidates: RTCIceCandidateInit[] };

function pairKey(a: string, b: string) { return [a, b].sort().join('__'); }

export default function RoomAudio({ room, uid, isHost, approval, members, present, onError }: Props) {
  const [requests, setRequests] = useState<Record<string, MicRequest>>({});
  const [signals, setSignals] = useState<Record<string, AudioSignal>>({});
  const [micOn, setMicOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const streamRef = useRef<MediaStream | null>(null);
  const peers = useRef(new Map<string, Peer>());
  const handledCandidates = useRef(new Set<string>());
  const peerIds = useMemo(() => Object.keys(members).filter(id => id !== uid && (present === null || present.includes(id))), [members, present, uid]);

  useEffect(() => {
    if (room.kind !== 'rooms') return;
    return subscribeMicRequests(room, setRequests, onError);
  }, [room.code, room.kind, onError]);

  useEffect(() => {
    if (room.kind !== 'rooms') return;
    return subscribeAudioSignals(room, setSignals, onError);
  }, [room.code, room.kind, onError]);

  async function startPeer(peerId: string) {
    const existing = peers.current.get(peerId);
    if (existing) return existing.pc;
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    const peer: Peer = { pc, candidates: [] };
    peers.current.set(peerId, peer);
    streamRef.current?.getTracks().forEach(track => pc.addTrack(track, streamRef.current!));
    pc.ontrack = event => setRemoteStreams(current => ({ ...current, [peerId]: event.streams[0] || new MediaStream([event.track]) }));
    pc.onicecandidate = event => { if (event.candidate) void writeAudioCandidate(room, pairKey(uid, peerId), uid, { ...event.candidate.toJSON(), from: uid }).catch(error => onError(error instanceof Error ? error.message : 'Không gửi được tín hiệu mic.')); };
    if (streamRef.current && !pc.localDescription) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await writeAudioOffer(room, pairKey(uid, peerId), { ...offer, from: uid });
    }
    return pc;
  }

  useEffect(() => {
    let disposed = false;
    async function process() {
      for (const peerId of peerIds) {
        const signal = signals[pairKey(uid, peerId)];
        if (!signal || disposed) continue;
        try {
          const pc = await startPeer(peerId);
          if (signal.offer && signal.offer.from !== uid && !pc.currentRemoteDescription) {
            await pc.setRemoteDescription(signal.offer);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await writeAudioAnswer(room, pairKey(uid, peerId), { ...answer, from: uid });
          }
          if (signal.answer && signal.answer.from !== uid && !pc.currentRemoteDescription) await pc.setRemoteDescription(signal.answer);
          for (const [candidateId, candidate] of Object.entries(signal.candidates?.[peerId] || {})) {
            const key = `${peerId}:${candidateId}`;
            if (!handledCandidates.current.has(key)) { handledCandidates.current.add(key); await pc.addIceCandidate(candidate); }
          }
        } catch (error) { if (!disposed) onError(error instanceof Error ? error.message : 'Không kết nối được mic.'); }
      }
    }
    void process();
    return () => { disposed = true; };
  }, [signals, peerIds, room.code, room.kind, uid]);

  useEffect(() => {
    if (!streamRef.current) return;
    for (const peer of peers.current.values()) {
      const sender = peer.pc.getSenders().find(item => item.track?.kind === 'audio');
      if (sender && streamRef.current.getAudioTracks()[0]) void sender.replaceTrack(streamRef.current.getAudioTracks()[0]);
    }
  }, [micOn]);

  useEffect(() => () => { streamRef.current?.getTracks().forEach(track => track.stop()); peers.current.forEach(peer => peer.pc.close()); }, []);

  async function enableMic() {
    if (approval && !isHost && requests[uid]?.status !== 'approved') {
      try { await setMicRequest(room, requests[uid]?.status === 'pending' ? 'denied' : 'pending'); } catch (error) { onError(error instanceof Error ? error.message : 'Không gửi được yêu cầu mic.'); }
      return;
    }
    setBusy(true);
    try {
      const stream = streamRef.current || await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      stream.getAudioTracks().forEach(track => { track.enabled = true; });
      setMicOn(true);
      await Promise.all(peerIds.map(startPeer));
    } catch (error) { onError(error instanceof Error ? error.message : 'Trình duyệt chưa cho phép dùng mic.'); }
    finally { setBusy(false); }
  }

  function disableMic() { streamRef.current?.getAudioTracks().forEach(track => { track.enabled = false; }); setMicOn(false); }

  if (room.kind !== 'rooms') return null;
  const request = requests[uid];
  const pending = Object.entries(requests).filter(([id, value]) => id !== uid && value.status === 'pending' && members[id]);

  return <section className="room-audio surface" aria-label="Điều khiển mic trong phòng">
    <div className="room-audio-main">
      <span className={`room-audio-icon${micOn ? ' is-on' : ''}`} aria-hidden="true"><Icon name="volume" size={19} /></span>
      <div><strong>{micOn ? 'Mic đang bật' : 'Mic đang tắt'}</strong><p>{approval ? (isHost ? 'Khách cần được anh duyệt trước khi nói.' : request?.status === 'approved' ? 'Anh đã được duyệt mic.' : request?.status === 'pending' ? 'Đang chờ chủ phòng duyệt.' : 'Gửi yêu cầu để xin quyền nói.') : 'Mọi người trong phòng có thể tự bật mic.'}</p></div>
      <Button variant={micOn ? 'secondary' : 'primary'} disabled={busy || (approval && !isHost && request?.status === 'pending')} onClick={() => void (micOn ? disableMic() : enableMic())} aria-pressed={micOn}><Icon name='volume' size={17} />{micOn ? 'Tắt mic' : request?.status === 'pending' ? 'Đang chờ duyệt' : approval && !isHost ? 'Xin bật mic' : 'Bật mic'}</Button>
    </div>
    {isHost && approval && pending.length > 0 && <div className="room-mic-requests"><span className="eyebrow">YÊU CẦU MIC</span>{pending.map(([id]) => <div className="room-mic-request" key={id}><span>{members[id].name} muốn bật mic</span><span className="actions"><Button variant="secondary" onClick={() => void setMicApproval(room, id, 'denied')}>Từ chối</Button><Button onClick={() => void setMicApproval(room, id, 'approved')}>Duyệt</Button></span></div>)}</div>}
    {Object.entries(remoteStreams).map(([id, stream]) => <audio key={id} autoPlay playsInline ref={element => { if (element && element.srcObject !== stream) element.srcObject = stream; }} aria-label={`Âm thanh của ${members[id]?.name || 'thành viên'}`} />)}
  </section>;
}
