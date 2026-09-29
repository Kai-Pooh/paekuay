# ร้านก๋วยเตี๋ยวเรือแปะก๊วย — ระบบสั่งอาหาร

## Stack
- Next.js (App Router) — **JavaScript ไม่ใช้ TypeScript**
- Supabase (ฐานข้อมูลมีอยู่แล้ว ไม่ต้องสร้างตาราง)
- Deploy บน Vercel

## Environment variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

ใช้ client จาก `lib/supabaseClient.js`:
`import { supabase } from "@/lib/supabaseClient";`

## เส้นทาง (routes)
| Path | ใช้ทำอะไร |
|------|-----------|
| `/` | หน้าแรก |
| `/generate-qr` | พนักงานเปิดโต๊ะและสร้าง QR |
| `/kitchen` | จอครัว |
| (ยังไม่ได้ทำ) หน้าสั่งอาหาร | dynamic route ให้ลูกค้าสแกน QR |

## โครงสร้างตารางใน Supabase (มีอยู่แล้ว)
- **sessions**: `id`, `table_number`, `adult_count`, `child_count`, `status`, `created_at`
- **menu_categories**: `id`, `name`, `sort_order`
- **menu_items**: `id`, `category_id`, `name`
- **orders**: `id`, `session_id`, `table_number`, `items` (jsonb), `status`, `created_at`

## ⚠️ กฎสำคัญ: Dynamic Route params เป็น Promise
โปรเจกต์นี้ใช้ Next.js เวอร์ชันล่าสุด ซึ่ง `params` ของ Dynamic Route
(เช่น `app/order/[sessionId]/page.js`) เป็น **Promise**
ต้อง unwrap ด้วย `use()` จาก React เสมอ ห้ามอ่านค่าตรงๆ เช่น `params.sessionId`

ตัวอย่าง (Client Component — หน้าสั่งอาหารต้องเป็นแบบนี้):

```jsx
"use client";

import { use } from "react";

export default function OrderPage({ params }) {
  const { sessionId } = use(params);
  // ...ใช้ sessionId ได้เลย
}
```

หมายเหตุ:
- `searchParams` ก็เป็น Promise เหมือนกัน ต้อง `use(searchParams)` เช่นกัน
- ถ้าเป็น Server Component (ไม่มี "use client") ให้ใช้ `async` + `await params` แทน
