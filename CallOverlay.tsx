import React, { useState, useEffect, useRef } from 'react';
import { Call, User } from './models';
import { answerCall, rejectCall, endCall, initLocalStream, startCall, toggleAudio, toggleVideo, subscribeToActiveCall } from './callService';
import { getUser } from './firestoreService';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Maximize, Minimize } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './widgets';

interface CallOverlayProps {
  currentUser: User;
  incomingCall: Call | null;
  activeCallId: string | null;
  onCallEnd: () => void;
}

export const CallOverlay = ({ currentUser, incomingCall, activeCallId, onCallEnd }: CallOverlayProps) => {
  const [callState, setCallState] = useState<Call | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [duration, setDuration] = useState(0);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Handle incoming call
  useEffect(() => {
    if (incomingCall && !activeCallId) {
      const fetchUser = async () => {
        const u = await getUser(incomingCall.callerId);
        setOtherUser(u);
      };
      fetchUser();
    }
  }, [incomingCall, activeCallId]);

  // Handle active call state
  useEffect(() => {
    if (activeCallId) {
      const unsubscribe = subscribeToActiveCall(activeCallId, async (call) => {
        setCallState(call);
        if (!otherUser) {
          const otherId = call.callerId === currentUser.uid ? call.receiverId : call.callerId;
          const u = await getUser(otherId);
          setOtherUser(u);
        }
        if (call.status === 'ended' || call.status === 'rejected') {
          handleEndCall();
        }
      });
      return () => unsubscribe();
    } else {
      setCallState(null);
      setOtherUser(null);
      setDuration(0);
    }
  }, [activeCallId, currentUser.uid]);

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState?.status === 'accepted') {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState?.status]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleAccept = async () => {
    if (!incomingCall) return;
    try {
      const stream = await initLocalStream(incomingCall.type === 'video');
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      
      await answerCall(incomingCall.id, (remoteStream) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
      });
    } catch (e) {
      console.error("Failed to accept call", e);
      handleEndCall();
    }
  };

  const handleReject = async () => {
    if (incomingCall) {
      await rejectCall(incomingCall.id);
      onCallEnd();
    }
  };

  const handleEndCall = async () => {
    await endCall();
    onCallEnd();
  };

  const toggleMute = () => {
    toggleAudio(!isAudioMuted);
    setIsAudioMuted(!isAudioMuted);
  };

  const toggleCam = () => {
    toggleVideo(!isVideoMuted);
    setIsVideoMuted(!isVideoMuted);
  };

  if (!incomingCall && !activeCallId) return null;

  // Incoming Call UI
  if (incomingCall && !activeCallId) {
    return (
      <AnimatePresence>
        <motion.div 
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-[90%] max-w-sm flex items-center gap-4"
        >
          <img src={otherUser?.avatarURL || `https://ui-avatars.com/api/?name=${otherUser?.name}`} className="w-14 h-14 rounded-full object-cover animate-pulse" />
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 dark:text-white">{otherUser?.name || 'Incoming Call'}</h3>
            <p className="text-sm text-gray-500">Incoming {incomingCall.type} call...</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleReject} className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors">
              <PhoneOff size={20} />
            </button>
            <button onClick={handleAccept} className="p-3 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors animate-bounce">
              {incomingCall.type === 'video' ? <Video size={20} /> : <Phone size={20} />}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Active Call UI
  if (activeCallId && callState) {
    const isVideo = callState.type === 'video';
    
    return (
      <div className={cn(
        "fixed z-[100] bg-gray-900 transition-all duration-300 flex flex-col overflow-hidden",
        isFullscreen ? "inset-0" : "bottom-4 right-4 w-80 h-[480px] rounded-2xl shadow-2xl border border-gray-700"
      )}>
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent z-10 flex justify-between items-center text-white">
          <div>
            <h3 className="font-semibold">{otherUser?.name || 'Unknown'}</h3>
            <p className="text-xs opacity-80">{callState.status === 'accepted' ? formatDuration(duration) : 'Calling...'}</p>
          </div>
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>

        {/* Video Area */}
        <div className="flex-1 relative bg-gray-800 flex items-center justify-center">
          {isVideo ? (
            <>
              <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-20 right-4 w-24 h-36 bg-gray-900 rounded-xl overflow-hidden border-2 border-gray-700 shadow-lg">
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover"
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <img src={otherUser?.avatarURL || `https://ui-avatars.com/api/?name=${otherUser?.name}`} className="w-32 h-32 rounded-full object-cover border-4 border-gray-700" />
                {callState.status === 'calling' && (
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-500 animate-ping opacity-20"></div>
                )}
              </div>
              <div className="text-center text-white">
                <h2 className="text-2xl font-bold">{otherUser?.name}</h2>
                <p className="text-gray-400 mt-1">{callState.status === 'accepted' ? formatDuration(duration) : 'Ringing...'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent flex justify-center items-center gap-6">
          <button 
            onClick={toggleMute}
            className={cn("p-4 rounded-full transition-colors", isAudioMuted ? "bg-red-500 text-white" : "bg-gray-700 text-white hover:bg-gray-600")}
          >
            {isAudioMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>
          
          {isVideo && (
            <button 
              onClick={toggleCam}
              className={cn("p-4 rounded-full transition-colors", isVideoMuted ? "bg-red-500 text-white" : "bg-gray-700 text-white hover:bg-gray-600")}
            >
              {isVideoMuted ? <VideoOff size={24} /> : <Video size={24} />}
            </button>
          )}

          <button 
            onClick={handleEndCall}
            className="p-4 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <PhoneOff size={24} />
          </button>
        </div>
      </div>
    );
  }

  return null;
};
