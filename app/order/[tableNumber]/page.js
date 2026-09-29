'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function OrderPage({ params }) {
  // ข้อกำหนดสำคัญ: unwrap params ด้วย use() สำหรับ Next.js App Router
  const resolvedParams = use(params);
  const tableNumber = resolvedParams?.tableNumber;

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [activeTab, setActiveTab] = useState(null);

  // สถานะฟอร์มจัดชามก๋วยเตี๋ยว
  const [selectedNoodle, setSelectedNoodle] = useState('');
  const [selectedSoup, setSelectedSoup] = useState('');
  const [selectedVeg, setSelectedVeg] = useState('');
  const [selectedMeats, setSelectedMeats] = useState([]);
  const [bowlQuantity, setBowlQuantity] = useState(1);

  // ตะกร้าสินค้า
  const [cart, setCart] = useState([]);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // การเช็คบิล / ปิดโต๊ะ
  const [showBillConfirm, setShowBillConfirm] = useState(false);
  const [billClosed, setBillClosed] = useState(false);

  // 1. ตรวจสอบสถานะโต๊ะว่าเปิดอยู่หรือไม่
  useEffect(() => {
    async function checkSessionAndLoadMenu() {
      if (!tableNumber) return;

      try {
        const { data: currentSession, error: sessionErr } = await supabase
          .from('sessions')
          .select('*')
          .eq('table_number', parseInt(tableNumber, 10))
          .eq('status', 'open')
          .maybeSingle();

        if (sessionErr) throw sessionErr;

        if (currentSession) {
          setSession(currentSession);

          // โหลดหมวดหมู่และรายการตัวเลือก
          const [{ data: cats }, { data: items }] = await Promise.all([
            supabase.from('menu_categories').select('*').order('sort_order', { ascending: true }),
            supabase.from('menu_items').select('*'),
          ]);

          setCategories(cats || []);
          setMenuItems(items || []);

          if (cats && cats.length > 0) {
            setActiveTab(cats[0].id);
          }

          // ตั้งค่าเริ่มต้นของตัวเลือกก๋วยเตี๋ยว
          if (items) {
            const defaultNoodle = items.find((i) => i.name === 'เส้นเล็ก')?.name || 'เส้นเล็ก';
            const defaultSoup = items.find((i) => i.name.includes('น้ำตก'))?.name || 'น้ำตก (น้ำตกแท้เข้มข้น)';
            const defaultVeg = items.find((i) => i.name.includes('ทุกอย่าง'))?.name || 'ใส่ทุกอย่าง (ผักบุ้ง+ถั่วงอก)';
            setSelectedNoodle(defaultNoodle);
            setSelectedSoup(defaultSoup);
            setSelectedVeg(defaultVeg);
          }
        }
      } catch (err) {
        console.error('Error loading session/menu:', err);
      } finally {
        setLoading(false);
      }
    }

    checkSessionAndLoadMenu();
  }, [tableNumber]);

  // สลับเลือก/ยกเลิกเนื้อสัตว์ (เลือกได้หลายอย่าง)
  const toggleMeat = (meatName) => {
    setSelectedMeats((prev) =>
      prev.includes(meatName) ? prev.filter((m) => m !== meatName) : [...prev, meatName]
    );
  };

  // เพิ่มชามที่จัดลงตะกร้า
  const handleAddToCart = () => {
    if (!selectedNoodle || !selectedSoup || !selectedVeg) {
      alert('กรุณาเลือกเส้น น้ำซุป และผักให้ครบถ้วน');
      return;
    }

    const meatText = selectedMeats.length > 0 ? selectedMeats.join(', ') : 'ไม่ใส่เนื้อสัตว์';
    const bowlName = `${selectedNoodle} | ${selectedSoup} | ${selectedVeg} | [${meatText}]`;

    setCart((prev) => {
      // ตรวจสอบว่ามีชามแบบเดียวกันในตะกร้าหรือไม่
      const existingIndex = prev.findIndex((item) => item.name === bowlName);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += bowlQuantity;
        return updated;
      }
      return [...prev, { name: bowlName, quantity: bowlQuantity }];
    });

    // แจ้งเตือนสั้นๆ แล้วรีเซ็ตจำนวน
    setBowlQuantity(1);
    alert('เพิ่มก๋วยเตี๋ยวลงตะกร้าแล้ว!');
  };

  // ลบรายการในตะกร้า
  const removeFromCart = (index) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  // ส่งออเดอร์เข้าครัว
  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;
    if (cart.length > 10) {
      alert('สั่งได้สูงสุด 10 รายการต่อครั้ง');
      return;
    }

    setSubmittingOrder(true);
    try {
      const { error } = await supabase.from('orders').insert([
        {
          session_id: session.id,
          table_number: parseInt(tableNumber, 10),
          items: cart,
          status: 'received',
        },
      ]);

      if (error) throw error;

      setCart([]);
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('ส่งออเดอร์ไม่สำเร็จ: ' + err.message);
    } finally {
      setSubmittingOrder(false);
    }
  };

  // ปิดโต๊ะ / ชำระเงิน (ราคาบุฟเฟต์ ผู้ใหญ่ 289, เด็ก 145 ตามตัวอย่างระบบ)
  const handleCloseSession = async () => {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'closed' })
        .eq('id', session.id);

      if (error) throw error;

      setShowBillConfirm(false);
      setBillClosed(true);
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเรียกเก็บเงิน: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px 16px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2>⏳ กำลังโหลดข้อมูลโต๊ะ...</h2>
      </div>
    );
  }

  // หากไม่มี session หรือสถานะไม่ใช่ open
  if (!session || billClosed) {
    return (
      <div style={{ maxWidth: '420px', margin: '60px auto', padding: '24px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h1 style={{ fontSize: '48px', margin: '0 0 16px 0' }}>🍜</h1>
        <h2 style={{ color: '#8B0000', marginBottom: '8px' }}>
          {billClosed ? 'ขอบคุณที่ใช้บริการร้านแปะก๊วย' : 'โต๊ะนี้ยังไม่เปิดใช้งาน'}
        </h2>
        <p style={{ color: '#666', lineHeight: 1.6 }}>
          {billClosed
            ? 'ระบบได้บันทึกการเรียกเก็บเงินเรียบร้อยแล้ว ขอให้เดินทางโดยสวัสดิภาพครับ'
            : 'กรุณาแจ้งพนักงานหน้าร้านเพื่อเปิดโต๊ะก่อนสแกนสั่งอาหาร'}
        </p>
        <Link href="/" style={{ display: 'inline-block', marginTop: '20px', color: '#1976d2', textDecoration: 'none' }}>
          ← กลับหน้าแรก
        </Link>
      </div>
    );
  }

  const noodleItems = menuItems.filter((i) => categories.find((c) => c.name === 'เส้น')?.id === i.category_id);
  const soupItems = menuItems.filter((i) => categories.find((c) => c.name === 'น้ำซุป')?.id === i.category_id);
  const vegItems = menuItems.filter((i) => categories.find((c) => c.name === 'ผัก')?.id === i.category_id);
  const meatItems = menuItems.filter((i) => categories.find((c) => c.name === 'เนื้อสัตว์')?.id === i.category_id);

  const totalBill = (session.adult_count || 0) * 289 + (session.child_count || 0) * 145;

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto', padding: '16px 16px 120px 16px', fontFamily: 'sans-serif' }}>
      {/* ส่วนหัวแสดงโต๊ะและปุ่มเรียกเก็บเงิน */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        backgroundColor: '#8B0000',
        color: '#fff',
        borderRadius: '12px',
        marginBottom: '16px'
      }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>โต๊ะ {tableNumber} | แปะก๊วย</div>
          <div style={{ fontSize: '13px', opacity: 0.9 }}>
            ผู้ใหญ่ {session.adult_count} ท่าน | เด็ก {session.child_count} ท่าน
          </div>
        </div>
        <button
          onClick={() => setShowBillConfirm(true)}
          style={{
            backgroundColor: '#ffb74d',
            color: '#000',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '6px',
            fontWeight: 'bold',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          💳 เรียกเก็บเงิน
        </button>
      </div>

      {orderSuccess && (
        <div style={{
          backgroundColor: '#d4edda',
          color: '#155724',
          padding: '12px',
          borderRadius: '8px',
          textAlign: 'center',
          marginBottom: '16px',
          fontWeight: 'bold'
        }}>
          ✅ ส่งออเดอร์เข้าครัวเรียบร้อยแล้ว! สามารถสั่งเพิ่มได้ตลอดครับ
        </div>
      )}

      {/* ฟอร์มเลือกส่วนผสมก๋วยเตี๋ยว */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '17px', color: '#8B0000', borderBottom: '2px solid #f0f0f0', paddingBottom: '6px' }}>
          🥣 จัดชามก๋วยเตี๋ยวเรือ
        </h3>

        {/* 1. เลือกเส้น */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', fontSize: '14px', marginBottom: '6px' }}>1. เลือกเส้น *</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {noodleItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedNoodle(item.name)}
                style={{
                  padding: '8px',
                  borderRadius: '6px',
                  border: selectedNoodle === item.name ? '2px solid #8B0000' : '1px solid #ddd',
                  backgroundColor: selectedNoodle === item.name ? '#fff5f5' : '#fff',
                  fontWeight: selectedNoodle === item.name ? 'bold' : 'normal',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        {/* 2. เลือกน้ำซุป */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', fontSize: '14px', marginBottom: '6px' }}>2. เลือกน้ำซุป *</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {soupItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedSoup(item.name)}
                style={{
                  padding: '8px',
                  borderRadius: '6px',
                  border: selectedSoup === item.name ? '2px solid #8B0000' : '1px solid #ddd',
                  backgroundColor: selectedSoup === item.name ? '#fff5f5' : '#fff',
                  fontWeight: selectedSoup === item.name ? 'bold' : 'normal',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        {/* 3. เลือกผัก */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', fontSize: '14px', marginBottom: '6px' }}>3. ผัก *</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {vegItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedVeg(item.name)}
                style={{
                  padding: '8px',
                  borderRadius: '6px',
                  border: selectedVeg === item.name ? '2px solid #8B0000' : '1px solid #ddd',
                  backgroundColor: selectedVeg === item.name ? '#fff5f5' : '#fff',
                  fontWeight: selectedVeg === item.name ? 'bold' : 'normal',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        {/* 4. เลือกเนื้อสัตว์/ท็อปปิ้ง (เลือกได้หลายอย่าง) */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', fontSize: '14px', marginBottom: '6px' }}>
            4. เนื้อสัตว์ / ตีนไก่ / ลูกชิ้น (เลือกได้หลายอย่าง)
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {meatItems.map((item) => {
              const isSelected = selectedMeats.includes(item.name);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleMeat(item.name)}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: isSelected ? '2px solid #8B0000' : '1px solid #ddd',
                    backgroundColor: isSelected ? '#8B0000' : '#fff',
                    color: isSelected ? '#fff' : '#333',
                    fontWeight: isSelected ? 'bold' : 'normal',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  {isSelected ? `✓ ${item.name}` : `+ ${item.name}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* จำนวนชาม + ปุ่มใส่ตะกร้า */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #ccc', borderRadius: '6px' }}>
            <button
              type="button"
              onClick={() => setBowlQuantity(Math.max(1, bowlQuantity - 1))}
              style={{ width: '36px', height: '36px', border: 'none', background: '#f0f0f0', cursor: 'pointer', fontSize: '18px' }}
            >
              -
            </button>
            <span style={{ width: '36px', textAlign: 'center', fontWeight: 'bold' }}>{bowlQuantity}</span>
            <button
              type="button"
              onClick={() => setBowlQuantity(Math.min(5, bowlQuantity + 1))}
              style={{ width: '36px', height: '36px', border: 'none', background: '#f0f0f0', cursor: 'pointer', fontSize: '18px' }}
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: '#8B0000',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            + เพิ่มชามนี้ลงตะกร้า
          </button>
        </div>
      </div>

      {/* ตะกร้าสินค้าด้านล่าง */}
      {cart.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#fff',
          borderTop: '2px solid #8B0000',
          padding: '12px 16px',
          boxShadow: '0 -4px 12px rgba(0,0,0,0.15)',
          maxHeight: '40vh',
          overflowY: 'auto',
          zIndex: 900
        }}>
          <div style={{ maxWidth: '520px', margin: '0 auto' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
              <span>🛒 ตะกร้าออเดอร์ ({cart.reduce((sum, item) => sum + item.quantity, 0)} ชาม)</span>
              <span style={{ fontSize: '12px', color: '#666' }}>ส่งได้สูงสุด 10 รายการ</span>
            </div>

            <div style={{ marginBottom: '10px' }}>
              {cart.map((item, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '4px 0', borderBottom: '1px dashed #eee' }}>
                  <div style={{ flex: 1, paddingRight: '8px' }}>
                    <strong>{item.quantity}x</strong> {item.name}
                  </div>
                  <button
                    onClick={() => removeFromCart(index)}
                    style={{ color: '#d32f2f', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '12px' }}
                  >
                    ลบ
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleSubmitOrder}
              disabled={submittingOrder}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: submittingOrder ? '#aaa' : '#2e7d32',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '15px',
                cursor: submittingOrder ? 'not-allowed' : 'pointer'
              }}
            >
              {submittingOrder ? 'กำลังส่งเข้าครัว...' : '🚀 ยืนยันส่งออเดอร์เข้าครัว'}
            </button>
          </div>
        </div>
      )}

      {/* Pop-up ยืนยันเรียกเก็บเงิน */}
      {showBillConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 1000
        }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', maxWidth: '360px', width: '100%', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#8B0000' }}>สรุปยอดชำระเงิน</h3>
            <p style={{ margin: '6px 0', fontSize: '15px' }}>
              ผู้ใหญ่ {session.adult_count} ท่าน × 289 บาท = {session.adult_count * 289} บาท
            </p>
            <p style={{ margin: '6px 0', fontSize: '15px' }}>
              เด็ก {session.child_count} ท่าน × 145 บาท = {session.child_count * 145} บาท
            </p>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2e7d32', margin: '14px 0' }}>
              ยอดรวมทั้งสิ้น {totalBill} บาท
            </div>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '18px' }}>
              *เมื่อกดยืนยัน โต๊ะจะถูกปิดและไม่สามารถสั่งเพิ่มได้
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowBillConfirm(false)}
                style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff', cursor: 'pointer' }}
              >
                สั่งอาหารต่อ
              </button>
              <button
                type="button"
                onClick={handleCloseSession}
                style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', backgroundColor: '#8B0000', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
              >
                ยืนยันเช็คบิล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
