import "./globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import { QueryProvider } from "@/providers/query-provider";
import { createMetadata } from "@/lib/metadata";
import { APP_NAME } from "@/constant";
import { Toaster } from "@/components/ui/sonner";
import { geistMono, geistSans, specialElite } from "@/lib/fonts";

export const metadata = createMetadata({
  title: {
    template: `%s | ${APP_NAME}`,
    default: APP_NAME,
  },
  description: "Zimunda Booking",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${specialElite.className} ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
            attribute="class"
            //defaultTheme="system"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <QueryProvider>
              <div className="relative flex min-h-screen flex-col">
                <main>{children}</main>
              </div>
              <Toaster richColors position="top-right" />
            </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
