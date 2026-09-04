'use client'
import {useEffect,useMemo,useState} from 'react'
import {createClient} from '@supabase/supabase-js'

const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n||0))
const iso=d=>{const x=new Date(d+'T12:00:00');return x.toLocaleDateString('es-US',{weekday:'short',month:'2-digit',day:'2-digit',year:'numeric'})}
const days=(a,b)=>{if(!a||!b)return[];let out=[],d=new Date(a+'T12:00:00'),e=new Date(b+'T12:00:00');while(d<=e){out.push(d.toISOString().slice(0,10));d.setDate(d.getDate()+1)}return out}

export default function Page(){
 const [tab,setTab]=useState('new'),[workers,setWorkers]=useState([]),[history,setHistory]=useState([])
 const [worker,setWorker]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState(''),[rows,setRows]=useState([])
 const [rate,setRate]=useState(''),[obs,setObs]=useState(''),[status,setStatus]=useState('pendiente'),[editId,setEditId]=useState(null)
 const [name,setName]=useState(''),[newRate,setNewRate]=useState(''),[filter,setFilter]=useState('')
 useEffect(()=>{loadWorkers();loadHistory()},[])
 async function loadWorkers(){let {data}=await supabase.from('trabajadores').select('*').order('nombre');setWorkers(data||[])}
 async function loadHistory(){let {data}=await supabase.from('liquidaciones').select('*, trabajadores(nombre)').order('created_at',{ascending:false});setHistory(data||[])}
 function chooseWorker(id){setWorker(id);let w=workers.find(x=>String(x.id)===String(id));setRate(w?.valor_hora||'')}
 function makeRows(a,b,old={}){setRows(days(a,b).map(fecha=>({fecha,horas:old[fecha]??''})))}
 const totalHours=useMemo(()=>rows.reduce((s,r)=>s+Number(r.horas||0),0),[rows])
 const total=totalHours*Number(rate||0)
 async function addWorker(){if(!name.trim()||!newRate)return alert('Completa nombre y valor hora');let {error}=await supabase.from('trabajadores').insert({nombre:name.trim(),valor_hora:Number(newRate)});if(error)return alert(error.message);setName('');setNewRate('');await loadWorkers();alert('Trabajador guardado')}
 async function save(){
  if(!worker||!from||!to||!rate)return alert('Completa trabajador, fechas y valor hora')
  let payload={trabajador_id:Number(worker),fecha_desde:from,fecha_hasta:to,valor_hora:Number(rate),total_horas:totalHours,total_pago:total,observaciones:obs||null,estado:status}
  let id=editId
  if(editId){let {error}=await supabase.from('liquidaciones').update(payload).eq('id',editId);if(error)return alert(error.message);await supabase.from('detalle_horas').delete().eq('liquidacion_id',editId)}
  else {let {data,error}=await supabase.from('liquidaciones').insert(payload).select('id').single();if(error)return alert(error.message);id=data.id}
  let det=rows.filter(r=>Number(r.horas)>0).map(r=>({liquidacion_id:id,fecha:r.fecha,horas:Number(r.horas),valor_hora:Number(rate),valor_dia:Number(r.horas)*Number(rate)}))
  if(det.length){let {error}=await supabase.from('detalle_horas').insert(det);if(error)return alert(error.message)}
  reset();await loadHistory();setTab('history');alert(editId?'Liquidación actualizada':'Liquidación guardada')
 }
 function reset(){setWorker('');setFrom('');setTo('');setRows([]);setRate('');setObs('');setStatus('pendiente');setEditId(null)}
 async function editPay(p){let {data}=await supabase.from('detalle_horas').select('*').eq('liquidacion_id',p.id);let old={};(data||[]).forEach(x=>old[x.fecha]=x.horas);setEditId(p.id);setWorker(String(p.trabajador_id));setRate(p.valor_hora);setFrom(p.fecha_desde);setTo(p.fecha_hasta);setObs(p.observaciones||'');setStatus(p.estado||'pendiente');makeRows(p.fecha_desde,p.fecha_hasta,old);setTab('new')}
 async function delPay(p){if(!confirm('¿Eliminar esta liquidación? Esta acción no se puede deshacer.'))return;let {error}=await supabase.from('liquidaciones').delete().eq('id',p.id);if(error)return alert(error.message);loadHistory()}
 async function printPay(p){let {data}=await supabase.from('detalle_horas').select('*').eq('liquidacion_id',p.id).order('fecha');setWorker(String(p.trabajador_id));setRate(p.valor_hora);setFrom(p.fecha_desde);setTo(p.fecha_hasta);setObs(p.observaciones||'');setStatus(p.estado||'pendiente');setRows((data||[]).map(x=>({fecha:x.fecha,horas:x.horas})));setTimeout(()=>window.print(),150)}
 const filtered=history.filter(h=>!filter||String(h.trabajador_id)===filter)
 return <main>
  <header className="hero"><h1>Liquidación de Pagos</h1><p>Control sencillo de pagos de personal por horas</p></header>
  <nav className="nav no-print"><button onClick={()=>{reset();setTab('new')}}>+ Nueva liquidación</button><button onClick={()=>setTab('workers')}>👥 Trabajadores</button><button onClick={()=>setTab('history')}>📋 Historial</button></nav>

  {tab==='workers'&&<section className="card no-print"><h2>Trabajadores</h2><div className="grid"><div className="field"><label>Nombre</label><input value={name} onChange={e=>setName(e.target.value)}/></div><div className="field"><label>Valor hora</label><input type="number" step="0.01" value={newRate} onChange={e=>setNewRate(e.target.value)}/></div></div><div className="actions"><button className="primary" onClick={addWorker}>Guardar trabajador</button></div><h3>Personal registrado</h3>{workers.map(w=><div key={w.id}>{w.nombre} — <b>{money(w.valor_hora)}/h</b></div>)}</section>}

  {tab==='new'&&<section className="card receipt"><h2>{editId?'Editar liquidación':'Nueva liquidación'}</h2><div className="grid no-print">
   <div className="field"><label>Trabajador</label><select value={worker} onChange={e=>chooseWorker(e.target.value)}><option value="">Seleccionar...</option>{workers.map(w=><option key={w.id} value={w.id}>{w.nombre}</option>)}</select></div>
   <div className="field"><label>Valor hora</label><input type="number" step="0.01" value={rate} onChange={e=>setRate(e.target.value)}/></div>
   <div className="field"><label>Desde</label><input type="date" value={from} onChange={e=>{setFrom(e.target.value);makeRows(e.target.value,to)}}/></div>
   <div className="field"><label>Hasta</label><input type="date" value={to} onChange={e=>{setTo(e.target.value);makeRows(from,e.target.value)}}/></div>
  </div>
  <div className="print-only"><h3>{workers.find(w=>String(w.id)===String(worker))?.nombre}</h3><p>Período: {from&&iso(from)} — {to&&iso(to)} &nbsp; | &nbsp; Valor hora: {money(rate)}</p></div>
  {rows.length>0&&<><table><thead><tr><th>Fecha</th><th>Horas</th><th className="money">Valor día</th></tr></thead><tbody>{rows.map((r,i)=><tr key={r.fecha}><td>{iso(r.fecha)}</td><td><span className="print-only">{r.horas||0}</span><div className="no-print"><input type="number" min="0" step=".25" value={r.horas} onChange={e=>{let a=[...rows];a[i].horas=e.target.value;setRows(a)}}/><button className="quick" onClick={()=>{let a=[...rows];a[i].horas=8;setRows(a)}}>8 h</button></div></td><td className="money">{money(Number(r.horas||0)*Number(rate||0))}</td></tr>)}</tbody></table>
  <div className="grid" style={{marginTop:16}}><div><b>Total horas:</b> {totalHours.toFixed(2)}</div><div className="total">TOTAL: {money(total)}</div></div>
  <div className="grid no-print" style={{marginTop:16}}><div className="field"><label>Estado</label><select value={status} onChange={e=>setStatus(e.target.value)}><option value="pendiente">Pendiente</option><option value="pagado">Pagado</option></select></div><div className="field"><label>Observaciones</label><textarea value={obs} onChange={e=>setObs(e.target.value)}/></div></div>
  <div className="print-only"><p><b>Estado:</b> {status==='pagado'?'Pagado':'Pendiente'}</p>{obs&&<p><b>Observaciones:</b> {obs}</p>}<br/><p>Firma quien paga: _______________________</p><br/><p>Firma quien recibe: _____________________</p></div>
  <div className="actions no-print"><button className="success" onClick={save}>{editId?'Guardar cambios':'Guardar liquidación'}</button><button onClick={()=>window.print()}>🖨️ Imprimir</button>{editId&&<button onClick={reset}>Cancelar edición</button>}</div></>}</section>}

  {tab==='history'&&<section className="card no-print"><h2>Historial</h2><div className="field"><label>Filtrar por trabajador</label><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="">Todos</option>{workers.map(w=><option key={w.id} value={w.id}>{w.nombre}</option>)}</select></div>
  <table><thead><tr><th>Trabajador</th><th>Período</th><th>Horas</th><th>Total</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{filtered.map(p=><tr key={p.id}><td>{p.trabajadores?.nombre}</td><td>{p.fecha_desde} / {p.fecha_hasta}</td><td>{p.total_horas}</td><td>{money(p.total_pago)}</td><td><span className="badge">{p.estado||'pendiente'}</span></td><td><div className="actions"><button onClick={()=>editPay(p)}>Editar</button><button onClick={()=>printPay(p)}>Imprimir</button><button className="danger" onClick={()=>delPay(p)}>Eliminar</button></div></td></tr>)}</tbody></table></section>}
 </main>
}
