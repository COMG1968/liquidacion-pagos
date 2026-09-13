'use client'
import {useEffect,useMemo,useState} from 'react'
import {createClient} from '@supabase/supabase-js'
const sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n||0))
const dlabel=d=>d?new Date(d+'T12:00:00').toLocaleDateString('es-US'):''
export default function AdvancedReports(){
 const [show,setShow]=useState(false),[workers,setWorkers]=useState([]),[methods,setMethods]=useState([]),[rows,setRows]=useState([])
 const [worker,setWorker]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState(''),[status,setStatus]=useState(''),[method,setMethod]=useState(''),[min,setMin]=useState(''),[max,setMax]=useState('')
 useEffect(()=>{
  const check=()=>{const text=document.body?.innerText||'';setShow(text.includes('Informe de pagos')||text.includes('Informe de Pagos'))}
  check();const o=new MutationObserver(check);o.observe(document.body,{childList:true,subtree:true,characterData:true});return()=>o.disconnect()
 },[])
 useEffect(()=>{if(!show)return;(async()=>{const [{data:w},{data:m}]=await Promise.all([sb.from('trabajadores').select('id,nombre').eq('activo',true).order('nombre'),sb.from('metodos_pago').select('id,nombre').eq('activo',true).order('nombre')]);setWorkers(w||[]);setMethods(m||[])})()},[show])
 async function generate(){let q=sb.from('liquidaciones').select('*, trabajadores(nombre), metodos_pago(nombre)').order('fecha_desde',{ascending:false});if(from)q=q.gte('fecha_hasta',from);if(to)q=q.lte('fecha_desde',to);if(worker)q=q.eq('trabajador_id',Number(worker));if(status)q=q.eq('estado',status);if(method==='none')q=q.is('metodo_pago_id',null);else if(method)q=q.eq('metodo_pago_id',Number(method));const {data,error}=await q;if(error)return alert('No fue posible generar el informe: '+error.message);let out=data||[];if(min!=='')out=out.filter(x=>Number(x.gran_total??x.total_pago)>=Number(min));if(max!=='')out=out.filter(x=>Number(x.gran_total??x.total_pago)<=Number(max));setRows(out);if(!out.length)alert('No hay liquidaciones que coincidan con los filtros seleccionados.')}
 function clear(){setWorker('');setFrom('');setTo('');setStatus('');setMethod('');setMin('');setMax('');setRows([])}
 const total=useMemo(()=>rows.reduce((s,x)=>s+Number((x.gran_total??x.total_pago)||0),0),[rows]),hours=useMemo(()=>rows.reduce((s,x)=>s+Number(x.total_horas||0),0),[rows]),paid=useMemo(()=>rows.filter(x=>x.estado==='pagado').reduce((s,x)=>s+Number((x.gran_total??x.total_pago)||0),0),[rows]),pending=total-paid
 const byMethod=useMemo(()=>rows.reduce((a,x)=>{const k=x.metodos_pago?.nombre||'Sin forma de pago';a[k]=(a[k]||0)+Number((x.gran_total??x.total_pago)||0);return a},{}),[rows])
 const filterText=[worker&&`Trabajador: ${workers.find(x=>String(x.id)===worker)?.nombre}`,from&&`Desde: ${dlabel(from)}`,to&&`Hasta: ${dlabel(to)}`,status&&`Estado: ${status}`,method&&`Pago: ${method==='none'?'Sin forma de pago':methods.find(x=>String(x.id)===method)?.nombre}`,min!==''&&`Mínimo: ${money(min)}`,max!==''&&`Máximo: ${money(max)}`].filter(Boolean).join(' · ')||'Todos los registros'
 if(!show)return null
 return <div style={{maxWidth:1100,margin:'14px auto 40px',padding:'0 4px'}}><section className="card advanced-reports">
  <h2>🔎 Informe avanzado por filtros</h2><p>Selecciona uno o varios filtros. Los campos en “Todos” incluyen todos los registros.</p>
  <div className="grid no-print">
   <div className="field"><label>Trabajador</label><select value={worker} onChange={e=>setWorker(e.target.value)}><option value="">Todos</option>{workers.map(x=><option key={x.id} value={x.id}>{x.nombre}</option>)}</select></div>
   <div className="field"><label>Desde</label><input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></div><div className="field"><label>Hasta</label><input type="date" value={to} onChange={e=>setTo(e.target.value)}/></div>
   <div className="field"><label>Estado</label><select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Todos</option>{['pendiente','borrador','enviada','en_revision','devuelta','rechazada','aprobada','pagado','anulada'].map(x=><option key={x} value={x}>{x.replace('_',' ')}</option>)}</select></div>
   <div className="field"><label>Forma de pago</label><select value={method} onChange={e=>setMethod(e.target.value)}><option value="">Todas</option><option value="none">Sin forma de pago</option>{methods.map(x=><option key={x.id} value={x.id}>{x.nombre}</option>)}</select></div>
   <div className="field"><label>Valor mínimo</label><input type="number" min="0" step=".01" value={min} onChange={e=>setMin(e.target.value)}/></div><div className="field"><label>Valor máximo</label><input type="number" min="0" step=".01" value={max} onChange={e=>setMax(e.target.value)}/></div>
  </div>
  <div className="actions no-print"><button className="primary" onClick={generate}>Generar informe filtrado</button><button onClick={clear}>Limpiar filtros</button>{rows.length>0&&<button onClick={()=>window.print()}>🖨️ Imprimir informe filtrado</button>}</div>
  {rows.length>0&&<div className="advanced-report-print"><h2>Informe de Pagos</h2><p><b>Filtros:</b> {filterText}</p><div className="summary"><div className="stat">Liquidaciones<b>{rows.length}</b></div><div className="stat">Horas<b>{hours.toFixed(2)}</b></div><div className="stat">Total<b>{money(total)}</b></div><div className="stat">Pagado<b>{money(paid)}</b></div><div className="stat">Pendiente<b>{money(pending)}</b></div></div><p><b>Por forma de pago:</b> {Object.entries(byMethod).map(([k,v])=>`${k}: ${money(v)}`).join(' · ')}</p><div style={{overflowX:'auto'}}><table><thead><tr><th>Trabajador</th><th>Período</th><th>Horas</th><th>Total</th><th>Estado</th><th>Pago</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td>{x.trabajadores?.nombre||'-'}</td><td>{dlabel(x.fecha_desde)} - {dlabel(x.fecha_hasta)}</td><td>{Number(x.total_horas||0).toFixed(2)}</td><td>{money(x.gran_total??x.total_pago)}</td><td>{x.estado||'pendiente'}</td><td>{x.metodos_pago?.nombre||'-'}</td></tr>)}</tbody></table></div></div>}
 </section></div>
}
