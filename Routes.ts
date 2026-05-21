routes.ts
import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { comparePasswords } from "./auth";
import { insertUserSchema, insertSessionSchema } from "@shared/schema";
import { z } from "zod";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const user = await storage.createUser(validatedData);
      req.session.userId = user.id;
      
      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const isValid = await comparePasswords(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      req.session.userId = user.id;
      
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { password, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  });

  // Session routes
  app.post("/api/sessions", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ error: "Session code required" });
      }

      const existingSession = await storage.getSessionByCode(code);
      if (existingSession) {
        return res.status(400).json({ error: "Session code already exists" });
      }

      const session = await storage.createSession({
        code,
        hostId: user.id,
        hostName: user.name,
        active: true,
      });

      await storage.addParticipant({
        sessionId: session.id,
        userId: user.id,
        userName: user.name,
      });

      res.json({ session });
    } catch (error) {
      console.error("Create session error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/sessions/join", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ error: "Session code required" });
      }

      const session = await storage.getSessionByCode(code);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      if (!session.active) {
        return res.status(400).json({ error: "Session is not active" });
      }

      await storage.addParticipant({
        sessionId: session.id,
        userId: user.id,
        userName: user.name,
      });

      res.json({ session });
    } catch (error) {
      console.error("Join session error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/sessions/:id", async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      const participants = await storage.getSessionParticipants(session.id);

      res.json({ session, participants });
    } catch (error) {
      console.error("Get session error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket setup for real-time communication
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: "/ws"
  });

  interface WebSocketClient extends WebSocket {
    sessionId?: string;
    userId?: string;
    userName?: string;
  }

  wss.on("connection", (ws: WebSocketClient) => {
    console.log("WebSocket client connected");

    ws.on("message", async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case "join-session":
            ws.sessionId = message.sessionId;
            ws.userId = message.userId;
            ws.userName = message.userName;
            
            // Broadcast to all clients in the same session
            broadcastToSession(message.sessionId, {
              type: "participant-joined",
              userId: message.userId,
              userName: message.userName,
            }, ws);
            
            // Send current participants list to the new joiner
            const participants = Array.from(wss.clients as Set<WebSocketClient>)
              .filter(client => client.sessionId === message.sessionId && client.userId !== message.userId)
              .map(client => ({
                userId: client.userId,
                userName: client.userName,
              }));
            
            ws.send(JSON.stringify({
              type: "participants-list",
              participants,
            }));
            break;

          case "webrtc-offer":
          case "webrtc-answer":
          case "webrtc-ice-candidate":
            // Forward WebRTC signaling to the target peer
            const targetClient = Array.from(wss.clients as Set<WebSocketClient>).find(
              client => client.userId === message.targetUserId && client.sessionId === ws.sessionId
            );
            
            if (targetClient && targetClient.readyState === WebSocket.OPEN) {
              targetClient.send(JSON.stringify({
                ...message,
                fromUserId: ws.userId,
                fromUserName: ws.userName,
              }));
            }
            break;

          case "chat-message":
            // Broadcast chat message to all in session
            broadcastToSession(ws.sessionId!, {
              type: "chat-message",
              userId: ws.userId,
              userName: ws.userName,
              text: message.text,
              timestamp: new Date().toISOString(),
            });
            break;

          case "toggle-audio":
          case "toggle-video":
            // Broadcast media state changes
            broadcastToSession(ws.sessionId!, {
              type: message.type,
              userId: ws.userId,
              state: message.state,
            }, ws);
            break;

          default:
            console.log("Unknown message type:", message.type);
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
      if (ws.sessionId && ws.userId) {
        broadcastToSession(ws.sessionId, {
          type: "participant-left",
          userId: ws.userId,
          userName: ws.userName,
        });
      }
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  function broadcastToSession(sessionId: string, message: any, excludeWs?: WebSocket) {
    wss.clients.forEach((client) => {
      const wsClient = client as WebSocketClient;
      if (
        wsClient.sessionId === sessionId &&
        wsClient.readyState === WebSocket.OPEN &&
        wsClient !== excludeWs
      ) {
        wsClient.send(JSON.stringify(message));
      }
    });
  }

  return httpServer;
}