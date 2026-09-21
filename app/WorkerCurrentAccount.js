'use client'
import {useEffect,useMemo,useState} from 'react'
import {createClient} from '@supabase/supabase-js'
const sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n||0))
const date=d=>d?new Date(d+'T12:00:00').toLocaleDateString('es-US',{month:'2-digit',day:'2-digit',year:'numeric'}):''
const today=()=>new Date().toISOString().slice(0,10)

export default function WorkerCurrentAccount(){
 const [workers,setWorkers]=useState([]),[isAdmin,setIsAdmin]=useState(false),[show,setShow]=useState(false)
 const [wid,setWid]=useState(''),[rows,setRows]=useState([]),[payments,setPayments]=useState([]),[methods,setMethods]=useState([]),[loading,setLoading]=useState(false)
 const [amount,setAmount]=useState(''),[payDate,setPayDate]=useState(today()),[method,setMethod]=useState(''),[note,setNote]=useState(''),[start,setStart]=useState('')
 useEffect(()=>{const check=()=>setShow(!!document.getElementById('cuenta-corriente-activa'));check();const o=new MutationObserver(check);o.observe(document.body,{childList:true,subtree:true});return()=>o.disconnect()},[])
 useEffect(()=>{if(!show)return;(async()=>{const {data:{session}}=await sb.auth.getSession();if(!session)return;const [{data:w},{data:p},{data:m}]=await Promise.all([sb.from('trabajadores').select('id,nombre').eq('activo',true).order('nombre'),sb.from('usuarios_app').select('rol,trabajador_id').eq('user_id',session.user.id).maybeSingle(),sb.from('metodos_pago').select('id,nombre').eq('activo',true).order('nombre')]);setWorkers(w||[]);setMethods(m||[]);setIsAdmin(p?.rol==='administrador');if(p?.rol==='trabajador'&&p.trabajador_id)setWid(String(p.trabajador_id))})()},[show])
 useEffect(()=>{if(wid)load();else{setRows([]);setPayments([])}},[wid])
 async function load(){setLoading(true);const {data:r,error}=await sb.from('v_cuenta_corriente_trabajador').select('*').eq('trabajador_id',Number(wid)).order('fecha_desde');if(error){setLoading(false);return alert(error.message)};setRows(r||[]);const ids=(r||[]).map(x=>x.liquidacion_id);if(ids.length){const {data:p}=await sb.from('pagos_liquidacion').select('id,liquidacion_id,fecha,valor,concepto,metodos_pago(nombre)').in('liquidacion_id',ids).order('fecha');setPayments(p||[])}else setPayments([]);setLoading(false)}
 const totals=useMemo(()=>rows.reduce((a,r)=>({original:a.original+Number(r.valor_original||0),paid:a.paid+Number(r.abonos||0),pending:a.pending+Number(r.pendiente||0)}),{original:0,paid:0,pending:0}),[rows])
 const pending=rows.filter(r=>Number(r.pendiente)>0)
 async function printAccount(){
  const worker=workers.find(w=>String(w.id)===String(wid));if(!worker)return alert('Selecciona un trabajador');
  const active=rows.filter(r=>Number(r.pendiente)>0).map(r=>({...r,payments:payments.filter(p=>String(p.liquidacion_id)===String(r.liquidacion_id)).map(p=>({fecha:p.fecha,valor:p.valor,origen:p.metodos_pago?.nombre||'',nota:p.concepto||''}))}));
  const res=await fetch('/api/pdf-cuenta-corriente',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({worker:worker.nombre,generated:today(),original:totals.original,paid:totals.paid,pending:totals.pending,rows:active})});
  if(!res.ok){const j=await res.json().catch(()=>({}));return alert(j.error||'No fue posible generar el PDF')}
  const blob=await res.blob(),url=URL.createObjectURL(blob);window.open(url,'_blank','noopener,noreferrer');setTimeout(()=>URL.revokeObjectURL(url),60000)
 }
 async function register(){
  const v=Number(amount);if(!wid||!v||v<=0)return alert('Indica un valor de abono válido');if(v>totals.pending+.001)return alert('El abono no puede superar el saldo total pendiente');
  const first=start||String(pending[0]?.liquidacion_id||'');if(!first)return alert('No hay liquidaciones pendientes');
  const target=rows.find(r=>String(r.liquidacion_id)===String(first));
  if(!confirm('Se aplicará '+money(v)+' comenzando por la liquidación #'+first+' ('+money(target?.pendiente)+ ' pendiente) y, si sobra dinero, continuará automáticamente con las siguientes liquidaciones pendientes. ¿Continuar?'))return;
  const {error}=await sb.rpc('registrar_pago_cuenta_corriente',{p_trabajador_id:Number(wid),p_valor:v,p_fecha:payDate,p_metodo_pago_id:method?Number(method):null,p_concepto:note||null,p_liquidacion_inicial:Number(first)});
  if(error)return alert(error.message);setAmount('');setNote('');setStart('');await load();alert('Abono distribuido y registrado en cada liquidación correspondiente.')
 }
 if(!show)return null
 return <div style={{maxWidth:1200,margin:'14px auto 40px',padding:'0 4px'}}><section className="card no-print"><h2>💳 Cuenta corriente por trabajador</h2>
  <p>Historial de liquidaciones y pagos. Los abonos individuales permanecen en su liquidación. Desde aquí también puedes registrar un pago global y distribuirlo desde la liquidación que elijas hacia las siguientes pendientes.</p>
  {isAdmin&&<div className="field"><label>Trabajador</label><select value={wid} onChange={e=>setWid(e.target.value)}><option value="">Seleccionar...</option>{workers.map(w=><option key={w.id} value={w.id}>{w.nombre}</option>)}</select></div>}
  {!wid?<p>Selecciona un trabajador para consultar su cuenta corriente.</p>:loading?<p>Cargando cuenta corriente…</p>:<>
   <div className="actions" style={{marginBottom:8}}><button className="primary" onClick={printAccount}>🖨️ Ver / Imprimir estado de cuenta PDF</button></div><div className="account-summary"><div className="account-mini">Liquidado <b>{money(totals.original)}</b></div><div className="account-mini">Abonos / pagos <b>{money(totals.paid)}</b></div><div className="account-pending">SALDO TOTAL PENDIENTE <b>{money(totals.pending)}</b></div></div>
   {isAdmin&&totals.pending>0&&<><h3>Registrar abono al saldo total</h3><div className="grid">
    <div className="field"><label>Valor del abono</label><input type="number" step=".01" value={amount} onChange={e=>setAmount(e.target.value)} placeholder={money(totals.pending)}/></div>
    <div className="field"><label>Fecha</label><input type="date" value={payDate} onChange={e=>setPayDate(e.target.value)}/></div>
    <div className="field"><label>Forma / origen del pago</label><select value={method} onChange={e=>setMethod(e.target.value)}><option value="">Seleccionar...</option>{methods.map(m=><option key={m.id} value={m.id}>{m.nombre}</option>)}</select></div>
    <div className="field"><label>Comenzar a aplicar en liquidación</label><select value={start} onChange={e=>setStart(e.target.value)}><option value="">Más antigua pendiente (automático)</option>{pending.map(r=><option key={r.liquidacion_id} value={r.liquidacion_id}>#{r.liquidacion_id} · pendiente {money(r.pendiente)}</option>)}</select></div>
    <div className="field"><label>De dónde proviene / nota</label><input value={note} onChange={e=>setNote(e.target.value)} placeholder="Ej. Cash, Zelle de..., arriendo..."/></div>
   </div><div className="actions"><button className="primary" onClick={register}>💵 Registrar y distribuir abono</button></div></>}
   <table><thead><tr><th>Liquidación</th><th>Período</th><th>Valor original</th><th>Abonos</th><th>Origen / nota</th><th>Pendiente</th><th>Estado saldo</th></tr></thead><tbody>{rows.map(r=>{const ps=payments.filter(p=>String(p.liquidacion_id)===String(r.liquidacion_id));return <tr key={r.liquidacion_id}><td>#{r.liquidacion_id}</td><td>{date(r.fecha_desde)} — {date(r.fecha_hasta)}</td><td>{money(r.valor_original)}</td><td><b>{money(r.abonos)}</b>{ps.map(p=><div key={p.id} style={{fontSize:12,marginTop:4}}>{date(p.fecha)} · {money(p.valor)}</div>)}</td><td>{ps.length?ps.map(p=><div key={p.id} style={{fontSize:12,marginBottom:5}}><b>{p.metodos_pago?.nombre||'—'}</b>{p.concepto?' · '+p.concepto:''}</div>):'—'}</td><td><b>{money(r.pendiente)}</b></td><td>{Number(r.pendiente)<=0?'✅ Cancelada':Number(r.abonos)>0?'🟠 Parcial':'🔴 Pendiente'}</td></tr>})}</tbody></table>
  </>}
 </section></div>
}
