'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, ShieldCheck } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/services/supabase';
import styles from './ConversationCallPanel.module.css';

type CallKind = 'audio' | 'video';
type Signal = { type: 'invite' | 'accept' | 'reject' | 'offer' | 'answer' | 'ice' | 'hangup'; callId: string; from: string; kind?: CallKind; description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };
type CallState = 'idle' | 'calling' | 'incoming' | 'connecting' | 'connected';

interface Props {
  conversationId: string | null;
  currentUserId: string;
  peerName: string;
  isGroup: boolean;
}

const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

export function ConversationCallPanel({ conversationId, currentUserId, peerName, isGroup }: Props) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [callKind, setCallKind] = useState<CallKind>('audio');
  const [callId, setCallId] = useState<string | null>(null);
  const [incoming, setIncoming] = useState<Signal | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteReady, setRemoteReady] = useState(false);
  const [signallingReady, setSignallingReady] = useState(false);
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabaseBrowserClient>['channel']> | null>(null);
  const activeCallRef = useRef<string | null>(null);
  const queuedCandidates = useRef<RTCIceCandidateInit[]>([]);

  const stopMedia = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (localVideo.current) localVideo.current.srcObject = null;
    if (remoteVideo.current) remoteVideo.current.srcObject = null;
    setRemoteReady(false);
    setMuted(false);
    setCameraOff(false);
  }, []);

  const sendSignal = useCallback((signal: Omit<Signal, 'from'>) => {
    const channel = channelRef.current;
    if (!channel) throw new Error('Call signalling is not connected.');
    return channel.send({ type: 'broadcast', event: 'signal', payload: { ...signal, from: currentUserId } });
  }, [currentUserId]);

  const resetCall = useCallback(() => {
    activeCallRef.current = null;
    setCallId(null);
    setIncoming(null);
    setCallState('idle');
    queuedCandidates.current = [];
    stopMedia();
  }, [stopMedia]);

  useEffect(() => {
    if (!conversationId || !currentUserId || isGroup) return;
    let cancelled = false;
    const client = getSupabaseBrowserClient();
    const channel = client.channel(`sanctuary-call:${conversationId}`, { config: { private: true } });
    channelRef.current = channel;
    channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
      const signal = payload as Signal;
      if (!signal || signal.from === currentUserId || typeof signal.callId !== 'string') return;
      if (signal.type === 'invite') {
        if (activeCallRef.current === null) setIncoming(signal);
        return;
      }
      if (signal.callId !== activeCallRef.current) return;
      if (signal.type === 'reject' || signal.type === 'hangup') {
        resetCall();
        return;
      }
      if (signal.type === 'accept' && activeCallRef.current) {
        setCallState('connecting');
        const pc = peerRef.current;
        if (pc && !pc.localDescription) {
          void (async () => {
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              await sendSignal({ type: 'offer', callId: signal.callId, description: offer });
            } catch {
              setError('The call offer could not be created. Hang up and try again.');
            }
          })();
        }
        return;
      }
      const pc = peerRef.current;
      if (!pc) return;
      void (async () => {
        try {
          if (signal.type === 'offer' && signal.description) {
            await pc.setRemoteDescription(signal.description);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendSignal({ type: 'answer', callId: signal.callId, description: answer });
            for (const candidate of queuedCandidates.current.splice(0)) await pc.addIceCandidate(candidate);
          } else if (signal.type === 'answer' && signal.description) {
            await pc.setRemoteDescription(signal.description);
            for (const candidate of queuedCandidates.current.splice(0)) await pc.addIceCandidate(candidate);
          } else if (signal.type === 'ice' && signal.candidate) {
            if (pc.remoteDescription) await pc.addIceCandidate(signal.candidate);
            else queuedCandidates.current.push(signal.candidate);
          }
        } catch {
          setError('The call connection failed. Check your connection and try again.');
        }
      })();
    });
    void client.realtime.setAuth().then(() => {
      if (cancelled) return;
      channel.subscribe((status) => {
      if (cancelled) return;
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        setSignallingReady(false);
        setError('Secure call signalling is unavailable. Check the Sanctuary call-signalling database policy and try again.');
      } else if (status === 'SUBSCRIBED') {
        setSignallingReady(true);
        setError((current) => current?.startsWith('Secure call signalling') ? null : current);
      }
      });
    }).catch(() => {
      if (!cancelled) setError('Could not authenticate the private call channel. Please sign in again.');
    });
    return () => {
      cancelled = true;
      void client.removeChannel(channel);
      if (channelRef.current === channel) channelRef.current = null;
      setSignallingReady(false);
      resetCall();
    };
    // The subscription is scoped to the selected conversation and user.
    // Call state is read at event time through refs to avoid re-subscribing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, currentUserId, isGroup, resetCall, sendSignal]);

  useEffect(() => {
    const pc = peerRef.current;
    if (!pc) return;
    pc.ontrack = (event) => {
      if (remoteVideo.current) remoteVideo.current.srcObject = event.streams[0] ?? null;
      setRemoteReady(true);
      setCallState('connected');
    };
    pc.onicecandidate = (event) => {
      if (event.candidate && activeCallRef.current) {
        void sendSignal({ type: 'ice', callId: activeCallRef.current, candidate: event.candidate.toJSON() });
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setCallState('connected');
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setError('The call connection was interrupted. You can hang up and try again.');
      }
    };
  }, [sendSignal, callState]);

  useEffect(() => {
    if (callState !== 'idle' && localVideo.current && streamRef.current) {
      localVideo.current.srcObject = streamRef.current;
    }
  }, [callState, callKind]);

  const preparePeer = async (kind: CallKind) => {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser does not support microphone or camera access. Use a secure HTTPS connection and a supported browser.');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: kind === 'video' });
    streamRef.current = stream;
    if (localVideo.current) localVideo.current.srcObject = stream;
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    peerRef.current = pc;
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    return pc;
  };

  const startCall = async (kind: CallKind) => {
    if (!conversationId || !channelRef.current || callState !== 'idle') return;
    setError(null);
    setCallKind(kind);
    const id = crypto.randomUUID();
    activeCallRef.current = id;
    setCallId(id);
    try {
      await preparePeer(kind);
      setCallState('calling');
      await sendSignal({ type: 'invite', callId: id, kind });
    } catch (callError) {
      resetCall();
      setError(callError instanceof Error ? callError.message : 'Could not start the call.');
    }
  };

  const acceptCall = async () => {
    if (!incoming || !channelRef.current) return;
    setError(null);
    const signal = incoming;
    activeCallRef.current = signal.callId;
    setCallId(signal.callId);
    setCallKind(signal.kind ?? 'audio');
    try {
      await preparePeer(signal.kind ?? 'audio');
      setCallState('connecting');
      await sendSignal({ type: 'accept', callId: signal.callId });
      setIncoming(null);
    } catch (callError) {
      try { await sendSignal({ type: 'reject', callId: signal.callId }); } catch {}
      resetCall();
      setError(callError instanceof Error ? callError.message : 'Could not accept the call.');
    }
  };

  const declineCall = async () => {
    if (incoming) {
      try { await sendSignal({ type: 'reject', callId: incoming.callId }); } catch {}
    }
    setIncoming(null);
  };

  const hangUp = async () => {
    if (callId) {
      try { await sendSignal({ type: 'hangup', callId }); } catch {}
    }
    resetCall();
  };

  const toggleMute = () => {
    const next = !muted;
    streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
    setMuted(next);
  };

  const toggleCamera = () => {
    const next = !cameraOff;
    streamRef.current?.getVideoTracks().forEach((track) => { track.enabled = !next; });
    setCameraOff(next);
  };

  if (isGroup) {
    return <p className={styles.note}>Group calling is planned for a later stage. Voice and video calls are currently one-to-one.</p>;
  }

  return (
    <section className={styles.panel} aria-label="Voice and video calls">
      <div className={styles.heading}>
        <span className={styles.icon}><Phone size={16} aria-hidden="true" /></span>
        <div><strong>Voice &amp; video</strong><span>Private one-to-one calls in Sanctuary</span></div>
      </div>
      {callState === 'idle' && !incoming && (
        <div className={styles.actions}>
          <button type="button" onClick={() => void startCall('audio')} disabled={!conversationId || !signallingReady}><Phone size={15} aria-hidden="true" /> Voice call</button>
          <button type="button" onClick={() => void startCall('video')} disabled={!conversationId || !signallingReady}><Video size={15} aria-hidden="true" /> Video call</button>
        </div>
      )}
      {incoming && callState === 'idle' && (
        <div className={styles.incoming} role="alert">
          <strong>Incoming {incoming.kind === 'video' ? 'video' : 'voice'} call</strong>
          <span>{peerName} is calling. Your microphone or camera will only be requested if you accept.</span>
          <div className={styles.actions}>
            <button type="button" onClick={() => void acceptCall()}><Phone size={15} aria-hidden="true" /> Accept</button>
            <button type="button" className={styles.danger} onClick={() => void declineCall()}><PhoneOff size={15} aria-hidden="true" /> Decline</button>
          </div>
        </div>
      )}
      {callState !== 'idle' && (
        <div className={styles.callArea}>
          <div className={styles.callStatus} role="status">{callState === 'calling' ? 'Calling…' : callState === 'connecting' ? 'Connecting securely…' : 'Call connected'}{remoteReady ? ' · Remote media received' : ''}</div>
          <div className={styles.videos}>
            <video ref={remoteVideo} autoPlay playsInline className={styles.remoteVideo} aria-label="Other participant video" />
            <video ref={localVideo} autoPlay muted playsInline className={styles.localVideo} aria-label="Your camera preview" />
          </div>
          <div className={styles.actions}>
            <button type="button" onClick={toggleMute}>{muted ? <MicOff size={15} /> : <Mic size={15} />}{muted ? 'Unmute' : 'Mute'}</button>
            {callKind === 'video' && <button type="button" onClick={toggleCamera}>{cameraOff ? <VideoOff size={15} /> : <Video size={15} />}{cameraOff ? 'Camera on' : 'Camera off'}</button>}
            <button type="button" className={styles.danger} onClick={() => void hangUp()}><PhoneOff size={15} aria-hidden="true" /> Hang up</button>
          </div>
        </div>
      )}
      {error && <p className={styles.error} role="alert">{error}</p>}
      <p className={styles.note}><ShieldCheck size={13} aria-hidden="true" /> Calls use encrypted WebRTC media. Calls are not recorded. Your browser will ask before microphone or camera access.</p>
    </section>
  );
}
