'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function GenerateQRPage() {
  const [tableNumber, setTableNumber] = useState('');
  const [adultCount, setAdultCount] = useState('1');
  const [childCount, setChildCount] = useState('0');
  const [loading, setLoading] = useState(false);

  // สถานะแจ้งเตือนโต๊ะค้าง
  const [existingSession, setExistingSession] = useState(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [minutesOpen, setMinutesOpen] = useState(0);

  // สถานะเมื่อสร้าง QR สำเร็จ
  const [createdSession, setCreatedSession] = useState(null);
  const [copied, setCopied] = useState(false);

  // คำนวณเวลาที่เปิดโต๊ะมาแล้วกี่นาที
  const calculateMinutes = (createdAt) => {
    const diffMs = new Date() - new Date(createdAt);
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  // จัดการการเปิดโต๊ะ
  const handleOpenTable = async (e) => {
    e.preventDefault();
    if (!tableNumber || parseInt(tableNumber) <= 0) {
      alert('กรุณากรอกเลขโต๊ะให้ถูกต้อง');
      return;
    }

    setLoading(true);
    setExistingSession(null);

    try {
      const tableNum = parseInt(tableNumber, 10);

      // 1. ตรวจสอบว่าโต๊ะนี้มี session ที่ยัง 'open' หรือไม่
      const { data: openSessions, error: checkError } = await supabase
        .from('sessions')
        .select('id, table_number, adult_count, child_count, created_at, status')
        .eq('table_number', tableNum)
        .eq('status', 'open')
        .maybeSingle();

      if (checkError) throw checkError;

      if (openSessions) {
        // มี session ค้างอยู่ -> แสดงกล่องเตือน
        setExistingSession(openSessions);
        setMinutesOpen(calculateMinutes(openSessions.created_at));
        setLoading(false);
        return;
      }

      // 2. ถ้าไม่มี ให้สร้าง session ใหม่
      const { data: newSession, error: insertError } = await supabase
        .from('sessions')
        .insert([
          {
            table_number: tableNum,
            adult_count: parseInt(adultCount, 10) || 0,
            child_count: parseInt(childCount, 10) || 0,
            status: 'open',
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      setCreatedSession(newSession);
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาด: ' + (err.message || 'ไม่สามารถเปิดโต๊ะได้'));
    } finally {
      setLoading(false);
    }
  };

  // ยืนยันการปิดออเดอร์เดิม
  const handleConfirmClose = async () => {
    if (!existingSession) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'closed' })
        .eq('id', existingSession.id)
        .eq('status', 'open'); // ป้องกันการกดปิดซ้ำซ้อน

      if (error) throw error;

      // เคลียร์กล่องเตือน ข้อมูลฟอร์มยังคงเดิมเพื่อให้กดเปิดโต๊ะใหม่ได้ทันที
      setShowConfirmClose(false);
      setExistingSession(null);
      alert('ปิดออเดอร์เดิมของโต๊ะ ' + existingSession.table_number + ' เรียบร้อยแล้ว กรุณากด "เปิดโต๊ะ" อีกครั้ง');
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการปิดโต๊ะ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ปุ่มเปิดโต๊ะใหม่ (รีเซ็ตฟอร์ม)
  const handleResetForm = () => {
    setCreatedSession(null);
    setTableNumber('');
    setAdultCount('1');
    setChildCount('0');
    setExistingSession(null);
    setShowConfirmClose(false);
  };

  // URL สำหรับสั่งอาหารของโต๊ะ
  const orderUrl = typeof window !== 'undefined' && createdSession
    ? `${window.location.origin}/order/${createdSession.table_number}`
    : '';

  const copyToClipboard = () => {
    if (!orderUrl) return;
    navigator.clipboard.writeText(orderUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 16px', fontFamily: 'sans-serif' }}>
      <header style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#8B0000', margin: '0 0 6px 0' }}>
          🍜 ร้านก๋วยเตี๋ยวเรือแปะก๊วย
        </h1>
        <p style={{ color: '#555', margin: 0, fontSize: '15px' }}>ระบบเปิดโต๊ะและสร้าง QR Code สำหรับลูกค้า</p>
      </header>

      {/* 1. แสดงผลลัพธ์ QR Code เมื่อเปิดโต๊ะสำเร็จ */}
      {createdSession ? (
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
          textAlign: 'center',
          border: '2px solid #8B0000'
        }}>
          <h2 style={{ color: '#2e7d32', marginTop: 0, fontSize: '22px' }}>✅ เปิดโต๊ะสำเร็จ!</h2>
          <div style={{ margin: '18px 0' }}>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(orderUrl)}`}
              alt={`QR Code โต๊ะ ${createdSession.table_number}`}
              style={{ width: '240px', height: '240px', display: 'block', margin: '0 auto', borderRadius: '8px' }}
            />
          </div>

          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', marginBottom: '8px' }}>
            โต๊ะ {createdSession.table_number}
          </div>
          <div style={{ fontSize: '15px', color: '#666', marginBottom: '16px' }}>
            ผู้ใหญ่ {createdSession.adult_count} ท่าน | เด็ก {createdSession.child_count} ท่าน
          </div>

          <div style={{
            backgroundColor: '#f5f5f5',
            padding: '10px',
            borderRadius: '6px',
            fontSize: '13px',
            wordBreak: 'break-all',
            marginBottom: '14px',
            color: '#444'
          }}>
            {orderUrl}
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              onClick={copyToClipboard}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #ccc',
                backgroundColor: copied ? '#4caf50' : '#fff',
                color: copied ? '#fff' : '#333',
                fontSize: '15px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              {copied ? 'คัดลอกสำเร็จ!' : '📋 คัดลอกลิงก์'}
            </button>
            <a
              href={`/order/${createdSession.table_number}`}
              target="_blank"
              rel="noreferrer"
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: '#1976d2',
                color: '#fff',
                textAlign: 'center',
                textDecoration: 'none',
                fontSize: '15px',
                fontWeight: 'bold',
                display: 'inline-block'
              }}
            >
              🚀 ทดลองเปิดหน้าสั่ง
            </a>
          </div>

          <button
            onClick={handleResetForm}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#8B0000',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            + เปิดโต๊ะใหม่ถัดไป
          </button>
        </div>
      ) : (
        /* 2. ฟอร์มกรอกข้อมูลเปิดโต๊ะ */
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.08)'
        }}>
          {/* กล่องเตือนเมื่อโต๊ะค้าง */}
          {existingSession && (
            <div style={{
              backgroundColor: '#fff3cd',
              border: '2px solid #ffc107',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '20px',
              color: '#856404'
            }}>
              <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '6px' }}>
                ⚠️ โต๊ะนี้มีลูกค้าอยู่ระหว่างทานอาหาร
              </div>
              <p style={{ margin: '0 0 12px 0', fontSize: '14px' }}>
                โต๊ะ {existingSession.table_number} มี Session ที่ยังไม่ถูกปิด กรุณาปิดออเดอร์เดิมก่อน
              </p>
              <button
                type="button"
                onClick={() => setShowConfirmClose(true)}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#dc3545',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  fontSize: '15px',
                  cursor: 'pointer'
                }}
              >
                ปิดออเดอร์เดิมของโต๊ะ {existingSession.table_number}
              </button>
            </div>
          )}

          <form onSubmit={handleOpenTable}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '16px', fontWeight: 'bold', marginBottom: '6px', color: '#333' }}>
                หมายเลขโต๊ะ *
              </label>
              <input
                type="number"
                min="1"
                placeholder="ระบุเลขโต๊ะ เช่น 1, 2, 5"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: '18px',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '22px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '15px', fontWeight: 'bold', marginBottom: '6px', color: '#333' }}>
                  ผู้ใหญ่ (คน)
                </label>
                <input
                  type="number"
                  min="0"
                  value={adultCount}
                  onChange={(e) => setAdultCount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '16px',
                    borderRadius: '8px',
                    border: '1px solid #ccc',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '15px', fontWeight: 'bold', marginBottom: '6px', color: '#333' }}>
                  เด็ก (คน)
                </label>
                <input
                  type="number"
                  min="0"
                  value={childCount}
                  onChange={(e) => setChildCount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '16px',
                    borderRadius: '8px',
                    border: '1px solid #ccc',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: loading ? '#aaa' : '#8B0000',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '17px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'กำลังตรวจสอบ...' : '🚀 เปิดโต๊ะและสร้าง QR'}
            </button>
          </form>
        </div>
      )}

      {/* กล่อง Pop-up ยืนยันปิดโต๊ะเดิม */}
      {showConfirmClose && existingSession && (
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
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '380px',
            width: '100%',
            textAlign: 'center'
          }}>
            <h3 style={{ color: '#dc3545', margin: '0 0 12px 0', fontSize: '20px' }}>⚠️ ยืนยันปิดโต๊ะเดิม?</h3>
            <p style={{ fontSize: '15px', color: '#444', lineHeight: 1.5, margin: '0 0 18px 0' }}>
              โต๊ะ {existingSession.table_number} <br />
              ผู้ใหญ่ {existingSession.adult_count} ท่าน | เด็ก {existingSession.child_count} ท่าน <br />
              <strong>เปิดมาแล้ว {minutesOpen} นาที</strong>
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowConfirmClose(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #ccc',
                  backgroundColor: '#fff',
                  cursor: 'pointer',
                  fontSize: '15px'
                }}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmClose}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#dc3545',
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '15px'
                }}
              >
                {loading ? 'กำลังปิด...' : 'ยืนยันปิดโต๊ะเดิม'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '24px' }}>
        <Link href="/" style={{ color: '#666', textDecoration: 'none', fontSize: '14px' }}>
          ← กลับหน้าแรก
        </Link>
      </div>
    </div>
  );
}
