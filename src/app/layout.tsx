import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Real Estate Genie — Agent Dashboard",
  description: "Generate premium investment PDFs for your real estate clients in minutes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <NavBar />
        <main className="flex-1 w-full pb-20 md:pb-0">{children}</main>
      </body>
    </html>
  );
}
