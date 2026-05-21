useWebRTC.ts
import { useRef, useCallback, useEffect, useState } from "react";
import type { WebSocketMessage } from "./useWebSocket";

interface UseWebRTCProps {
  localStream: MediaStream | null;
  sendSignal: (message: WebSocketMessage) => void;
}

export function useWebRTC({ localStream, sendSignal }: UseWebRTCProps) {
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

  const createPeerConnection = useCallback(
    (userId: string) => {
      if (peerConnections.current.has(userId)) {
        return peerConnections.current.get(userId)!;
      }

      const configuration: RTCConfiguration = {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      };

      const pc = new RTCPeerConnection(configuration);

      if (localStream) {
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });
      }

      pc.ontrack = (event) => {
        console.log("Received remote track from", userId);
        setRemoteStreams((prev) => {
          const newMap = new Map(prev);
          newMap.set(userId, event.streams[0]);
          return newMap;
        });
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal({
            type: "webrtc-ice-candidate",
            targetUserId: userId,
            candidate: event.candidate,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        console.log(`Connection state with ${userId}:`, pc.connectionState);
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          peerConnections.current.delete(userId);
          setRemoteStreams((prev) => {
            const newMap = new Map(prev);
            newMap.delete(userId);
            return newMap;
          });
        }
      };

      peerConnections.current.set(userId, pc);
      return pc;
    },
    [localStream, sendSignal]
  );

  const handleOffer = useCallback(
    async (fromUserId: string, offer: RTCSessionDescriptionInit) => {
      console.log("Handling offer from", fromUserId);
      const pc = createPeerConnection(fromUserId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sendSignal({
        type: "webrtc-answer",
        targetUserId: fromUserId,
        answer: pc.localDescription,
      });
    },
    [createPeerConnection, sendSignal]
  );

  const handleAnswer = useCallback(
    async (fromUserId: string, answer: RTCSessionDescriptionInit) => {
      console.log("Handling answer from", fromUserId);
      const pc = peerConnections.current.get(fromUserId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    },
    []
  );

  const handleIceCandidate = useCallback(
    async (fromUserId: string, candidate: RTCIceCandidateInit) => {
      console.log("Handling ICE candidate from", fromUserId);
      const pc = peerConnections.current.get(fromUserId);
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    },
    []
  );

  const createOffer = useCallback(
    async (targetUserId: string) => {
      console.log("Creating offer for", targetUserId);
      const pc = createPeerConnection(targetUserId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendSignal({
        type: "webrtc-offer",
        targetUserId,
        offer: pc.localDescription,
      });
    },
    [createPeerConnection, sendSignal]
  );

  const cleanup = useCallback(() => {
    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();
    setRemoteStreams(new Map());
  }, []);

  return {
    remoteStreams,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    createOffer,
    cleanup,
  };
}
