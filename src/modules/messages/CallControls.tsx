'use client';

import { useEffect, useRef } from 'react';
import styles from './CallControls.module.css';
import { usePeerCall } from './usePeerCall';

interface CallControlsProps {
  conversationId: string | null;
  userId: string | null;
  peerUserId: string | null;
}

export function CallControls({ conversationId, userId, peerUserId }: CallControlsProps) {
  const call = usePeerCall({ conversationId, userId, peerUserId });
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const remoteAudio = useRef<HTMLAudioElement>(null);

  useEffect(() => { if (localVideo.current) localVideo.current.srcObject = call.localStream; }, [call.localStream]);
  useEffect(() => {
    if (remoteVideo.current) remoteVideo.current.srcObject = call.remoteStream;
    if (remoteAudio.current) remoteAudio.current.srcObject = call.remoteStream;
  }, [call.remoteStream]);

  const active = ['calling', 'ringing', 'connecting', 'connected'].includes(call.status);
  const statusLabel: Record<string, string> = {
    idle: 'Ready to call', ringing: 'Incoming call', calling: 'Calling… waiting for the other person',
    connecting: 'Connecting devices…', connected: 'Connected directly', ended: 'Call ended', error: 'Call could not continue',
  };

  return (
    <section className={styles.callControls} aria-label="Audio and video calling">
      <div className={styles.callActions}>
        <button type="button" disabled={!conversationId || !peerUserId || !call.signallingReady || active} onClick={() => void call.startCall('audio')} title="Start a peer-to-peer audio call"><span aria-hidden="true">☎</span> Audio call</button>
        <button type="button" disabled={!conversationId || !peerUserId || !call.signallingReady || active} onClick={() => void call.startCall('video')} title="Start a peer-to-peer video call"><span aria-hidden="true">▣</span> Video call</button>
      </div>
      <p role="status">{statusLabel[call.status]}</p>
      {!conversationId && <p>Calls require a saved conversation between connected Sanctuary accounts.</p>}{conversationId && !call.signallingReady && <p>Connecting to private call signalling…</p>}
      {call.incoming && <div className={styles.incomingCall} role="alert">
        <strong>Incoming {call.incoming.kind} call</strong>
        <div className={styles.callActions}>
          <button type="button" onClick={() => void call.acceptCall()}>Accept</button>
          <button type="button" onClick={() => void call.declineCall()}>Decline</button>
        </div>
      </div>}
      {active && <div className={styles.liveCall}>
        {call.kind === 'video' && <div className={styles.videoGrid}>
          <video ref={remoteVideo} autoPlay playsInline muted aria-label="Other participant video" />
          <video ref={localVideo} autoPlay playsInline muted aria-label="Your camera preview" />
        </div>}
        <audio ref={remoteAudio} autoPlay />
        <div className={styles.callActions}>
          <button type="button" onClick={call.toggleMute}>{call.muted ? 'Unmute microphone' : 'Mute microphone'}</button>
          {call.kind === 'video' && <button type="button" onClick={call.toggleCamera}>{call.cameraOff ? 'Turn camera on' : 'Turn camera off'}</button>}
          <button type="button" onClick={() => void call.endCall()}>End call</button>
        </div>
        {call.status === 'connected' && <p>Media is connected directly when network conditions allow. No relay fallback is configured yet.</p>}
      </div>}
      {call.error && <p className={styles.callError} role="alert">{call.error}</p>}
      <p className={styles.callPrivacy}>Calls use a private signalling channel and WebRTC. The Supabase authorization migration must be applied before calls can connect. This feature does not record calls.</p>
    </section>
  );
}
