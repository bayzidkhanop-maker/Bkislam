import { doc, setDoc, onSnapshot, updateDoc, collection, addDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Call } from './models';
import { generateId } from './utils';
import { handleFirestoreError, OperationType } from './firestoreErrorHandler';

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

let pc: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let remoteStream: MediaStream | null = null;
let currentCallId: string | null = null;
let unsubscribeCall: (() => void) | null = null;
let unsubscribeCallerCandidates: (() => void) | null = null;
let unsubscribeReceiverCandidates: (() => void) | null = null;

export const initLocalStream = async (video: boolean = true) => {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video, audio: true });
    return localStream;
  } catch (error) {
    console.error("Error accessing media devices.", error);
    throw error;
  }
};

export const startCall = async (callerId: string, receiverId: string, type: 'audio' | 'video', onRemoteStream: (stream: MediaStream) => void) => {
  if (!localStream) throw new Error("Local stream not initialized");

  pc = new RTCPeerConnection(servers);
  remoteStream = new MediaStream();
  onRemoteStream(remoteStream);

  localStream.getTracks().forEach((track) => {
    pc?.addTrack(track, localStream!);
  });

  pc.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream?.addTrack(track);
    });
  };

  const callId = generateId();
  currentCallId = callId;
  const callDoc = doc(db, 'calls', callId);
  const offerCandidates = collection(callDoc, 'callerCandidates');
  const answerCandidates = collection(callDoc, 'receiverCandidates');

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      addDoc(offerCandidates, event.candidate.toJSON());
    }
  };

  const offerDescription = await pc.createOffer();
  await pc.setLocalDescription(offerDescription);

  const callData: Call = {
    id: callId,
    callerId,
    receiverId,
    status: 'calling',
    type,
    offer: {
      type: offerDescription.type,
      sdp: offerDescription.sdp,
    },
    startedAt: Date.now(),
  };

  await setDoc(callDoc, callData);

  unsubscribeCall = onSnapshot(callDoc, (snapshot) => {
    const data = snapshot.data() as Call;
    if (!pc?.currentRemoteDescription && data?.answer) {
      const answerDescription = new RTCSessionDescription(data.answer);
      pc?.setRemoteDescription(answerDescription);
    }
    if (data?.status === 'rejected' || data?.status === 'ended') {
      endCall();
    }
  });

  unsubscribeReceiverCandidates = onSnapshot(answerCandidates, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());
        pc?.addIceCandidate(candidate);
      }
    });
  });

  return callId;
};

export const answerCall = async (callId: string, onRemoteStream: (stream: MediaStream) => void) => {
  if (!localStream) throw new Error("Local stream not initialized");

  currentCallId = callId;
  pc = new RTCPeerConnection(servers);
  remoteStream = new MediaStream();
  onRemoteStream(remoteStream);

  localStream.getTracks().forEach((track) => {
    pc?.addTrack(track, localStream!);
  });

  pc.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream?.addTrack(track);
    });
  };

  const callDoc = doc(db, 'calls', callId);
  const offerCandidates = collection(callDoc, 'callerCandidates');
  const answerCandidates = collection(callDoc, 'receiverCandidates');

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      addDoc(answerCandidates, event.candidate.toJSON());
    }
  };

  const callData = (await getDoc(callDoc)).data() as Call;
  const offerDescription = callData.offer;
  await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

  const answerDescription = await pc.createAnswer();
  await pc.setLocalDescription(answerDescription);

  await updateDoc(callDoc, {
    answer: {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    },
    status: 'accepted'
  });

  unsubscribeCallerCandidates = onSnapshot(offerCandidates, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        let data = change.doc.data();
        pc?.addIceCandidate(new RTCIceCandidate(data));
      }
    });
  });
  
  unsubscribeCall = onSnapshot(callDoc, (snapshot) => {
    const data = snapshot.data() as Call;
    if (data?.status === 'ended') {
      endCall();
    }
  });
};

export const rejectCall = async (callId: string) => {
  const callDoc = doc(db, 'calls', callId);
  await updateDoc(callDoc, { status: 'rejected', endedAt: Date.now() });
};

export const endCall = async () => {
  if (currentCallId) {
    const callDoc = doc(db, 'calls', currentCallId);
    try {
      await updateDoc(callDoc, { status: 'ended', endedAt: Date.now() });
    } catch (e) {
      // Might already be deleted or ended
    }
  }

  if (pc) {
    pc.close();
    pc = null;
  }
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  if (remoteStream) {
    remoteStream.getTracks().forEach(track => track.stop());
    remoteStream = null;
  }

  if (unsubscribeCall) unsubscribeCall();
  if (unsubscribeCallerCandidates) unsubscribeCallerCandidates();
  if (unsubscribeReceiverCandidates) unsubscribeReceiverCandidates();
  
  currentCallId = null;
};

export const subscribeToIncomingCalls = (userId: string, callback: (call: Call | null) => void) => {
  const callsQuery = collection(db, 'calls');
  return onSnapshot(callsQuery, (snapshot) => {
    let incomingCall: Call | null = null;
    snapshot.docs.forEach(doc => {
      const call = doc.data() as Call;
      if (call.receiverId === userId && (call.status === 'calling' || call.status === 'ringing')) {
        incomingCall = call;
      }
    });
    callback(incomingCall);
  });
};

export const subscribeToActiveCall = (callId: string, callback: (call: Call) => void) => {
  return onSnapshot(doc(db, 'calls', callId), (doc) => {
    if (doc.exists()) {
      callback(doc.data() as Call);
    }
  });
};

export const toggleAudio = (enabled: boolean) => {
  if (localStream) {
    localStream.getAudioTracks().forEach(track => track.enabled = enabled);
  }
};

export const toggleVideo = (enabled: boolean) => {
  if (localStream) {
    localStream.getVideoTracks().forEach(track => track.enabled = enabled);
  }
};
