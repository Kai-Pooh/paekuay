import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "700", "800"],
  display: "swap",
});

export const metadata = {
  title: "ร้านก๋วยเตี๋ยวเรือแปะก๊วย",
  description: "ระบบสั่งอาหารร้านก๋วยเตี๋ยวเรือแปะก๊วย",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body className={notoSansThai.className}>{children}</body>
    </html>
  );
}
