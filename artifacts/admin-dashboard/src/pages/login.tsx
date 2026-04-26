import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchApi } from "@/lib/api";
import { Music, KeyRound, Loader2 } from "lucide-react";

export default function Login() {
  const { setAdminKey } = useAuth();
  const [key, setKeyInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key) return;
    
    setLoading(true);
    setError("");
    
    try {
      // Test the key
      await fetchApi("/admin/users", {
        headers: { "x-admin-key": key }
      });
      // If it didn't throw, it's valid
      setAdminKey(key);
      window.location.href = "/";
    } catch (err: any) {
      setError("Invalid admin key. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-border">
        <CardHeader className="space-y-3 text-center pb-8">
          <div className="mx-auto bg-primary/10 text-primary w-16 h-16 rounded-full flex items-center justify-center mb-2">
            <Music size={32} />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Audiops Console</CardTitle>
          <CardDescription className="text-base">
            Enter your operator key to access the admin dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Admin Key"
                  className="pl-10 h-12 text-lg bg-secondary/50 border-secondary focus-visible:ring-primary"
                  value={key}
                  onChange={(e) => setKeyInput(e.target.value)}
                  autoFocus
                />
              </div>
              {error && <p className="text-sm text-destructive font-medium">{error}</p>}
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold" 
              disabled={!key || loading}
            >
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Access Console
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
