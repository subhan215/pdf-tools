import Link from "next/link";
import {
  Users,
  PenLine,
  Merge,
  Scissors,
  FileDown,
  Shield,
  Zap,
  Lock,
  Stamp,
  FileImage,
  ServerOff,
  ArrowRight,
  Sparkles,
  Globe,
  MessageSquare,
} from "lucide-react";
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
    title: "P2P Collaboration",
    description: "Direct peer-to-peer connection. No middleman. End-to-end encrypted sync across devices.",
  },
  {
    icon: Zap,
    title: "No Limits, Ever",
    description: "Unlimited file size, unlimited files, no watermarks. Free forever — no catches.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-orange-50/30 dark:bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/70 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-orange-100 dark:border-zinc-800/50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-300 to-orange-500 rounded-xl flex items-center justify-center shadow-md shadow-orange-400/25">
              <span className="text-white font-bold text-sm">PD</span>
            </div>
            <span className="font-bold text-lg tracking-tight text-orange-950 dark:text-white">PeerDoc</span>
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
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-orange-100/60 via-orange-50/30 to-white dark:from-orange-950/30 dark:via-zinc-950 dark:to-zinc-950" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-orange-200/30 dark:bg-orange-900/10 rounded-full blur-3xl" />
        <div className="relative max-w-6xl mx-auto px-4 pt-20 pb-16 md:pt-28 md:pb-24">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800/50 rounded-full text-orange-500 dark:text-orange-400 text-sm font-medium mb-8 shadow-sm">
              <ServerOff className="w-4 h-4" />
              Your files never leave your browser
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                PDF Tools
              </span>
              <br />
              <span className="text-zinc-800 dark:text-white text-3xl md:text-4xl lg:text-5xl font-bold">
                That Respect Your Privacy
              </span>
            </h1>

            <p className="text-lg md:text-xl text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto mb-10 leading-relaxed">
              Edit, merge, split, compress &amp; collaborate on PDFs. Everything runs locally in your browser. No signup. No uploads. No limits.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/edit"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-orange-400 hover:bg-orange-500 text-white rounded-xl font-semibold shadow-lg shadow-orange-400/30 hover:shadow-orange-500/40 transition-all text-base"
              >
                <PenLine className="w-5 h-5" />
                Start Editing
              </Link>
              <Link
                href="/collaborate"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white hover:bg-orange-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-orange-200 dark:border-zinc-700 rounded-xl font-semibold transition-colors text-base text-orange-700 dark:text-white"
              >
                <Users className="w-5 h-5" />
                Collaborate Live
              </Link>
            </div>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-14 text-sm text-orange-400/80 dark:text-orange-500/60">
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              <span>100% Private</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-orange-300 dark:bg-orange-800" />
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>No Signup Needed</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-orange-300 dark:bg-orange-800" />
            <div className="flex items-center gap-1.5">
              <Globe className="w-4 h-4" />
              <span>Works Everywhere</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3 text-zinc-800 dark:text-white">Everything You Need</h2>
          <p className="text-zinc-500 dark:text-zinc-400">Powerful PDF tools, all running locally in your browser.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {tools.map((tool) => (
            <Link
              key={tool.name}
              href={tool.href}
              className={`group relative p-5 rounded-2xl border transition-all duration-200 hover:shadow-lg hover:shadow-orange-200/40 dark:hover:shadow-orange-900/20 hover:-translate-y-1 ${
                tool.featured
                  ? "col-span-2 sm:col-span-1 border-orange-200 dark:border-orange-800/50 bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-zinc-900"
                  : "border-orange-100 dark:border-zinc-800 hover:border-orange-300 dark:hover:border-orange-800/50 bg-white dark:bg-zinc-900"
              }`}
            >
              {tool.featured && (
                <span className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 bg-orange-400 text-white rounded-full">
                  Popular
                </span>
              )}
              <div className={`w-11 h-11 ${tool.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm`}>
                <tool.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold mb-1 text-zinc-800 dark:text-white">{tool.name}</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{tool.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white dark:bg-zinc-900/50 border-y border-orange-100 dark:border-zinc-800/50">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3 text-zinc-800 dark:text-white">Simple as 1-2-3</h2>
            <p className="text-zinc-500 dark:text-zinc-400">No learning curve. No account. Just results.</p>
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
            We built the PDF tool we wished existed. Private, fast, and truly free.
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

      {/* CTA Banner */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-300 via-orange-400 to-orange-500 p-10 md:p-14 text-center text-white">
          <div className="relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Ready to maaryo your PDFs?</h2>
            <p className="text-white/80 mb-8 max-w-lg mx-auto">
              Jump in and start editing. No signup, no credit card, no nonsense.
            </p>
            <Link
              href="/edit"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-orange-500 rounded-xl font-semibold hover:bg-orange-50 transition-colors shadow-lg"
            >
              Start Free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full -translate-y-1/3 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/10 rounded-full translate-y-1/3 -translate-x-1/3" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-200/10 rounded-full" />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-orange-100 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/30">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-300 to-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">PD</span>
              </div>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">PeerDoc</span>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center">
                100% free. Your files never leave your browser.
              </p>
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
