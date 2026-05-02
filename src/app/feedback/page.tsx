"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, CheckCircle, MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";

const categories = [
  { value: "bug", label: "Bug Report", emoji: "🐛" },
  { value: "feature", label: "Feature Request", emoji: "💡" },
  { value: "collaborate", label: "Collaboration", emoji: "👥" },
  { value: "ui", label: "UI / Design", emoji: "🎨" },
  { value: "performance", label: "Performance", emoji: "⚡" },
  { value: "other", label: "Other", emoji: "📝" },
];

export default function FeedbackPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = category && message.trim().length >= 10;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    const { error: err } = await supabase.from("feedback").insert({
      name: name.trim() || "Anonymous",
      email: email.trim() || null,
      rating: 3, // default neutral value (column requires it)
      category,
      message: message.trim(),
    });

    setSubmitting(false);
    if (err) {
      setError("Failed to submit. Please try again.");
      console.error(err);
    } else {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-orange-50/30 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-zinc-800 dark:text-white">Thank you!</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mb-8">Your feedback helps us make PeerDoc better for everyone.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/" className="px-6 py-3 bg-orange-400 hover:bg-orange-500 text-white rounded-xl font-medium transition-colors">
              Back to Home
            </Link>
            <button onClick={() => { setSubmitted(false); setCategory(""); setMessage(""); }} className="px-6 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl font-medium transition-colors">
              Send More
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50/30 dark:bg-zinc-950">
      <header className="border-b border-orange-100 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 w-fit">
            <ArrowLeft className="w-4 h-4" />Back
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-3xl font-bold mb-2 text-zinc-800 dark:text-white">Help Us Improve</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Found a bug? Have an idea? Let us know!</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-orange-100 dark:border-zinc-800 p-6 md:p-8 space-y-6">
          {/* Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Name <span className="text-zinc-400">(optional)</span></label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Email <span className="text-zinc-400">(optional)</span></label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">What is this about? <span className="text-orange-400">*</span></label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    category === cat.value
                      ? "border-orange-400 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400"
                      : "border-zinc-200 dark:border-zinc-700 hover:border-orange-300 dark:hover:border-orange-800 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Describe it <span className="text-orange-400">*</span></label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What happened? What should we add or fix? (min 10 characters)"
              rows={5}
              className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm resize-none"
            />
            <p className="text-xs text-zinc-400 mt-1">{message.trim().length}/10 min characters</p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full px-6 py-3.5 bg-orange-400 hover:bg-orange-500 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
