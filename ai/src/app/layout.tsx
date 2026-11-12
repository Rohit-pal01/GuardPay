export const metadata = {
  title: "Mandate - Autonomous AI Shopping Governed by Code",
  description: "Mandate lets an AI agent shop and pay with PayPal while code enforces spending limits.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "sans-serif", margin: 0, padding: "20px" }}>
        {children}
      </body>
    </html>
  );
}

