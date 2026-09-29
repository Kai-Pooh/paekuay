'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function KitchenPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. โหลดออเดอร์เริ่มต้นที่มีสถานะ received หรือ cooking
  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['received', 'cooking'])
        .order('created_at', { ascending: true }); // เรียงจากเก่าไปใหม่

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // 2. ใช้ Supabase Realtime ฟังการ INSERT และ UPDATE ของตาราง orders
    const channel = supabase
      .channel('kitchen-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // มีออเดอร์ใหม่เข้ามา
            const newOrder = payload.new;
            if (newOrder.status === 'received' || newOrder.status === 'cooking') {
              setOrders((prev) => [...prev, newOrder]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new;
            if (updated.status === 'served') {
              // ถ้าเสิร์ฟแล้ว ให้นำการ์ดออกจากหน้าจอทันที
              setOrders((prev) => prev.filter((order) => order.id !== updated.id));
            } else {
              // อัปเดตสถานะ เช่น จาก received เป็น cooking
              setOrders((prev) =>
                prev.map((order) => (order.id === updated.id ? updated : order))
              );
            }
          } else if (payload.eventType === 'DELETE') {
            setOrders((prev) => prev.filter((order) => order.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ฟังก์ชันเปลี่ยนสถานะออเดอร์
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      // อัปเดต UI ทันที
      if (newStatus === 'served') {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      } else {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
      }
    } catch (err) {
      alert('อัปเดตสถานะไม่สำเร็จ: ' + err.message);
    }
  };

  // จัดรูปแบบเวลาให้อ่านง่าย
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#1e1e1e', color: '#fff', padding: '20px', fontFamily: 'sans-serif' }}>
      {/* ส่วนหัวจอครัว */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #333', paddingBottom: '16px', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '26px', color: '#ffb74d' }}>
            🍜 จอครัวร้านแปะก๊วย (Kitchen Display)
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#aaa', fontSize: '14px' }}>
            ออเดอร์ที่ค้างอยู่: <strong style={{ color: '#fff' }}>{orders.length}</strong> รายการ (เรียงตามคิวก่อน-หลัง)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchOrders}
            style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #555', backgroundColor: '#333', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
          >
            🔄 รีเฟรช
          </button>
          <Link
            href="/"
            style={{ padding: '8px 14px', borderRadius: '6px', backgroundColor: '#555', color: '#fff', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center' }}
          >
            หน้าแรก
          </Link>
        </div>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', fontSize: '20px', color: '#aaa' }}>
          ⏳ กำลังโหลดรายการอาหาร...
        </div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#777' }}>
          <h2 style={{ fontSize: '32px', margin: '0 0 10px 0' }}>✅ ไม่มีออเดอร์ค้าง</h2>
          <p style={{ fontSize: '16px' }}>พร้อมรับออเดอร์ใหม่จากลูกค้า</p>
        </div>
      ) : (
        /* แสดงรายการออเดอร์เป็นการ์ดแบบ Grid หลายคอลัมน์ */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '16px',
          alignItems: 'start'
        }}>
          {orders.map((order) => {
            const isCooking = order.status === 'cooking';

            return (
              <div
                key={order.id}
                style={{
                  backgroundColor: isCooking ? '#2c2515' : '#2a2a2a',
                  border: isCooking ? '2px solid #ff9800' : '2px solid #444',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                }}
              >
                {/* แถบหัวการ์ดบอกเลขโต๊ะและเวลา */}
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: isCooking ? '#ff9800' : '#424242',
                  color: isCooking ? '#000' : '#fff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                    โต๊ะ {order.table_number}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold' }}>
                      {formatTime(order.created_at)} น.
                    </div>
                    <div style={{ fontSize: '11px', opacity: 0.85 }}>
                      #{order.id}
                    </div>
                  </div>
                </div>

                {/* รายการชามก๋วยเตี๋ยว */}
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                    {Array.isArray(order.items) && order.items.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: '#1e1e1e',
                          padding: '10px',
                          borderRadius: '6px',
                          borderLeft: '4px solid #ffb74d'
                        }}
                      >
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffb74d', marginBottom: '4px' }}>
                          {item.quantity} × ชาม
                        </div>
                        <div style={{ fontSize: '14px', lineHeight: 1.4, color: '#eee' }}>
                          {item.name}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ปุ่มจัดการสถานะ */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {!isCooking ? (
                      <button
                        onClick={() => updateOrderStatus(order.id, 'cooking')}
                        style={{
                          flex: 1,
                          padding: '12px',
                          backgroundColor: '#ff9800',
                          color: '#000',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          fontSize: '15px',
                          cursor: 'pointer'
                        }}
                      >
                        🔥 เริ่มทำ
                      </button>
                    ) : (
                      <div style={{ flex: 1, textAlign: 'center', padding: '10px', color: '#ffb74d', fontWeight: 'bold', fontSize: '14px' }}>
                        ⏳ กำลังปรุง...
                      </div>
                    )}

                    <button
                      onClick={() => updateOrderStatus(order.id, 'served')}
                      style={{
                        flex: 1,
                        padding: '12px',
                        backgroundColor: '#2e7d32',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        fontSize: '15px',
                        cursor: 'pointer'
                      }}
                    >
                      ✅ จัดเสิร์ฟแล้ว
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
