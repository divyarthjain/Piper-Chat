import { useState, useEffect, useRef, useCallback } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

function VoiceChannel({ socket, currentUser }) {
  const [inVoice, setInVoice] = useState(false);
  const [voiceUsers, setVoiceUsers] = useState([]);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [speakingUsers, setSpeakingUsers] = useState(new Set());
  const [error, setError] = useState(null);

  const localStream = useRef(null);
  const peerConnections = useRef(new Map());
  const audioElements = useRef(new Map());
  const audioContext = useRef(null);
  const analyserNodes = useRef(new Map());

  useEffect(() => {
    socket.on('voice-users', (users) => {
      setVoiceUsers(users);
    });

    socket.on('voice-user-joined', async (user) => {
      if (inVoice && user.id !== socket.id) {
        await createPeerConnection(user.id, true);
      }
    });

    socket.on('voice-user-left', (oderId) => {
      closePeerConnection(oderId);
    });

    socket.on('voice-signal', async ({ from, signal }) => {
      await handleSignal(from, signal);
    });

    socket.on('voice-speaking', ({ oderId, speaking }) => {
      setSpeakingUsers(prev => {
        const next = new Set(prev);
        if (speaking) next.add(oderId);
        else next.delete(oderId);
        return next;
      });
    });

    return () => {
      socket.off('voice-users');
      socket.off('voice-user-joined');
      socket.off('voice-user-left');
      socket.off('voice-signal');
      socket.off('voice-speaking');
    };
  }, [socket, inVoice]);

  const createPeerConnection = useCallback(async (oderId, initiator) => {
    if (peerConnections.current.has(oderId)) return;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnections.current.set(oderId, pc);

    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        pc.addTrack(track, localStream.current);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('voice-signal', {
          to: oderId,
          signal: { type: 'candidate', candidate: event.candidate }
        });
      }
    };

    pc.ontrack = (event) => {
      let audio = audioElements.current.get(oderId);
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        audioElements.current.set(oderId, audio);
      }
      audio.srcObject = event.streams[0];

      setupVoiceDetection(oderId, event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        closePeerConnection(oderId);
      }
    };

    if (initiator) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('voice-signal', {
          to: oderId,
          signal: { type: 'offer', sdp: offer.sdp }
        });
      } catch (err) {
        console.error('Failed to create offer:', err);
      }
    }

    return pc;
  }, [socket]);

  const handleSignal = useCallback(async (from, signal) => {
    let pc = peerConnections.current.get(from);

    if (signal.type === 'offer') {
      if (!pc) {
        pc = await createPeerConnection(from, false);
      }
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signal.sdp }));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('voice-signal', {
        to: from,
        signal: { type: 'answer', sdp: answer.sdp }
      });
    } else if (signal.type === 'answer') {
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.sdp }));
      }
    } else if (signal.type === 'candidate') {
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    }
  }, [socket, createPeerConnection]);

  const closePeerConnection = useCallback((oderId) => {
    const pc = peerConnections.current.get(oderId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(oderId);
    }

    const audio = audioElements.current.get(oderId);
    if (audio) {
      audio.srcObject = null;
      audioElements.current.delete(oderId);
    }

    const analyser = analyserNodes.current.get(oderId);
    if (analyser) {
      analyserNodes.current.delete(oderId);
    }
  }, []);

  const setupVoiceDetection = useCallback((oderId, stream) => {
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    const source = audioContext.current.createMediaStreamSource(stream);
    const analyser = audioContext.current.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserNodes.current.set(oderId, analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let speaking = false;

    const checkAudio = () => {
      if (!analyserNodes.current.has(oderId)) return;
      
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      const isSpeaking = average > 20;

      if (isSpeaking !== speaking) {
        speaking = isSpeaking;
        setSpeakingUsers(prev => {
          const next = new Set(prev);
          if (speaking) next.add(oderId);
          else next.delete(oderId);
          return next;
        });
      }

      requestAnimationFrame(checkAudio);
    };

    checkAudio();
  }, []);

  const joinVoice = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStream.current = stream;

      socket.emit('voice-join');
      setInVoice(true);

      setTimeout(() => {
        voiceUsers.forEach(user => {
          if (user.id !== socket.id) {
            createPeerConnection(user.id, true);
          }
        });
      }, 500);

    } catch (err) {
      console.error('Failed to get audio:', err);
      setError('Could not access microphone. Please check permissions.');
    }
  };

  const leaveVoice = () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }

    peerConnections.current.forEach((pc, oderId) => {
      closePeerConnection(oderId);
    });

    socket.emit('voice-leave');
    setInVoice(false);
    setMuted(false);
    setDeafened(false);
  };

  const toggleMute = () => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = muted;
        setMuted(!muted);
        socket.emit('voice-mute', !muted);
      }
    }
  };

  const toggleDeafen = () => {
    const newDeafened = !deafened;
    setDeafened(newDeafened);
    
    audioElements.current.forEach(audio => {
      audio.muted = newDeafened;
    });

    if (newDeafened && !muted) {
      toggleMute();
    }

    socket.emit('voice-deafen', newDeafened);
  };

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-white font-medium text-sm">Voice Channel</h3>
            <p className="text-white/50 text-xs">{voiceUsers.length} connected</p>
          </div>
        </div>

        {!inVoice ? (
          <button
            onClick={joinVoice}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Join
          </button>
        ) : (
          <button
            onClick={leaveVoice}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Leave
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {voiceUsers.length > 0 && (
        <div className="space-y-2 mb-3">
          {voiceUsers.map(user => (
            <div
              key={user.id}
              className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                speakingUsers.has(user.id) ? 'bg-green-500/20 ring-2 ring-green-500/50' : 'bg-white/5'
              }`}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: user.color }}
              >
                {user.username[0].toUpperCase()}
              </div>
              <span className="text-white text-sm flex-1">{user.username}</span>
              
              <div className="flex items-center gap-1">
                {user.muted && (
                  <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
                  </svg>
                )}
                {user.deafened && (
                  <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3.63 3.63a.996.996 0 000 1.41L7.29 8.7 7 9H4c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71v-4.17l4.18 4.18c-.49.37-1.02.68-1.6.91-.36.15-.58.53-.58.92 0 .72.73 1.18 1.39.91.8-.33 1.55-.77 2.22-1.31l1.34 1.34a.996.996 0 101.41-1.41L5.05 3.63c-.39-.39-1.02-.39-1.42 0zM19 12c0 .82-.15 1.61-.41 2.34l1.53 1.53c.56-1.17.88-2.48.88-3.87 0-3.83-2.4-7.11-5.78-8.4-.59-.23-1.22.23-1.22.86v.19c0 .38.25.71.61.85C17.18 6.54 19 9.06 19 12zm-8.71-6.29l-.17.17L12 7.76V6.41c0-.89-1.08-1.33-1.71-.7zM16.5 12A4.5 4.5 0 0014 7.97v1.79l2.48 2.48c.01-.08.02-.16.02-.24z"/>
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {inVoice && (
        <div className="flex items-center justify-center gap-2 pt-2 border-t border-white/10">
          <button
            onClick={toggleMute}
            className={`p-3 rounded-full transition-colors ${
              muted ? 'bg-red-600 hover:bg-red-700' : 'bg-white/10 hover:bg-white/20'
            }`}
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? (
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
            )}
          </button>

          <button
            onClick={toggleDeafen}
            className={`p-3 rounded-full transition-colors ${
              deafened ? 'bg-red-600 hover:bg-red-700' : 'bg-white/10 hover:bg-white/20'
            }`}
            title={deafened ? 'Undeafen' : 'Deafen'}
          >
            {deafened ? (
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3.63 3.63a.996.996 0 000 1.41L7.29 8.7 7 9H4c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71v-4.17l4.18 4.18c-.49.37-1.02.68-1.6.91-.36.15-.58.53-.58.92 0 .72.73 1.18 1.39.91.8-.33 1.55-.77 2.22-1.31l1.34 1.34a.996.996 0 101.41-1.41L5.05 3.63c-.39-.39-1.02-.39-1.42 0z"/>
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default VoiceChannel;
