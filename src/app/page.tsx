"use client";

import { useState, useEffect } from "react";
import { Users, PenLine, FileImage, Merge, Scissors, FileDown, Stamp, Shield, Lock, Zap, ArrowRight, ServerOff, Sparkles, MessageSquare } from "lucide-react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

const tools = [
  {
    name: "Collaborate",
    description: "Edit PDFs across devices in real-time. Scan QR, done!",
    href: "/collaborate",
    icon: Users,
    color: "bg-orange-400",
    featured: true,
  },
  {
    name: "Sign & Edit",
    description: "Add signatures, text, shapes & annotations",
    href: "/edit",
    icon: PenLine,
    color: "bg-orange-500",
  },
  {
    name: "PDF to Image",
    description: "Export PDF pages as PNG or JPG",
    href: "/pdf-to-image",
    icon: FileImage,
    color: "bg-orange-400",
  },
  {
    name: "Merge PDFs",
    description: "Combine multiple PDFs into one",
    href: "/merge",
    icon: Merge,
    color: "bg-orange-500",
  },
  {
    name: "Split PDF",
    description: "Extract pages or split into parts",
    href: "/split",
    icon: Scissors,
    color: "bg-orange-400",
  },
  {
    name: "Compress PDF",
    description: "Reduce PDF file size significantly",
    href: "/compress",
    icon: FileDown,
    color: "bg-orange-500",
  },
  {
    name: "Add Watermark",
    description: "Add text or image watermarks",
    href: "/watermark",
    icon: Stamp,
    color: "bg-orange-400",
  },
];

const steps = [
  {
    step: "01",
    title: "Upload PDF",
    description: "Drop your file or click to upload. Everything stays in your browser.",
  },
  {
    step: "02",
    title: "Choose Tool",
    description: "Pick what you need — edit, merge, split, compress, or collaborate.",
  },
  {
    step: "03",
    title: "Download",
    description: "Get your processed PDF instantly. No email, no signup, no waiting.",
  },
];

const trustPoints = [
  {
    icon: Shield,
    title: "100% Private",
    description: "Files never leave your browser. Zero server uploads. Your documents are yours alone.",
  },
  {
    icon: Lock,
    title: "Realtime Collaboration",
    description: "Sync edits across devices in real time so shared PDF sessions stay aligned while you work.",
  },
  {
    icon: Zap,
    title: "No Limits, Ever",
    description: "Unlimited file size, unlimited files, no watermarks. Free forever — no catches.",
  },
];

export default function Home() {
  const [demoText, setDemoText] = useState("");
  const [isSelected, setIsSelected] = useState(false);
  const [isBold, setIsBold] = useState(false);

  useEffect(() => {
    const text = "Hello World";
    let index = 0;
    const typeInterval = setInterval(() => {
      if (index < text.length) {
        setDemoText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(typeInterval);
        setTimeout(() => setIsSelected(true), 500);
        setTimeout(() => setIsBold(true), 1000);
      }
    }, 150);

    return () => clearInterval(typeInterval);
  }, []);

  return (
    <div className="min-h-screen bg-orange-50/30 dark:bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/70 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-orange-100 dark:border-zinc-800/50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center group">
            <img src="/logo.png" alt="PeerDoc" className="h-12 w-auto object-contain group-hover:scale-105 transition-transform" />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/collaborate"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-orange-400 hover:bg-orange-500 text-white text-sm rounded-lg font-medium transition-colors shadow-sm shadow-orange-400/20"
            >
              Get Started
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-white dark:bg-zinc-950">
        <div className="relative max-w-6xl mx-auto px-4 pt-20 pb-16 md:pt-28 md:pb-24">
          <div className="grid gap-12 md:grid-cols-[1.2fr_0.8fr] items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-full text-orange-500 text-sm font-medium mb-8 shadow-sm">
                <ServerOff className="w-4 h-4" />
                Your files never leave your browser
              </div>

              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-zinc-950 dark:text-white mb-6">
                PDF Tools
                <br />
                <span className="text-orange-600 dark:text-orange-400">Made Simple</span>
              </h1>

              <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mb-10 leading-relaxed">
                Every tool you need to work with PDFs in one place. Secure, intuitive, and fast — no signup required.
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Link
                  href="/edit"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-orange-500 hover:bg-orange-600 text-white rounded-full font-semibold shadow-lg shadow-orange-300/30 transition-all text-base"
                >
                  <PenLine className="w-5 h-5" />
                  Start Editing
                </Link>
                <Link
                  href="/collaborate"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-zinc-950 text-white rounded-full font-semibold hover:bg-zinc-800 transition-colors text-base"
                >
                  <Users className="w-5 h-5" />
                  Collaborate Live
                </Link>
              </div>
            </div>

            <div className="rounded-[32px] border border-orange-100 dark:border-zinc-800 bg-orange-50/80 dark:bg-zinc-900/70 p-8 shadow-xl shadow-orange-200/20">
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs uppercase tracking-[0.24em] text-zinc-500">Live PDF editing</span>
                <span className="text-xs font-semibold text-orange-600">Beta</span>
              </div>
              <div className="relative h-[320px] overflow-hidden rounded-[28px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">Page 1 of 3</span>
                </div>
                <div className="p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Edit mode</div>
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                        isSelected ? "bg-orange-500 text-white" : "bg-orange-100 dark:bg-orange-900 text-orange-600"
                      }`}>Aa</div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                        isBold ? "bg-zinc-800 text-white" : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600"
                      }`}>B</div>
                    </div>
                  </div>
                  <div className="h-[205px] rounded-3xl bg-zinc-100 dark:bg-zinc-950 p-4 shadow-inner shadow-zinc-200/50 dark:shadow-black/20 flex items-center justify-center">
                    <div
                      className={`text-2xl transition-all duration-300 ${
                        isSelected ? "bg-orange-200 dark:bg-orange-900 px-2 py-1 rounded" : ""
                      } ${isBold ? "font-bold" : "font-normal"}`}
                    >
                      {demoText}
                      <span className="animate-pulse">|</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 mt-14 text-sm text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>100% Private</span>
            </div>
            <div className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>No Signup Needed</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3 text-zinc-800 dark:text-white">Powerful PDF Tools</h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">Merge, split, compress, convert, edit, sign & collaborate on PDFs with just a few clicks.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <Link
              key={tool.name}
              href={tool.href}
              className={`group relative p-6 rounded-[28px] border transition-all duration-200 hover:shadow-xl hover:shadow-orange-200/30 dark:hover:shadow-orange-900/20 hover:-translate-y-1 ${
                tool.featured
                  ? "border-orange-200 dark:border-orange-800/50 bg-orange-50/60 dark:bg-orange-900/20"
                  : "border-orange-100 dark:border-zinc-800 bg-white dark:bg-zinc-900"
              }`}
            >
              {tool.featured && (
                <span className="absolute top-4 right-4 text-xs font-semibold px-3 py-1 bg-orange-400 text-white rounded-full shadow-sm">
                  Popular
                </span>
              )}
              <div className={`w-12 h-12 ${tool.color} rounded-2xl flex items-center justify-center mb-4 shadow-sm`}>
                <tool.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2 text-zinc-800 dark:text-white">{tool.name}</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{tool.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white dark:bg-zinc-900/50 border-y border-orange-100 dark:border-zinc-800/50">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3 text-zinc-800 dark:text-white">How It Works</h2>
            <p className="text-zinc-500 dark:text-zinc-400">Three simple steps to perfect PDFs.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {steps.map((item) => (
              <div key={item.step} className="relative text-center md:text-left">
                <span className="text-6xl font-black text-orange-200/70 dark:text-orange-900/30">{item.step}</span>
                <h3 className="font-bold text-lg mt-1 mb-2 text-zinc-800 dark:text-white">{item.title}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3 text-zinc-800 dark:text-white">Why PeerDoc?</h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
            The PDF software trusted by millions. Enjoy all the tools you need while keeping your data safe and secure.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {trustPoints.map((item) => (
            <div
              key={item.title}
              className="p-6 rounded-2xl border border-orange-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-orange-300 dark:hover:border-orange-800/50 hover:shadow-lg hover:shadow-orange-100/50 dark:hover:shadow-orange-900/10 transition-all"
            >
              <div className="w-12 h-12 bg-orange-100/80 dark:bg-orange-900/30 rounded-xl flex items-center justify-center mb-4">
                <item.icon className="w-6 h-6 text-orange-500 dark:text-orange-400" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-zinc-800 dark:text-white">{item.title}</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-orange-100 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/30">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center">
              <img src="/logo.png" alt="PeerDoc" className="h-10 w-auto object-contain" />
            </div>
            <div className="flex items-center gap-4">
              <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center">
                100% free. Your files never leave your browser.
              </p>
              <Link href="/privacy" className="text-sm text-zinc-500 hover:text-orange-500 transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-sm text-zinc-500 hover:text-orange-500 transition-colors">
                Terms
              </Link>
              <Link href="/feedback" className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-zinc-500 hover:text-orange-500 transition-colors">
                <MessageSquare className="w-3.5 h-3.5" />Feedback
              </Link>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </footer>
    </div>
  );
}
