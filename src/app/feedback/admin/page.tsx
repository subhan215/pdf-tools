"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Star, RefreshCw, Trash2, Filter, BarChart3,
  LogIn, LogOut, Lock, Mail, Eye, EyeOff, Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface Feedback {
  id: string;
  name: string;
  email: string | null;
  rating: number;
  category: string;
  message: string;
  created_at: string;
}

const categoryLabels: Record<string, string> = {
  bug: "🐛 Bug",
  feature: "💡 Feature",
  collaborate: "👥 Collab",
  ui: "🎨 UI",
  performance: "⚡ Perf",
  other: "📝 Other",
};

export default function FeedbackAdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Login form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  // Feedback data
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

  // Check existing session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchFeedback();
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchFeedback();
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    setLoggingIn(true);
    setLoginError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoggingIn(false);
    if (error) {
      setLoginError(error.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setFeedbacks([]);
  };

  const fetchFeedback = async () => {
    setLoadingData(true);
    const { data, error } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setFeedbacks(data);
    setLoadingData(false);
  };

  const deleteFeedback = async (id: string) => {
    const { error } = await supabase.from("feedback").delete().eq("id", id);
    if (!error) setFeedbacks((prev) => prev.filter((f) => f.id !== id));
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
      </div>
    );
  }

  // Login screen
  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-orange-500" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-800 dark:text-white">Admin Login</h1>
            <p className="text-sm text-zinc-500 mt-1">Sign in to view feedback</p>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@peerdoc.app"
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
                <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginError && <p className="text-sm text-red-500">{loginError}</p>}

            <button
              onClick={handleLogin}
              disabled={loggingIn || !email.trim() || !password}
              className="w-full px-4 py-2.5 bg-orange-400 hover:bg-orange-500 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              Sign In
            </button>
          </div>

          <p className="text-center mt-4">
            <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-600">Back to home</Link>
          </p>
        </div>
      </div>
    );
  }

  // Dashboard
  const filtered = feedbacks
    .filter((f) => filterCategory === "all" || f.category === filterCategory)
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

  const categoryCounts = feedbacks.reduce((acc, f) => {
    acc[f.category] = (acc[f.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
            <ArrowLeft className="w-4 h-4" />Home
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400">{user.email}</span>
            <button onClick={fetchFeedback} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg" title="Refresh">
              <RefreshCw className={`w-4 h-4 text-zinc-500 ${loadingData ? "animate-spin" : ""}`} />
            </button>
            <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 text-zinc-800 dark:text-white">Feedback ({feedbacks.length})</h1>

        {/* Stats */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
          {Object.entries(categoryLabels).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilterCategory(filterCategory === val ? "all" : val)}
              className={`p-3 rounded-xl border text-center transition-all ${
                filterCategory === val
                  ? "border-orange-400 bg-orange-50 dark:bg-orange-900/20"
                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-orange-300"
              }`}
            >
              <p className="text-lg font-bold text-zinc-800 dark:text-white">{categoryCounts[val] || 0}</p>
              <p className="text-xs text-zinc-500">{label}</p>
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-zinc-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
          </select>
          {filterCategory !== "all" && (
            <button onClick={() => setFilterCategory("all")} className="px-3 py-1.5 text-sm text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg">
              Clear filter
            </button>
          )}
        </div>

        {/* List */}
        {loadingData ? (
          <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin text-orange-400 mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-400">No feedback yet</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((fb) => (
              <div key={fb.id} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="font-medium text-sm text-zinc-800 dark:text-white">{fb.name}</span>
                      {fb.email && <span className="text-xs text-zinc-400">{fb.email}</span>}
                      <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-xs text-zinc-500">
                        {categoryLabels[fb.category] || fb.category}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {new Date(fb.created_at).toLocaleDateString()} {new Date(fb.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">{fb.message}</p>
                  </div>
                  <button
                    onClick={() => deleteFeedback(fb.id)}
                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors shrink-0"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
