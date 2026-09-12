"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { authApi } from "@/lib/api/auth";

function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await authApi.login(username, password);
      window.location.href = "/patient-queue";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <form onSubmit={handleSubmit} className="space-y-4 w-80">
        <h2 className="text-2xl font-bold text-center">Login</h2>
        {error && <p className="text-red-500 text-center">{error}</p>}
        <div>
          <label>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border p-2 rounded"
            required
          />
        </div>
        <div>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border p-2 rounded"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-2 rounded"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [validated, setValidated] = useState(false);

  useEffect(() => {
    const token = authApi.getToken();
    if (token && pathname === "/login") {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";
      fetch(`${API_BASE}/auth/user/`, {
        headers: { Authorization: `Token ${token}` },
      }).then((res) => {
        if (res.ok) {
          router.replace("/patient-queue");
        } else {
          authApi.logout();
          setValidated(true);
        }
      });
    } else {
      setValidated(true);
    }
  }, [router, pathname]);

  if (!validated) {
    return null;
  }

  return <LoginForm />;
}