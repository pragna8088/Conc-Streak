SessionPage.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useParams, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VideoTile from "@/components/VideoTile";
import ChatPanel from "@/components/ChatPanel";
import EngagementDashboard from "@/components/EngagementDashboard";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  MonitorUp,
  MessageSquare,
  BarChart3,
  PhoneOff,
} from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useToast } from "@/hooks/use-toast";

interface Participant {
  userId: string;
  userName: string;
  stream?: MediaStream;
  isMuted: boolean;
  isCameraOff: boolean;
}

export default function SessionPage() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const sessionId = params.code || "";
  const sessionCode = searchParams.get("code") || "";
  const role = searchParams.get("role") || "student";
  const isTeacher = role === "teacher";
  const { toast } = useToast();

  const [user, setUser] = useState<any>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"chat" | "dashboard">("chat");
  const [messages, setMessages] = useState<any[]>([]);
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());

  const handleWebSocketMessage = useCallback((message: any) => {
    switch (message.type) {
      case "participants-list":
        console.log("Received participants list:", message.participants);
        message.participants.forEach((p: any) => {
          if (p.userId === user?.id) return;
          
          setParticipants((prev) => {
            const newMap = new Map(prev);
            if (!newMap.has(p.userId)) {
              newMap.set(p.userId, {
                userId: p.userId,
                userName: p.userName,
                isMuted: false,
                isCameraOff: false,
              });
            }
            return newMap;
          });
          
          createOffer(p.userId);
        });
        break;

      case "participant-joined":
        console.log("Participant joined:", message.userName);
        if (message.userId === user?.id) return;
        
        setParticipants((prev) => {
          const newMap = new Map(prev);
          newMap.set(message.userId, {
            userId: message.userId,
            userName: message.userName,
            isMuted: false,
            isCameraOff: false,
          });
          return newMap;
        });
        
        createOffer(message.userId);
        break;

      case "participant-left":
        console.log("Participant left:", message.userName);
        setParticipants((prev) => {
          const newMap = new Map(prev);
          newMap.delete(message.userId);
          return newMap;
        });
        break;

      case "webrtc-offer":
        handleOffer(message.fromUserId, message.offer);
        break;

      case "webrtc-answer":
        handleAnswer(message.fromUserId, message.answer);
        break;

      case "webrtc-ice-candidate":
        handleIceCandidate(message.fromUserId, message.candidate);
        break;

      case "chat-message":
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            sender: message.userName,
            text: message.text,
            timestamp: new Date(message.timestamp),
            isOwn: message.userId === user?.id,
          },
        ]);
        break;

      case "toggle-audio":
        setParticipants((prev) => {
          const newMap = new Map(prev);
          const participant = newMap.get(message.userId);
          if (participant) {
            participant.isMuted = !message.state;
            newMap.set(message.userId, participant);
          }
          return newMap;
        });
        break;

      case "toggle-video":
        setParticipants((prev) => {
          const newMap = new Map(prev);
          const participant = newMap.get(message.userId);
          if (participant) {
            participant.isCameraOff = !message.state;
            newMap.set(message.userId, participant);
          }
          return newMap;
        });
        break;
    }
  }, [user]);

  const { send: sendWebSocket, isConnected } = useWebSocket(handleWebSocketMessage);
  const { remoteStreams, handleOffer, handleAnswer, handleIceCandidate, createOffer, cleanup } =
    useWebRTC({
      localStream,
      sendSignal: sendWebSocket,
    });

  useEffect(() => {
    setParticipants((prev) => {
      const newMap = new Map(prev);
      remoteStreams.forEach((stream, userId) => {
        const participant = newMap.get(userId);
        if (participant) {
          participant.stream = stream;
          newMap.set(userId, participant);
        }
      });
      return newMap;
    });
  }, [remoteStreams]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      setLocation("/");
    }
  }, [setLocation]);

  useEffect(() => {
    if (!user || !isConnected) return;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setLocalStream(stream);
        sendWebSocket({
          type: "join-session",
          sessionId,
          userId: user.id,
          userName: user.name,
        });
      })
      .catch((error) => {
        console.error("Failed to get media devices:", error);
        toast({
          title: "Camera/Microphone Access Denied",
          description: "Please allow camera and microphone access to join the session",
          variant: "destructive",
        });
      });

    return () => {
      cleanup();
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [user, isConnected, sessionId]);

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        sendWebSocket({
          type: "toggle-audio",
          state: audioTrack.enabled,
        });
      }
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
        sendWebSocket({
          type: "toggle-video",
          state: videoTrack.enabled,
        });
      }
    }
  };

  const handleSendMessage = (text: string) => {
    sendWebSocket({
      type: "chat-message",
      text,
    });
  };

  const toggleSidebar = (tab: "chat" | "dashboard") => {
    if (showSidebar && sidebarTab === tab) {
      setShowSidebar(false);
    } else {
      setSidebarTab(tab);
      setShowSidebar(true);
    }
  };

  const handleLeave = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    cleanup();
    setLocation("/home");
  };

  if (!user) return null;

  const participantsList = Array.from(participants.values());
  const teacher = participantsList.find((p) => p.userId !== user.id) || null;
  const allParticipants = [
    {
      userId: user.id,
      userName: user.name,
      stream: localStream,
      isMuted,
      isCameraOff,
      isLocal: true,
      isHost: isTeacher,
    },
    ...participantsList.map((p) => ({
      ...p,
      isLocal: false,
      isHost: !isTeacher && p.userId === teacher?.userId,
    })),
  ];

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="h-16 border-b border-border px-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-foreground">Session: {sessionCode}</h2>
          <p className="text-sm text-muted-foreground">
            {allParticipants.length} participant{allParticipants.length !== 1 ? "s" : ""}
          </p>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-4 overflow-auto">
          {isTeacher ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {allParticipants.map((participant) => (
                <VideoTileWithStream
                  key={participant.userId}
                  participant={participant}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {teacher && (
                <div className="max-w-4xl mx-auto">
                  <VideoTileWithStream
                    participant={allParticipants.find((p) => p.isHost) || allParticipants[0]}
                    className="w-full"
                  />
                </div>
              )}
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-w-4xl mx-auto">
                {allParticipants
                  .filter((p) => !p.isHost)
                  .map((participant) => (
                    <VideoTileWithStream
                      key={participant.userId}
                      participant={participant}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>

        {showSidebar && (
          <div className="w-80 h-full">
            <Tabs value={sidebarTab} onValueChange={(v) => setSidebarTab(v as any)}>
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="chat" data-testid="tab-chat">
                  Chat
                </TabsTrigger>
                <TabsTrigger value="dashboard" data-testid="tab-dashboard">
                  Engagement
                </TabsTrigger>
              </TabsList>
              <TabsContent value="chat" className="h-[calc(100vh-8rem)] mt-0">
                <ChatPanel messages={messages} onSendMessage={handleSendMessage} />
              </TabsContent>
              <TabsContent value="dashboard" className="h-[calc(100vh-8rem)] mt-0 p-4 overflow-auto">
                <EngagementDashboard
                  participants={allParticipants.map((p) => ({
                    id: p.userId,
                    name: p.userName,
                    streak: 0,
                  }))}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      <footer className="h-20 border-t border-border flex items-center justify-center gap-4 px-4">
        <Button
          size="icon"
          variant={isMuted ? "destructive" : "secondary"}
          onClick={toggleMute}
          data-testid="button-toggle-mic"
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </Button>
        <Button
          size="icon"
          variant={isCameraOff ? "destructive" : "secondary"}
          onClick={toggleCamera}
          data-testid="button-toggle-camera"
        >
          {isCameraOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
        </Button>
        <Button
          size="icon"
          variant="secondary"
          onClick={() => console.log("Screen share toggled")}
          data-testid="button-screen-share"
        >
          <MonitorUp className="w-5 h-5" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          onClick={() => toggleSidebar("chat")}
          data-testid="button-toggle-chat"
        >
          <MessageSquare className="w-5 h-5" />
        </Button>
        {isTeacher && (
          <Button
            size="icon"
            variant="secondary"
            onClick={() => toggleSidebar("dashboard")}
            data-testid="button-toggle-dashboard"
          >
            <BarChart3 className="w-5 h-5" />
          </Button>
        )}
        <div className="flex-1" />
        <Button variant="destructive" onClick={handleLeave} data-testid="button-leave-session">
          <PhoneOff className="w-4 h-4 mr-2" />
          Leave
        </Button>
      </footer>
    </div>
  );
}

function VideoTileWithStream({
  participant,
  className,
}: {
  participant: any;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  return (
    <div
      className={`relative bg-muted rounded-lg overflow-hidden aspect-video flex items-center justify-center ${className || ""}`}
      data-testid={`video-tile-${participant.userName.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {participant.stream && !participant.isCameraOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-chart-1 to-chart-3 opacity-50">
          <div className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-semibold">
            {participant.userName
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </div>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-white text-sm font-medium truncate">
              {participant.userName} {participant.isLocal && "(You)"}
            </span>
            {participant.isHost && (
              <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                Host
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {participant.isMuted ? (
              <div className="p-1 rounded bg-destructive">
                <MicOff className="w-3 h-3 text-destructive-foreground" />
              </div>
            ) : (
              <div className="p-1 rounded bg-primary">
                <Mic className="w-3 h-3 text-primary-foreground" />
              </div>
            )}
            {participant.isCameraOff && (
              <div className="p-1 rounded bg-destructive">
                <VideoOff className="w-3 h-3 text-destructive-foreground" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}