const COOKIE_OPTIONS = "path=/; max-age=604800; SameSite=Lax";

function setAuthCookie(token: string) {
  if (typeof document !== "undefined") {
    document.cookie = `token=${token}; ${COOKIE_OPTIONS}`;
    document.cookie = `accessToken=${token}; ${COOKIE_OPTIONS}`;
  }
}

function clearAuthCookie() {
  if (typeof document !== "undefined") {
    document.cookie = "token=; path=/; max-age=0";
    document.cookie = "accessToken=; path=/; max-age=0";
  }
}

export const authApi = {
  getToken() {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token") || localStorage.getItem("accessToken");
    }
    return null;
  },

  async login(username: string, password: string) {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";
    const response = await fetch(`${API_BASE}/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.detail || data.non_field_errors || "Login failed");
    }
    const data = await response.json();
    if (data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("accessToken", data.token);
      setAuthCookie(data.token);
    }
    return data;
  },

  async logout() {
    const token = this.getToken();
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";
    if (token) {
      await fetch(`${API_BASE}/auth/logout/`, {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
        },
      });
    }
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    clearAuthCookie();
  },
};
