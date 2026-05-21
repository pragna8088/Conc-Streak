VedioTile.tsx
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";

interface VideoTileProps {
  name: string;
  isHost?: boolean;
  isMuted?: boolean;
  isCameraOff?: boolean;
  isLocal?: boolean;
  className?: string;
}

export default function VideoTile({
  name,
  isHost = false,
  isMuted = false,
  isCameraOff = false,
  isLocal = false,
  className = "",
}: VideoTileProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={`relative bg-muted rounded-lg overflow-hidden aspect-video flex items-center justify-center ${className}`}
      data-testid={`video-tile-${name.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {isCameraOff ? (
        <Avatar className="w-20 h-20">
          <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
            {initials}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-chart-1 to-chart-3 opacity-50" />
      )}

      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-white text-sm font-medium truncate">
              {name} {isLocal && "(You)"}
            </span>
            {isHost && (
              <Badge variant="secondary" className="text-xs">
                Host
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isMuted ? (
              <div className="p-1 rounded bg-destructive">
                <MicOff className="w-3 h-3 text-destructive-foreground" />
              </div>
            ) : (
              <div className="p-1 rounded bg-primary">
                <Mic className="w-3 h-3 text-primary-foreground" />
              </div>
            )}
            {isCameraOff && (
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