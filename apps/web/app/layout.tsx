import type { ReactNode } from "react";

export const metadata = {
  title: "Riffle",
  description: "Generative UI security agent powered by Sentinel findings.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
