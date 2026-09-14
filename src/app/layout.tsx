import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";
import "./readability.css";
export const metadata: Metadata = {
  title: {
    default: "Synapse — Your expertise. Ready to answer.",
    template: "%s · Synapse",
  },
  description:
    "Turn your documents, interviews, and real-world experience into an AI knowledge capsule. Review every insight, control who can use it, and keep every answer connected to its source.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
