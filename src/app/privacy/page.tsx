import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | PeerDoc",
  description: "How PeerDoc handles your files, feedback, and basic service data.",
};

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-bold text-zinc-800 dark:text-white mb-3">Privacy Policy</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">Last updated: May 2, 2026</p>

          <div className="space-y-8 text-zinc-600 dark:text-zinc-300 leading-7">
            <section>
              <h2 className="text-xl font-semibold text-zinc-800 dark:text-white mb-2">Overview</h2>
              <p>
                PeerDoc is designed to keep document processing in your browser whenever possible. Most PDF editing,
                merging, splitting, compression, and export actions happen locally on your device.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-zinc-800 dark:text-white mb-2">Files and document content</h2>
              <p>
                We do not intentionally upload the contents of your PDFs to our servers for normal tool usage. Your files
                stay in your browser unless a specific feature clearly requires external syncing or storage.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-zinc-800 dark:text-white mb-2">Collaboration</h2>
              <p>
                The collaboration feature uses Supabase Realtime to synchronize edits and session state between participants.
                If you use collaboration, document state and related editing data may be transmitted through that service so
                the session can function correctly.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-zinc-800 dark:text-white mb-2">Feedback submissions</h2>
              <p>
                If you submit feedback, we may store the name, email address, category, message, and submission time that
                you provide. We use that information only to review product feedback, reply when appropriate, and improve the service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-zinc-800 dark:text-white mb-2">Local storage</h2>
              <p>
                PeerDoc may store small amounts of data in your browser, such as theme preference, saved local sessions,
                and other settings needed to improve usability.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-zinc-800 dark:text-white mb-2">Third-party services</h2>
              <p>
                We currently rely on Supabase for parts of authentication, feedback storage, and realtime collaboration.
                Their handling of service data is governed by their own terms and privacy practices.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-zinc-800 dark:text-white mb-2">Contact</h2>
              <p>
                If you have a privacy question, use the feedback page and mark your message appropriately so we can review it.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
