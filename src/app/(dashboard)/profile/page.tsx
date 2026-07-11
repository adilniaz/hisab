"use client";
import { useState } from "react";
import { changePassword } from "./actions";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProfilePage() {
  const [msg, setMsg] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const form = new FormData(e.currentTarget);
    const result = await changePassword({
      currentPassword: form.get("currentPassword") as string,
      newPassword: form.get("newPassword") as string,
    });
    if (result?.error) {
      setMsg(result.error);
      setIsError(true);
    } else {
      setMsg("Password changed successfully");
      setIsError(false);
      (e.target as HTMLFormElement).reset();
    }
    setLoading(false);
  }

  return (
    <>
      <Topbar title="Profile" />
      <div className="p-6">
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label>Current password</Label>
                <Input name="currentPassword" type="password" required />
              </div>
              <div className="space-y-1">
                <Label>New password</Label>
                <Input name="newPassword" type="password" required minLength={8} />
              </div>
              {msg && (
                <p className={`text-sm ${isError ? "text-destructive" : "text-green-400"}`}>
                  {msg}
                </p>
              )}
              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : "Change Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
