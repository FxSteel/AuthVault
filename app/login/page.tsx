'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login'|'register'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setLoading(true); setError('')
    const supabase = createClient()

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message === 'Invalid login credentials'
          ? 'Email o contraseña incorrectos'
          : error.message)
        setLoading(false); return
      }
      router.replace('/')
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message === 'User already registered'
          ? 'Este email ya está registrado. Inicia sesión.'
          : error.message)
        setLoading(false); return
      }
      // Auto login after register
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
      if (loginError) { setError('Cuenta creada. Inicia sesión.'); setMode('login'); setLoading(false); return }
      router.replace('/')
    }
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width:'100%', background:'#111820', border:'1px solid #1e2d3d',
    borderRadius:12, padding:'12px 16px', color:'#e2e8f0',
    fontSize:15, outline:'none', fontFamily:'var(--font-mono)',
    boxSizing:'border-box',
  }

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center',
      justifyContent:'center', padding:'20px', position:'relative', zIndex:1,
    }}>
      <div style={{width:'100%', maxWidth:'400px'}}>

        {/* Logo */}
        <div style={{textAlign:'center', marginBottom:'40px'}}>
          <img src="/icon-192.png" alt="AuthVault" style={{
            width:64, height:64, borderRadius:18,
            margin:'0 auto 16px', display:'block',
            boxShadow:'0 0 30px rgba(0,229,255,0.3)',
          }}/>
          <h1 style={{
            fontSize:28, fontWeight:800, color:'#e2e8f0',
            letterSpacing:'-0.5px', fontFamily:'var(--font-syne)', margin:0,
          }}>
            Auth<span style={{color:'#00e5ff'}}>Vault</span>
          </h1>
          <p style={{color:'#64748b', fontSize:14, marginTop:6}}>
            Autenticador 2FA seguro
          </p>
        </div>

        {/* Card */}
        <div style={{
          background:'#0d1117', border:'1px solid #1e2d3d',
          borderRadius:20, padding:32,
        }}>
          {/* Mode tabs */}
          <div style={{display:'flex', background:'#111820', borderRadius:12, padding:4, marginBottom:24, border:'1px solid #1e2d3d'}}>
            {(['login','register'] as const).map(m => (
              <button key={m} onClick={()=>{setMode(m);setError('')}} style={{
                flex:1, padding:10, border:'none', borderRadius:10,
                fontFamily:'var(--font-syne)', fontSize:13, fontWeight:600,
                cursor:'pointer', transition:'all 0.2s',
                background:mode===m?'#00e5ff':'none',
                color:mode===m?'#000':'#64748b',
              }}>{m==='login'?'Iniciar sesión':'Crear cuenta'}</button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{marginBottom:16}}>
              <label style={{display:'block', fontSize:11, fontWeight:600, color:'#64748b',
                textTransform:'uppercase', letterSpacing:0.5, marginBottom:8}}>Email</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="tu@email.com" required style={inputStyle}
                onFocus={e=>e.target.style.borderColor='#00e5ff'}
                onBlur={e=>e.target.style.borderColor='#1e2d3d'}
              />
            </div>

            {/* Password */}
            <div style={{marginBottom:24, position:'relative'}}>
              <label style={{display:'block', fontSize:11, fontWeight:600, color:'#64748b',
                textTransform:'uppercase', letterSpacing:0.5, marginBottom:8}}>Contraseña</label>
              <div style={{position:'relative'}}>
                <input
                  type={showPassword?'text':'password'}
                  value={password} onChange={e=>setPassword(e.target.value)}
                  placeholder={mode==='register'?'Mínimo 6 caracteres':'Tu contraseña'}
                  required style={{...inputStyle, paddingRight:48}}
                  onFocus={e=>e.target.style.borderColor='#00e5ff'}
                  onBlur={e=>e.target.style.borderColor='#1e2d3d'}
                />
                <button type="button" onClick={()=>setShowPassword(p=>!p)} style={{
                  position:'absolute', right:14, top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', cursor:'pointer',
                  color:'#64748b', fontSize:16, padding:0,
                }}>{showPassword?'🙈':'👁️'}</button>
              </div>
            </div>

            {/* Error */}
            {error&&<div style={{
              background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)',
              borderRadius:10, padding:'10px 14px', fontSize:13, color:'#ef4444', marginBottom:16,
            }}>{error}</div>}

            {/* Submit */}
            <button type="submit" disabled={loading} style={{
              width:'100%', padding:14, border:'none', borderRadius:12,
              background:loading?'#1e2d3d':'linear-gradient(135deg,#00e5ff,#7c3aed)',
              color:loading?'#64748b':'#000', fontSize:15, fontWeight:700,
              cursor:loading?'not-allowed':'pointer', fontFamily:'var(--font-syne)',
            }}>
              {loading ? 'Cargando...' : mode==='login' ? '→ Ingresar' : '✓ Crear cuenta'}
            </button>
          </form>
        </div>

        <p style={{textAlign:'center', color:'#64748b', fontSize:11, marginTop:20}}>
          Tus códigos se cifran en tu dispositivo antes de guardarse
        </p>
      </div>
    </div>
  )
}