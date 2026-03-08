import React from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../api";
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
import Page from "../components/Page";
import { toast } from "sonner";

export default function ForgotPassword() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      setSent(true);
      toast.success(res.message || "Check your email for a reset link.");
      if (res.token) {
        toast.info(`Dev token: ${res.token}`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page className="flex items-center justify-center">
      <Card className="w-full max-w-md" data-animate="card">
        <CardHeader>
          <CardTitle>Forgot Password</CardTitle>
          <CardDescription>
            Enter your email and we'll send you a password reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!sent ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="your@email.com"
                />
              </div>
              <Button className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
              <p className="text-sm text-muted-foreground">
                Remember your password?{" "}
                <Link className="text-primary hover:underline" to="/login">
                  Log in
                </Link>
              </p>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <p className="text-lg">✉️</p>
              <p className="text-sm text-muted-foreground">
                If an account with <strong>{email}</strong> exists, we sent a
                password reset link. Check your email.
              </p>
              <Button variant="outline" onClick={() => setSent(false)}>
                Try another email
              </Button>
              <p className="text-sm text-muted-foreground">
                <Link className="text-primary hover:underline" to="/login">
                  Back to login
                </Link>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </Page>
  );
}
