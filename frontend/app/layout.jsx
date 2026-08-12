import "./globals.css";

export const metadata = {
  title: "AI Software Factory",
  description: "Watch the AI engineering team work",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
