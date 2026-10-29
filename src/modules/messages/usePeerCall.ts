'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabaseBrowserClient } from '@/services/supabase';

type CallKind = 'audio' | 'video';
type CallStatus = 'idle' | 'ringing' | 'calling' | 'connecting' | 'connected' | 'ended' | 'error';
type Signal =
  | { type: 'invite'; callId: string; from: string; to: string; kind: CallKind }
  | { type: 'accept'; callId: string; from: string; to: string }
  | { type: 'decline' | 'hangup'; callId: string; from: string; to: string }
  | { type: 'offer' | 'answer'; callId: string; from: string; to: string; description: RTCSessionDescriptionInit }
  | { type: 'candidate'; callId: string; from: string; to: string; candidate: RTCIceCandidateInit };

interface PeerCallOptions {
  conversationId: string | null;
  userId: string | null;
  peerUserId: string | null;
}

const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

export function usePeerCall({ conversationId, userId, peerUserId }: PeerCallOptions) {
  const [status, setStatus] = useState<CallStatus>('idle');
  const [kind, setKind] = useState<CallKind>('audio');
  const [incoming, setIncoming] = useState<{ callId: string; kind: CallKind; from: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabaseBrowserClient>['channel']> | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const remoteRef = useRef<MediaStream | null>(null);
  const activeCallId = useRef<string | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);

  const send = useCallback(async (signal: Signal) => {
    const channel = channelRef.current;
    if (!channel) throw new Error('The secure call-signalling channel is not connected.');
    const result = await channel.send({ type: 'broadcast', event: 'signal', payload: signal });
    if (result !== 'ok') throw new Error('Call signalling failed. Check your connection and try again.');
  }, []);

  const cleanup = useCallback((nextStatus: CallStatus = 'ended') => {
    pcRef.current?.close();
    pcRef.current = null;
    localRef.current?.getTracks().forEach((track) => track.stop());
    localRef.current = null;
    remoteRef.current?.getTracks().forEach((track) => track.stop());
    remoteRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setIncoming(null);
    setMuted(false);
    setCameraOff(false);
    pendingCandidates.current = [];
    activeCallId.current = null;
    setStatus(nextStatus);
  }, []);

  const ensurePeerConnection = useCallback(async (callKind: CallKind, callId: string) => {
    if (pcRef.current) return pcRef.current;
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone/camera access requires a supported browser and a secure HTTPS connection.');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callKind === 'video' });
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    localRef.current = stream;
    setLocalStream(stream);
    const remote = new MediaStream();
    remoteRef.current = remote;
    setRemoteStream(remote);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        if (!remote.getTracks().some((existing) => existing.id === track.id)) remote.addTrack(track);
      });
      setRemoteStream(new MediaStream(remote.getTracks()));
    };
    pc.onicecandidate = (event) => {
      if (event.candidate && userId && peerUserId) {
        void send({ type: 'candidate', callId, from: userId, to: peerUserId, candidate: event.candidate.toJSON() }).catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not send connection candidate.'));
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setStatus('connected');
      else if (pc.connectionState === 'connecting') setStatus('connecting');
      else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setError('The direct connection was interrupted. End the call and try again; relay fallback is not configured yet.');
        if (pc.connectionState === 'failed') cleanup('error');
      }
    };
    pcRef.current = pc;
    return pc;
  }, [cleanup, peerUserId, send, userId]);

  useEffect(() => {
    if (!conversationId || !userId || !peerUserId || !window.isSecureContext) return;
    let cancelled = false;
    const channel = getSupabaseBrowserClient().channel(`sanctuary-call:${conversationId}`, {
      config: { private: true, broadcast: { self: false, ack: true } },
    });
    channelRef.current = channel;
    channel.on('broadcast', { event: 'signal' }, ({ payload }: { payload: Signal }) => {
      if (cancelled || !payload || payload.to !== userId || payload.from !== peerUserId) return;
      if (payload.type === 'invite') {
        if (status === 'connected' || status === 'calling' || status === 'connecting' || status === 'ringing') return;
        activeCallId.current = payload.callId;
        setKind(payload.kind);
        setIncoming({ callId: payload.callId, kind: payload.kind, from: payload.from });
        setStatus('ringing');
        setError(null);
        return;
      }
      if (!activeCallId.current || payload.callId !== activeCallId.current) return;
      if (payload.type === 'decline' || payload.type === 'hangup') {
        cleanup('ended');
        return;
      }
      if (payload.type === 'accept') {
        if (status !== 'calling' || !userId || !peerUserId) return;
        void (async () => {
          try {
            const pc = await ensurePeerConnection(kind, payload.callId);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await send({ type: 'offer', callId: payload.callId, from: userId, to: peerUserId, description: offer });
            setStatus('connecting');
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Could not start the call.');
            cleanup('error');
          }
        })();
        return;
      }
      void (async () => {
        try {
          if (payload.type === 'offer') {
            const pc = await ensurePeerConnection(kind, payload.callId);
            await pc.setRemoteDescription(payload.description);
            for (const candidate of pendingCandidates.current.splice(0)) await pc.addIceCandidate(candidate);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await send({ type: 'answer', callId: payload.callId, from: userId, to: peerUserId, description: answer });
            setStatus('connecting');
          } else if (payload.type === 'answer' && pcRef.current) {
            await pcRef.current.setRemoteDescription(payload.description);
            for (const candidate of pendingCandidates.current.splice(0)) await pcRef.current.addIceCandidate(candidate);
          } else if (payload.type === 'candidate') {
            if (pcRef.current?.remoteDescription) await pcRef.current.addIceCandidate(payload.candidate);
            else pendingCandidates.current.push(payload.candidate);
          }
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : 'Call connection negotiation failed.');
          cleanup('error');
        }
      })();
    });
    channel.subscribe((state) => {
      if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT' || state === 'CLOSED') {
        setError('Call signalling is unavailable. Verify the private-channel authorization migration is applied.');
      }
    });
    return () => {
      cancelled = true;
      void getSupabaseBrowserClient().removeChannel(channel);
      if (channelRef.current === channel) channelRef.current = null;
      cleanup('idle');
    };
  // Status/kind are intentionally read for this subscription's event handler; refs avoid resubscribing on each state change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, userId, peerUserId]);

  const startCall = useCallback(async (callKind: CallKind) => {
    if (!conversationId || !userId || !peerUserId) {
      setError('Open a persistent direct conversation with a signed-in account before calling.');
      return;
    }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError('Calls require HTTPS and a browser with microphone/camera support.');
      return;
    }
    if (status === 'calling' || status === 'ringing' || status === 'connecting' || status === 'connected') return;
    const callId = crypto.randomUUID();
    activeCallId.current = callId;
    setKind(callKind);
    setStatus('calling');
    setError(null);
    try {
      await send({ type: 'invite', callId, from: userId, to: peerUserId, kind: callKind });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send call invitation.');
      cleanup('error');
    }
  }, [cleanup, conversationId, peerUserId, send, status, userId]);

  const acceptCall = useCallback(async () => {
    if (!incoming || !userId || !peerUserId) return;
    try {
      const callId = incoming.callId;
      await ensurePeerConnection(incoming.kind, callId);
      setIncoming(null);
      setStatus('connecting');
      await send({ type: 'accept', callId, from: userId, to: peerUserId });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not accept call.');
      cleanup('error');
    }
  }, [cleanup, ensurePeerConnection, incoming, peerUserId, send, userId]);

  const declineCall = useCallback(async () => {
    if (incoming && userId && peerUserId) {
      try { await send({ type: 'decline', callId: incoming.callId, from: userId, to: peerUserId }); } catch { /* local cleanup still required */ }
    }
    cleanup('ended');
  }, [cleanup, incoming, peerUserId, send, userId]);

  const endCall = useCallback(async () => {
    const callId = activeCallId.current;
    if (callId && userId && peerUserId) {
      try { await send({ type: 'hangup', callId, from: userId, to: peerUserId }); } catch { /* tear down locally even offline */ }
    }
    cleanup('ended');
  }, [cleanup, peerUserId, send, userId]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    localRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
    setMuted(next);
  }, [muted]);

  const toggleCamera = useCallback(() => {
    const next = !cameraOff;
    localRef.current?.getVideoTracks().forEach((track) => { track.enabled = !next; });
    setCameraOff(next);
  }, [cameraOff]);

  return { status, kind, incoming, error, localStream, remoteStream, muted, cameraOff, startCall, acceptCall, declineCall, endCall, toggleMute, toggleCamera };
}
