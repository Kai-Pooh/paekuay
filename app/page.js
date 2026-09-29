import Link from "next/link";

export default function HomePage() {
  return (
    <main className="home">
      <div className="home-card">
        <div className="steam" aria-hidden="true">
          <span>〰</span>
          <span>〰</span>
          <span>〰</span>
        </div>

        <div className="bowl" aria-hidden="true">🍜</div>

        <p className="eyebrow">ยินดีต้อนรับสู่</p>
        <h1 className="shop-name">ร้านก๋วยเตี๋ยวเรือแปะก๊วย</h1>
        <p className="tagline">น้ำซุปเข้มข้น เส้นนุ่ม หอมเครื่องเทศ สูตรต้นตำรับ</p>

        <div className="divider" aria-hidden="true">
          <span />
          <i>❖</i>
          <span />
        </div>

        <nav className="actions">
          <Link href="/generate-qr" className="btn btn-primary">
            <span className="btn-icon">📲</span>
            <span>
              <strong>เปิดโต๊ะ / สร้าง QR</strong>
              <small>สำหรับพนักงาน</small>
            </span>
          </Link>

          <Link href="/kitchen" className="btn btn-secondary">
            <span className="btn-icon">👨‍🍳</span>
            <span>
              <strong>จอครัว</strong>
              <small>ดูออเดอร์ที่เข้ามา</small>
            </span>
          </Link>
        </nav>
      </div>

      <footer className="footer">ก๋วยเตี๋ยวเรือแปะก๊วย · ระบบสั่งอาหารผ่าน QR</footer>
    </main>
  );
}
