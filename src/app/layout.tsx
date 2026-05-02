import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PeerDoc - Free Online PDF Editor & Collaborator",
  description: "Free, private PDF tools. Edit, create, merge, split, compress PDFs. Collaborate across devices in real-time. No signup required. 100% browser-based.",
  keywords: ["PDF editor", "PDF tools", "merge PDF", "split PDF", "compress PDF", "collaborate PDF", "free PDF editor", "PeerDoc"],
  authors: [{ name: "PeerDoc" }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  openGraph: {
    title: "PeerDoc - Free Online PDF Editor & Collaborator",
    description: "Free, private PDF tools. Collaborate across devices in real-time. No signup required.",
    type: "website",
  },
};

const themeScript = `
  (function() {
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark');
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
