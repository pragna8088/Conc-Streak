ChatPanel.tsx
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: Date;
  isOwn: boolean;
}

interface ChatPanelProps {
  messages?: Message[];
  onSendMessage: (text: string) => void;
}

export default function ChatPanel({ messages = [], onSendMessage }: ChatPanelProps) {
  const [messageText, setMessageText] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim()) {
      onSendMessage(messageText);
      setMessageText("");
    }
  };

  return (
    <div className="flex flex-col h-full bg-card border-l border-card-border">
      <div className="p-4 border-b border-card-border">
        <h3 className="font-semibold text-card-foreground">Chat</h3>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isOwn ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs ${
                  message.isOwn ? "ml-auto" : "mr-auto"
                }`}
              >
                {!message.isOwn && (
                  <p className="text-xs text-muted-foreground mb-1">{message.sender}</p>
                )}
                <div
                  className={`p-3 rounded-2xl ${
                    message.isOwn
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <form onSubmit={handleSend} className="p-4 border-t border-card-border">
        <div className="flex gap-2">
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            data-testid="input-chat-message"
          />
          <Button type="submit" size="icon" data-testid="button-send-message">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}