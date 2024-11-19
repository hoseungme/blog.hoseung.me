import "./style.scss";
import { ReactNode } from "react";
import { Layout } from "./content/Layout";

const GAScript = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());

gtag('config', 'G-EK99NNHV7V');
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-EK99NNHV7V"></script>
        <script>{GAScript}</script>
      </head>
      <body className="antialiased">
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
