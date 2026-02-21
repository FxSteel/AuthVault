'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    })
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      zIndex: 1,
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '64px', height: '64px',
            background: 'linear-gradient(135deg, #00e5ff, #7c3aed)',
            borderRadius: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '32px',
            margin: '0 auto 16px',
            boxShadow: '0 0 30px rgba(0,229,255,0.3)',
          }}>🔐</div>
          <h1 style={{
            fontSize: '28px', fontWeight: 800,
            color: '#e2e8f0', letterSpacing: '-0.5px',
            fontFamily: 'var(--font-syne)',
          }}>
            Auth<span style={{ color: '#00e5ff' }}>Vault</span>
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '6px' }}>
            Autenticador 2FA seguro
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#0d1117',
          border: '1px solid #1e2d3d',
          borderRadius: '20px',
          padding: '32px',
        }}>
          {!sent ? (
            <>
              <h2 style={{
                fontSize: '18px', fontWeight: 700,
                color: '#e2e8f0', marginBottom: '8px',
                fontFamily: 'var(--font-syne)',
              }}>Iniciar sesión</h2>
              <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '24px', lineHeight: 1.5 }}>
                Te enviaremos un enlace mágico a tu correo. Sin contraseña, sin complicaciones.
              </p>

              <form onSubmit={handleLogin}>
                <label style={{
                  display: 'block', fontSize: '11px', fontWeight: 600,
                  color: '#64748b', textTransform: 'uppercase',
                  letterSpacing: '0.5px', marginBottom: '8px',
                }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  style={{
                    width: '100%',
                    background: '#111820',
                    border: '1px solid #1e2d3d',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    color: '#e2e8f0',
                    fontSize: '15px',
                    outline: 'none',
                    marginBottom: '16px',
                    fontFamily: 'var(--font-mono)',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#00e5ff'}
                  onBlur={e => e.target.style.borderColor = '#1e2d3d'}
                />

                {error && (
                  <div style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    fontSize: '13px',
                    color: '#ef4444',
                    marginBottom: '16px',
                  }}>{error}</div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: loading ? '#1e2d3d' : 'linear-gradient(135deg, #00e5ff, #7c3aed)',
                    border: 'none',
                    borderRadius: '12px',
                    color: loading ? '#64748b' : '#000',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-syne)',
                    transition: 'opacity 0.2s',
                  }}
                >
                  {loading ? 'Enviando...' : '✉️ Enviar enlace mágico'}
                </button>
              </form>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📬</div>
              <h2 style={{
                fontSize: '20px', fontWeight: 700,
                color: '#e2e8f0', marginBottom: '12px',
                fontFamily: 'var(--font-syne)',
              }}>¡Revisa tu correo!</h2>
              <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.6 }}>
                Enviamos un enlace de acceso a<br />
                <strong style={{ color: '#00e5ff' }}>{email}</strong>
              </p>
              <p style={{ color: '#64748b', fontSize: '12px', marginTop: '16px' }}>
                El enlace expira en 1 hora. Revisa spam si no aparece.
              </p>
              <button
                onClick={() => setSent(false)}
                style={{
                  marginTop: '20px',
                  background: 'none',
                  border: '1px solid #1e2d3d',
                  borderRadius: '10px',
                  padding: '10px 20px',
                  color: '#64748b',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-syne)',
                }}
              >
                ← Usar otro email
              </button>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '11px', marginTop: '20px' }}>
          Tus códigos se cifran en tu dispositivo antes de guardarse
        </p>
      </div>
    </div>
  )
}
