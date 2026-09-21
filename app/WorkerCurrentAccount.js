'use client'
import {useEffect,useMemo,useState} from 'react'
import {createClient} from '@supabase/supabase-js'
const sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n||0))
const date=d=>d?new Date(d+'T12:00:00').toLocaleDateString('es-US',{month:'2-digit',day:'2-digit',year:'numeric'}):''

export default function WorkerCurrentAccount({workers=[],isAdmin=false,profile=null}){
 const [wid,setWid]=useState(''),[rows,setRows]=useState([]),[loading,setLoading]=useState(false)
 useEffect(()=>{if(!isAdmin&&profile?.trabajador_id)setWid(String(profile.trabajador_id))},[isAdmin,profile?.trabajador_id])
 useEffect(()=>{if(wid)load()},[wid])
 async function load(){setLoading(true);const {data,error}=await sb.from('v_cuenta_corriente_trabajador').select('*').eq('trabajador_id',Number(wid)).order('fecha_desde',{ascending:true});setLoading(false);if(error){console.error(error);return}setRows(data||[])}
 const totals=useMemo(()=>rows.reduce((a,r)=>({original:a.original+Number(r.valor_original||0),paid:a.paid+Number(r.abonos||0),pending:a.pending+Number(r.pendiente||0)}),{original:0,paid:0,pending:0}),[rows])
 return <section className="card no-print"><h2>💳 Cuenta corriente por trabajador</h2>
  <p>Historial acumulado de liquidaciones, abonos aplicados y saldo pendiente. Los pagos se aplican primero a las liquidaciones más antiguas.</p>
  {isAdmin&&<div className="field"><label>Trabajador</label><select value={wid} onChange={e=>setWid(e.target.value)}><option value="">Seleccionar...</option>{workers.map(w=><option key={w.id} value={w.id}>{w.nombre}</option>)}</select></div>}
  {!wid?<p>Selecciona un trabajador para consultar su cuenta corriente.</p>:loading?<p>Cargando cuenta corriente…</p>:<>
   <div className="summary"><div className="stat">Liquidado<b>{money(totals.original)}</b></div><div className="stat">Abonos / pagos<b>{money(totals.paid)}</b></div><div className="stat">SALDO TOTAL PENDIENTE<b>{money(totals.pending)}</b></div></div>
   <table><thead><tr><th>Liquidación original</th><th>Período</th><th>Valor original</th><th>Abonos</th><th>Pendiente</th><th>Estado saldo</th></tr></thead><tbody>
    {rows.map(r=><tr key={r.liquidacion_id}><td>#{r.liquidacion_id}</td><td>{date(r.fecha_desde)} — {date(r.fecha_hasta)}</td><td>{money(r.valor_original)}</td><td>{money(r.abonos)}</td><td><b>{money(r.pendiente)}</b></td><td>{Number(r.pendiente)<=0?'✅ Cancelada':Number(r.abonos)>0?'🟠 Parcial':'🔴 Pendiente'}</td></tr>)}
   </tbody></table>
  </>}
 </section>
}
