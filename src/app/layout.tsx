import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Expense Tracker",
  description: "Track expenses, income and account balances",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#08090d",
};

// Applies the saved theme to <html> before first paint, so a light-theme
// user never sees a flash of the default dark palette on load.
const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem('expenseTracker.theme');if(t==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-base text-primary">
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <ToastProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
