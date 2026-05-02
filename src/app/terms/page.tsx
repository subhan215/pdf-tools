import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Use | PeerDoc",
  description: "Basic terms for using PeerDoc.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-orange-50/30 dark:bg-zinc-950">
      <header className="border-b border-orange-100 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/" className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 w-fit">
            <ArrowLeft className="w-4 h-4" />Back
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-orange-100 dark:border-zinc-800 p-6 md:p-10">
          <h1 className="text-3xl font-bold text-zinc-800 dark:text-white mb-3">Terms of Use</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">Last updated: May 2, 2026</p>

          <div className="space-y-8 text-zinc-600 dark:text-zinc-300 leading-7">
            <section>
              <h2 className="text-xl font-semibold text-zinc-800 dark:text-white mb-2">Use of the service</h2>
              <p>
                PeerDoc provides browser-based PDF tools for personal and business use. You agree to use the service lawfully
                and not to misuse it, interfere with it, or attempt to access systems or data that are not meant for you.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-zinc-800 dark:text-white mb-2">Your content</h2>
              <p>
                You are responsible for the files, text, images, and other material you process through PeerDoc. You should
                only use documents that you have the right to edit, share, or distribute.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-zinc-800 dark:text-white mb-2">Availability</h2>
              <p>
                We may change, improve, limit, or remove features at any time. We do not guarantee uninterrupted availability
                or that every feature will work perfectly on every browser, device, or document.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-zinc-800 dark:text-white mb-2">No warranty</h2>
              <p>
                The service is provided on an “as is” and “as available” basis without warranties of any kind. You should
                keep backups of important files and verify outputs before relying on them for legal, financial, medical, or other critical use.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-zinc-800 dark:text-white mb-2">Limitation of liability</h2>
              <p>
                To the maximum extent allowed by law, PeerDoc and its operators will not be liable for indirect, incidental,
                special, consequential, or punitive damages arising from use of the service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-zinc-800 dark:text-white mb-2">Contact</h2>
              <p>
                If you need to report an issue or ask a question about these terms, use the feedback page.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
