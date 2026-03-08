import React from "react";
import { useNavigate } from "react-router-dom";
import { checkUsername, setUsername } from "../api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Label } from "../components/ui/label";
import { useAuth } from "../lib/auth";
import Page from "../components/Page";
import { toast } from "sonner";

export default function SetUsername() {
  const navigate = useNavigate();
  const { user, refresh } = useAuth();
  const [username, setUsernameVal] = React.useState("");
  const [available, setAvailable] = React.useState<boolean | null>(null);
  const [availError, setAvailError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>();

  // Debounced availability check
  React.useEffect(() => {
    if (username.length < 3) {
      setAvailable(null);
      setAvailError(null);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await checkUsername(username);
        setAvailable(res.available);
        setAvailError(res.error || null);
      } catch {
        setAvailable(null);
      }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!available) return;
    setLoading(true);
    try {
      await setUsername(username);
      toast.success("Username set!");
      await refresh();
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err?.message || "Failed to set username");
    } finally {
      setLoading(false);
    }
  };

  // Redirect if user already has a username
  React.useEffect(() => {
    if (user && user.username) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  return (
    <Page className="flex items-center justify-center">
      <Card className="w-full max-w-md" data-animate="card">
        <CardHeader>
          <CardTitle>Choose Your Username</CardTitle>
          <CardDescription>
            This is your unique identity on Sypev. It can't be changed easily
            later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                value={username}
                onChange={(e) =>
                  setUsernameVal(
                    e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                  )
                }
                placeholder="e.g. john_doe"
                maxLength={30}
                required
              />
              {username.length > 0 && (
                <div className="text-sm">
                  {available === null && username.length >= 3 && (
                    <span className="text-muted-foreground">Checking...</span>
                  )}
                  {available === true && (
                    <span className="text-green-600">✓ Available</span>
                  )}
                  {available === false && (
                    <span className="text-red-500">
                      ✗ {availError || "Not available"}
                    </span>
                  )}
                  {username.length < 3 && (
                    <span className="text-muted-foreground">
                      At least 3 characters
                    </span>
                  )}
                </div>
              )}
            </div>

            <Button className="w-full" disabled={loading || !available}>
              {loading ? "Setting..." : "Set Username"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Page>
  );
}
