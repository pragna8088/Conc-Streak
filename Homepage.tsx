HomePage.tsx
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import ProfileDropdown from "@/components/ProfileDropdown";
import ModeSelection from "@/components/ModeSelection";
import CreateSessionCard from "@/components/CreateSessionCard";
import JoinSessionCard from "@/components/JoinSessionCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { sessionApi } from "@/lib/api";

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<any>(null);
  const [selectedMode, setSelectedMode] = useState<"student" | "teacher" | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      setLocation("/");
    }
  }, [setLocation]);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setLocation("/");
  };

  const handleCreateSession = async (code: string) => {
    try {
      const result = await sessionApi.create(code);
      if (result.session) {
        setLocation(`/session/${result.session.id}?role=teacher&code=${code}`);
      }
    } catch (error: any) {
      console.error("Failed to create session:", error);
    }
  };

  const handleJoinSession = async (code: string) => {
    try {
      const result = await sessionApi.join(code);
      if (result.session) {
        setLocation(`/session/${result.session.id}?role=${selectedMode || "student"}&code=${code}`);
      }
    } catch (error: any) {
      console.error("Failed to join session:", error);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Conc-Streak</h1>
          <ProfileDropdown user={user} onLogout={handleLogout} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        {!selectedMode ? (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">Welcome, {user.name}</h2>
              <p className="text-muted-foreground">Choose your role to get started</p>
            </div>
            <ModeSelection onSelectMode={setSelectedMode} />
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => setSelectedMode(null)}
                data-testid="button-back"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold text-foreground capitalize">
                {selectedMode} Mode
              </h2>
              <p className="text-muted-foreground">
                {selectedMode === "teacher"
                  ? "Create a new session or join an existing one"
                  : "Enter the session code provided by your teacher"}
              </p>
            </div>
            {selectedMode === "teacher" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <CreateSessionCard onCreateSession={handleCreateSession} />
                <JoinSessionCard onJoinSession={handleJoinSession} />
              </div>
            ) : (
              <JoinSessionCard onJoinSession={handleJoinSession} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}