import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DUDE Coach Dashboard",
  description: "Real-time vitals and workout telemetry console",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#131313] text-[#e5e2e1] min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
