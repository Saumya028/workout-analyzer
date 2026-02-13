import "./globals.css";
import Navbar from "./components/Navbar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <Navbar />
        <main className="pt-24 max-w-6xl mx-auto px-6">
          {children}
        </main>
      </body>
    </html>
  );
}
