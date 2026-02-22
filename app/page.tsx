'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { generateTOTP, getTimeRemaining, encryptSecret, decryptSecret } from '@/lib/totp'
import { useRouter } from 'next/navigation'

interface Account {
  id: string; name: string; issuer: string
  secret_encrypted: string; icon_slug: string; secret?: string
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

const SLUG_MAP: Record<string,string> = {
  google:'google', gmail:'google', github:'github', meta:'meta',
  facebook:'meta', instagram:'instagram', twitter:'twitter', x:'twitter',
  discord:'discord', amazon:'amazon', microsoft:'microsoft', apple:'apple',
  supabase:'supabase', stripe:'stripe', netflix:'netflix', linkedin:'linkedin',
  slack:'slack', notion:'notion', figma:'figma', dropbox:'dropbox',
  twitch:'twitch', spotify:'spotify', paypal:'paypal', cloudflare:'cloudflare'
}

function getIconUrl(slug: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/app-icons/${slug}.png`
}

function guessSlug(issuer: string) {
  const k = issuer.toLowerCase()
  for (const [key, val] of Object.entries(SLUG_MAP)) {
    if (k.includes(key)) return val
  }
  return 'default'
}

const bgColors = ['rgba(0,229,255,0.08)','rgba(124,58,237,0.08)','rgba(16,185,129,0.08)','rgba(245,158,11,0.08)']

function TimerRing({ remaining }: { remaining: number }) {
  const r = 15, circ = 2*Math.PI*r, offset = circ*(1-remaining/30)
  const color = remaining<=5?'#ef4444':remaining<=10?'#f59e0b':'#00e5ff'
  return (
    <div style={{position:'relative',width:36,height:36,flexShrink:0}}>
      <svg width="36" height="36" viewBox="0 0 36 36" style={{transform:'rotate(-90deg)'}}>
        <circle fill="none" stroke="#1e2d3d" strokeWidth="3" cx="18" cy="18" r={r}/>
        <circle fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
          cx="18" cy="18" r={r} strokeDasharray={circ} strokeDashoffset={offset}
          style={{transition:'stroke-dashoffset 1s linear, stroke 0.3s'}}/>
      </svg>
      <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',
        fontFamily:'var(--font-mono)',fontSize:10,fontWeight:700,color}}>{remaining}</div>
    </div>
  )
}

function AppIcon({ slug, size=40 }: { slug: string; size?: number }) {
  const [errored, setErrored] = useState(false)
  const src = errored ? getIconUrl('default') : getIconUrl(slug)
  return (
    <div style={{
      width:size, height:size, borderRadius:12, border:'1px solid #1e2d3d',
      display:'flex', alignItems:'center', justifyContent:'center',
      background:'#0d1117', flexShrink:0, overflow:'hidden',
    }}>
      <img src={src} alt={slug}
        style={{width:size-10, height:size-10, objectFit:'contain'}}
        onError={()=>setErrored(true)}
      />
    </div>
  )
}

function OtpCode({ secret, onCopy }: { secret: string; onCopy: () => void }) {
  const [code, setCode] = useState('--- ---')
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    let alive = true
    const refresh = async () => {
      try { const c = await generateTOTP(secret); if (alive) setCode(c.slice(0,3)+' '+c.slice(3)) }
      catch { if (alive) setCode('ERROR') }
    }
    refresh()
    const t = setInterval(refresh, 1000)
    return () => { alive=false; clearInterval(t) }
  }, [secret])
  const handleCopy = async () => {
    try {
      const c = await generateTOTP(secret)
      await navigator.clipboard.writeText(c)
      setCopied(true); onCopy()
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }
  return (
    <div onClick={handleCopy} style={{
      fontFamily:'var(--font-mono)',fontSize:30,fontWeight:700,letterSpacing:8,cursor:'pointer',
      color:copied?'#10b981':'#00e5ff',
      textShadow:copied?'0 0 20px rgba(16,185,129,0.4)':'0 0 20px rgba(0,229,255,0.15)',
      userSelect:'none',transition:'all 0.15s',
    }}>{copied?'✓ Copiado':code}</div>
  )
}

export default function HomePage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<{email:string;id:string}|null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [search, setSearch] = useState('')
  const [remaining, setRemaining] = useState(getTimeRemaining())
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [modalTab, setModalTab] = useState<'manual'|'qr'>('manual')
  const [toast, setToast] = useState('')
  const [selectedSlug, setSelectedSlug] = useState('default')
  const [fName,setFName]=useState(''); const [fIssuer,setFIssuer]=useState('')
  const [fSecret,setFSecret]=useState(''); const [formError,setFormError]=useState('')
  const [saving,setSaving]=useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cameraStream,setCameraStream]=useState<MediaStream|null>(null)
  const [scanning,setScanning]=useState(false)
  const qrTimer = useRef<ReturnType<typeof setInterval>|null>(null)

  useEffect(() => { const t=setInterval(()=>setRemaining(getTimeRemaining()),1000); return()=>clearInterval(t) },[])

  useEffect(() => {
    supabase.auth.getUser().then(({data}) => {
      if (!data.user) { router.replace('/login'); return }
      setUser({email:data.user.email!,id:data.user.id})
    })
  },[])

  useEffect(() => { if (user) loadAccounts() },[user])

  const loadAccounts = async () => {
    setLoading(true)
    const {data,error} = await supabase.from('accounts').select('*').order('created_at',{ascending:false})
    if (error) { showToast('Error cargando cuentas'); setLoading(false); return }
    const dec = await Promise.all((data||[]).map(async (a:Account) => {
      try { return {...a, secret: await decryptSecret(a.secret_encrypted, user!.email)} }
      catch { return {...a, secret:'ERROR'} }
    }))
    setAccounts(dec); setLoading(false)
  }

  const showToast = (msg:string) => { setToast(msg); setTimeout(()=>setToast(''),2200) }
  const handleSignOut = async () => { await supabase.auth.signOut(); router.replace('/login') }

  const handleDelete = async (id:string) => {
    if (!confirm('¿Eliminar esta cuenta?')) return
    const {error} = await supabase.from('accounts').delete().eq('id',id)
    if (error) { showToast('Error al eliminar'); return }
    setAccounts(p=>p.filter(a=>a.id!==id)); showToast('Cuenta eliminada')
  }

  const handleAdd = async () => {
    setSaving(true); setFormError('')
    const secret = fSecret.replace(/\s/g,'').toUpperCase()
    if (!fName) { setFormError('El nombre es obligatorio'); setSaving(false); return }
    if (!secret) { setFormError('La clave secreta es obligatoria'); setSaving(false); return }
    try { await generateTOTP(secret) } catch { setFormError('Clave secreta inválida (Base32)'); setSaving(false); return }
    const secret_encrypted = await encryptSecret(secret, user!.email)
    const {data:inserted,error} = await supabase.from('accounts')
      .insert({name:fName,issuer:fIssuer,secret_encrypted,icon_slug:selectedSlug,user_id:user!.id})
      .select().single()
    if (error) { setFormError('Error: '+error.message); setSaving(false); return }
    setAccounts(p=>[{...inserted,secret},...p])
    setShowModal(false); setFName(''); setFIssuer(''); setFSecret(''); setSelectedSlug('default')
    showToast('✓ Cuenta agregada'); setSaving(false)
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}})
      setCameraStream(stream)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setScanning(true)
        qrTimer.current = setInterval(async () => {
          const v=videoRef.current, c=canvasRef.current
          if (!v||!c||v.readyState!==v.HAVE_ENOUGH_DATA) return
          c.width=v.videoWidth; c.height=v.videoHeight
          c.getContext('2d')?.drawImage(v,0,0)
          const imgData=c.getContext('2d')?.getImageData(0,0,c.width,c.height)
          if (!imgData) return
          // @ts-ignore
          const code=window.jsQR?.(imgData.data,imgData.width,imgData.height)
          if (code?.data) { clearInterval(qrTimer.current!); stopCamera(); parseUri(code.data) }
        },200)
      }
    } catch { setFormError('No se pudo acceder a la cámara') }
  }

  const stopCamera = () => {
    cameraStream?.getTracks().forEach(t=>t.stop()); setCameraStream(null); setScanning(false)
    if (qrTimer.current) clearInterval(qrTimer.current)
  }

  const parseUri = (uri:string) => {
    try {
      const url=new URL(uri); if (url.protocol!=='otpauth:') throw new Error()
      const label=decodeURIComponent(url.pathname.slice(2))
      const params=new URLSearchParams(url.search)
      const secret=params.get('secret'); if (!secret) throw new Error()
      const issuer=params.get('issuer')||label.split(':')[0]||''
      const name=label.includes(':')?label.split(':')[1].trim():label
      setFName(name); setFIssuer(issuer); setFSecret(secret)
      setSelectedSlug(guessSlug(issuer)); setModalTab('manual')
    } catch { setFormError('QR no reconocido'); setTimeout(startCamera,2000) }
  }

  const filtered = accounts.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.issuer.toLowerCase().includes(search.toLowerCase())
  )

  const inputStyle = {
    width:'100%',background:'#111820',border:'1px solid #1e2d3d',borderRadius:12,
    padding:'12px 16px',color:'#e2e8f0',fontFamily:'var(--font-mono)',fontSize:14,outline:'none',
  }

  const uniqueSlugs = ['default', ...Array.from(new Set(Object.values(SLUG_MAP)))]

  return (
    <div style={{position:'relative',zIndex:1,maxWidth:480,margin:'0 auto',paddingBottom:100}}>

      {/* Header */}
      <header style={{
        padding:'24px 20px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',
        borderBottom:'1px solid #1e2d3d',position:'sticky',top:0,
        background:'rgba(8,12,16,0.92)',backdropFilter:'blur(12px)',zIndex:100,
      }}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <img src="/icon-192.png" alt="AuthVault" style={{
            width:36,height:36,borderRadius:10,
            boxShadow:'0 0 20px rgba(0,229,255,0.15)',
          }}/>
          <span style={{fontSize:18,fontWeight:800,color:'#e2e8f0',letterSpacing:-0.5,fontFamily:'var(--font-syne)'}}>
            Auth<span style={{color:'#00e5ff'}}>Vault</span>
          </span>
        </div>
        <button onClick={handleSignOut} title="Cerrar sesión" style={{
          background:'none',border:'1px solid #1e2d3d',borderRadius:8,
          width:32,height:32,cursor:'pointer',fontSize:14,color:'#64748b',
          display:'flex',alignItems:'center',justifyContent:'center',
        }}>↩️</button>
      </header>

      {/* Search */}
      <div style={{padding:'16px 20px 0',position:'relative'}}>
        <span style={{position:'absolute',left:36,top:'50%',transform:'translateY(-50%)',color:'#64748b',fontSize:16,pointerEvents:'none'}}>🔍</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cuenta..."
          style={{...inputStyle,paddingLeft:40,fontFamily:'var(--font-syne)'}}/>
      </div>

      {/* List */}
      <div style={{padding:'16px 20px 0',display:'flex',flexDirection:'column',gap:12}}>
        {loading ? (
          <div style={{textAlign:'center',padding:'60px 0',color:'#64748b'}}>
            <img src="/icon-192.png" alt="AuthVault" style={{width:48,height:48,borderRadius:12,opacity:0.4,marginBottom:12}}/>
            <div>Cargando...</div>
          </div>
        ) : filtered.length===0 ? (
          <div style={{textAlign:'center',padding:'80px 20px',color:'#64748b'}}>
            <img src="/icon-192.png" alt="AuthVault" style={{width:64,height:64,borderRadius:16,opacity:0.3,marginBottom:16,display:'block',margin:'0 auto 16px'}}/>
            <h3 style={{fontSize:18,fontWeight:600,color:'#e2e8f0',opacity:0.5,marginBottom:8,fontFamily:'var(--font-syne)'}}>
              {search?'Sin resultados':'Sin cuentas'}
            </h3>
            <p style={{fontSize:13}}>{search?'Prueba otro término':'Toca + para agregar tu primera cuenta'}</p>
          </div>
        ) : filtered.map((acc,i) => (
          <div key={acc.id} style={{
            background:'#111820',border:'1px solid #1e2d3d',borderRadius:16,
            padding:'18px 20px',position:'relative',overflow:'hidden',
            animation:'fadeSlideIn 0.3s ease',
          }}>
            <div style={{position:'absolute',left:0,top:0,bottom:0,width:3,
              background:'linear-gradient(to bottom,#00e5ff,#7c3aed)',borderRadius:'3px 0 0 3px'}}/>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <AppIcon slug={acc.icon_slug} size={40}/>
                <div>
                  <div style={{fontSize:14,fontWeight:600,color:'#e2e8f0',fontFamily:'var(--font-syne)'}}>{acc.issuer||acc.name}</div>
                  <div style={{fontSize:12,color:'#64748b',marginTop:2}}>{acc.name}</div>
                </div>
              </div>
              <button onClick={()=>handleDelete(acc.id)} style={{
                background:'none',border:'1px solid #1e2d3d',borderRadius:8,
                width:30,height:30,cursor:'pointer',fontSize:14,color:'#64748b',
                display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
              }} title="Eliminar">🗑️</button>
            </div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              {acc.secret && acc.secret!=='ERROR'
                ? <OtpCode secret={acc.secret} onCopy={()=>showToast('✓ Código copiado')}/>
                : <div style={{fontFamily:'var(--font-mono)',fontSize:28,color:'#ef4444'}}>ERROR</div>
              }
              <TimerRing remaining={remaining}/>
            </div>
          </div>
        ))}
      </div>

      {/* FAB */}
      <button onClick={()=>{setShowModal(true);setFormError('')}} style={{
        position:'fixed',bottom:24,right:24,width:58,height:58,
        background:'linear-gradient(135deg,#00e5ff,#7c3aed)',border:'none',borderRadius:18,
        display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,cursor:'pointer',
        boxShadow:'0 4px 30px rgba(0,229,255,0.35)',zIndex:200,
      }}>＋</button>

      {/* Toast */}
      {toast&&<div style={{
        position:'fixed',bottom:90,left:'50%',transform:'translateX(-50%)',
        background:'#10b981',color:'#000',padding:'10px 20px',borderRadius:100,
        fontSize:13,fontWeight:700,zIndex:999,whiteSpace:'nowrap',animation:'fadeSlideIn 0.25s ease',
      }}>{toast}</div>}

      {/* Modal */}
      {showModal&&(
        <div onClick={e=>{if(e.target===e.currentTarget){setShowModal(false);stopCamera()}}} style={{
          position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)',
          zIndex:500,display:'flex',alignItems:'flex-end',justifyContent:'center',
        }}>
          <div style={{
            background:'#0d1117',border:'1px solid #1e2d3d',borderRadius:'24px 24px 0 0',
            width:'100%',maxWidth:480,padding:'24px 24px 44px',
            animation:'fadeSlideIn 0.3s ease',maxHeight:'90vh',overflowY:'auto',
          }}>
            <div style={{width:40,height:4,background:'#1e2d3d',borderRadius:2,margin:'0 auto 20px'}}/>
            <div style={{fontSize:20,fontWeight:800,color:'#e2e8f0',marginBottom:20,fontFamily:'var(--font-syne)'}}>Agregar cuenta</div>

            {/* Tabs */}
            <div style={{display:'flex',background:'#111820',borderRadius:12,padding:4,marginBottom:20,border:'1px solid #1e2d3d'}}>
              {(['manual','qr'] as const).map(tab=>(
                <button key={tab} onClick={()=>{setModalTab(tab);if(tab!=='qr')stopCamera()}} style={{
                  flex:1,padding:10,border:'none',borderRadius:10,fontFamily:'var(--font-syne)',
                  fontSize:13,fontWeight:600,cursor:'pointer',transition:'all 0.2s',
                  background:modalTab===tab?'#00e5ff':'none',color:modalTab===tab?'#000':'#64748b',
                }}>{tab==='manual'?'✏️ Manual':'📷 Escanear QR'}</button>
              ))}
            </div>

            {modalTab==='manual'&&(
              <div>
                {[
                  {label:'Nombre / Email',val:fName,set:setFName,ph:'usuario@ejemplo.com'},
                  {label:'Emisor (servicio)',val:fIssuer,set:setFIssuer,ph:'Google, GitHub, Meta...'},
                  {label:'Clave secreta (Base32)',val:fSecret,set:setFSecret,ph:'JBSWY3DPEHPK3PXP'},
                ].map(({label,val,set,ph})=>(
                  <div key={label} style={{marginBottom:16}}>
                    <label style={{display:'block',fontSize:11,fontWeight:600,color:'#64748b',
                      textTransform:'uppercase',letterSpacing:0.5,marginBottom:8}}>{label}</label>
                    <input value={val} onChange={e=>set(e.target.value)} placeholder={ph} style={inputStyle}/>
                  </div>
                ))}

                {/* Icon selector */}
                <div style={{marginBottom:16}}>
                  <label style={{display:'block',fontSize:11,fontWeight:600,color:'#64748b',textTransform:'uppercase',letterSpacing:0.5,marginBottom:8}}>Ícono</label>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8}}>
                    {uniqueSlugs.map(slug=>(
                      <div key={slug} onClick={()=>setSelectedSlug(slug)} style={{
                        borderRadius:10,padding:'8px 4px',cursor:'pointer',textAlign:'center',
                        border:`2px solid ${selectedSlug===slug?'#00e5ff':'transparent'}`,
                        background:selectedSlug===slug?'rgba(0,229,255,0.08)':'#111820',
                        transition:'all 0.15s',
                      }}>
                        <AppIcon slug={slug} size={32}/>
                        <div style={{fontSize:9,color:'#64748b',marginTop:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{slug}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {formError&&<div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',
                  borderRadius:10,padding:'10px 14px',fontSize:13,color:'#ef4444',marginBottom:12}}>{formError}</div>}
                <button onClick={handleAdd} disabled={saving} style={{
                  width:'100%',padding:14,border:'none',borderRadius:14,
                  background:saving?'#1e2d3d':'linear-gradient(135deg,#00e5ff,#7c3aed)',
                  color:saving?'#64748b':'#fff',fontSize:15,fontWeight:700,
                  cursor:saving?'not-allowed':'pointer',fontFamily:'var(--font-syne)',
                }}>{saving?'Guardando...':'Agregar cuenta'}</button>
              </div>
            )}

            {modalTab==='qr'&&(
              <div>
                <div onClick={!scanning?startCamera:undefined} style={{
                  width:'100%',aspectRatio:'1',background:'#111820',borderRadius:16,
                  border:`2px dashed ${scanning?'#00e5ff':'#1e2d3d'}`,
                  display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                  gap:12,color:'#64748b',fontSize:14,position:'relative',overflow:'hidden',
                  cursor:scanning?'default':'pointer',
                }}>
                  <video ref={videoRef} autoPlay playsInline style={{
                    position:'absolute',inset:0,width:'100%',height:'100%',
                    objectFit:'cover',borderRadius:14,display:scanning?'block':'none',
                  }}/>
                  <canvas ref={canvasRef} style={{display:'none'}}/>
                  {scanning&&<>
                    <div style={{position:'absolute',inset:20,border:'2px solid #00e5ff',borderRadius:12,pointerEvents:'none'}}/>
                    <div style={{position:'absolute',left:20,right:20,height:2,
                      background:'linear-gradient(90deg,transparent,#00e5ff,transparent)',
                      animation:'scanLine 2s linear infinite'}}/>
                  </>}
                  {!scanning&&<>
                    <div style={{fontSize:40,opacity:0.4}}>📷</div>
                    <div>Toca para activar la cámara</div>
                    <div style={{fontSize:12}}>Apunta al código QR de tu servicio</div>
                  </>}
                </div>
                {formError&&<div style={{marginTop:12,background:'rgba(239,68,68,0.1)',
                  border:'1px solid rgba(239,68,68,0.3)',borderRadius:10,padding:'10px 14px',
                  fontSize:13,color:'#ef4444'}}>{formError}</div>}
                <button onClick={()=>{stopCamera();setModalTab('manual')}} style={{
                  width:'100%',padding:12,marginTop:8,background:'none',
                  border:'1px solid #1e2d3d',borderRadius:14,color:'#64748b',
                  fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'var(--font-syne)',
                }}>Ingresar manualmente</button>
              </div>
            )}
          </div>
        </div>
      )}
      <script src="https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js" async/>
    </div>
  )
}