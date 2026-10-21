import { Inter } from "next/font/google";
import "./globals.css";
import NavigationRail from "@/components/layout/NavigationRail";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "OxFin - Global Financial Intelligence",
  description: "Minimalist Fintech Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
          <div className="flex min-h-screen bg-background text-foreground">
            {/* Main Layout Grid */}
            <NavigationRail />
            <main className="flex-1 lg:pl-64 transition-all duration-300">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
