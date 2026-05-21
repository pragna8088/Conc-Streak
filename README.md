# Conc-Streak

Conc-Streak is a real-time virtual classroom and concentration tracking platform built for online learning environments.  
The platform allows teachers and students to connect through live video sessions, chat in real-time, and monitor engagement during sessions.

🏆 Built during a Hackathon project and designed to improve focus and participation in online classes.

---

## 🚀 Features

### 🔐 Authentication System
- User Signup & Login
- Session-based authentication
- Secure password validation
- Role-based access (Teacher / Student)

### 🎥 Real-Time Video Conferencing
- WebRTC powered peer-to-peer video streaming
- Camera ON/OFF toggle
- Microphone mute/unmute
- Live participant joining and leaving

### 💬 Real-Time Chat
- Instant messaging inside sessions
- WebSocket-based communication
- Real-time updates without refresh

### 👨‍🏫 Teacher Dashboard
- Teacher can create sessions
- Students can join using session code
- Engagement dashboard for participant monitoring

### 📊 Engagement Tracking
- Streak system for concentration tracking
- Participant activity monitoring
- Future-ready analytics integration

### 🌐 Live Communication
- WebSocket signaling server
- Real-time synchronization
- Low latency communication

---

# 🛠️ Tech Stack

## Frontend
- React
- TypeScript
- Wouter
- Tailwind CSS
- ShadCN UI
- React Query

## Backend
- Node.js
- Express.js
- WebSocket (ws)
- WebRTC

## Database
- PostgreSQL
- Drizzle ORM
- Neon Database Serverless

## Validation & Utilities
- Zod
- Drizzle-Zod

---

# 📂 Project Structure

```bash
├── client
│   ├── pages
│   ├── components
│   ├── hooks
│   └── lib
│
├── server
│   ├── routes.ts
│   ├── auth.ts
│   ├── db.ts
│   └── storage.ts
│
├── shared
│   └── schema.ts
│
└── README.md

Contribution byLakshmi E
