'use client'
import {useEffect,useMemo,useState} from 'react'
import {createClient} from '@supabase/supabase-js'
const sb=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n||0))
const labelDate=d=>d?new Date(d+'T12:00:00').toLocaleDateString('es-US',{month:'2-digit',day:'2-digit',year:'numeric'}):''
const dateDays=(a,b)=>{if(!a||!b)return[];let o=[],d=new Date(a+'T12:00:00'),e=new Date(b+'T12:00:00');while(d<=e){o.push(d.toISOString().slice(0,10));d.setDate(d.getDate()+1)}return o}
const today=()=>new Date().toISOString().slice(0,10)

export default function Page(){
 const [tab,setTab]=useState('new'),[workers,setWorkers]=useState([]),[history,setHistory]=useState([]),[methods,setMethods]=useState([])
 const [worker,setWorker]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState(''),[rows,setRows]=useState([]),[rate,setRate]=useState('')
 const [obs,setObs]=useState(''),[status,setStatus]=useState('pendiente'),[method,setMethod]=useState(''),[editId,setEditId]=useState(null)
 const [name,setName]=useState(''),[rateType,setRateType]=useState('hora'),[newRate,setNewRate]=useState('')
 const [methodName,setMethodName]=useState(''),[filter,setFilter]=useState('')
 const [rFrom,setRFrom]=useState(today()),[rTo,setRTo]=useState(today()),[report,setReport]=useState([])
 useEffect(()=>{loadAll()},[])
 async function loadAll(){await Promise.all([loadWorkers(),loadHistory(),loadMethods()])}
 async function loadWorkers(){let {data}=await sb.from('trabajadores').select('*').order('nombre');setWorkers(data||[])}
 async function loadHistory(){let {data}=await sb.from('liquidaciones').select('*, trabajadores(nombre), metodos_pago(nombre)').order('created_at',{ascending:false});setHistory(data||[])}
 async function loadMethods(){let {data}=await sb.from('metodos_pago').select('*').eq('activo',true).order('nombre');setMethods(data||[])}
 function makeRows(a,b,old={}){setRows(dateDays(a,b).map(fecha=>({fecha,horas:old[fecha]??''})))}
 function chooseWorker(id){setWorker(id);let w=workers.find(x=>String(x.id)===String(id));setRate(w?.valor_hora||'')}
 const totalHours=useMemo(()=>rows.reduce((s,r)=>s+Number(r.horas||0),0),[rows]),total=totalHours*Number(rate||0)
 async function addWorker(){
  if(!name.trim()||!newRate)return alert('Completa nombre y tarifa')
  let hourly=rateType==='dia'?Number(newRate)/8:Number(newRate),daily=rateType==='dia'?Number(newRate):Number(newRate)*8
  let {error}=await sb.from('trabajadores').insert({nombre:name.trim(),valor_hora:hourly,valor_dia:daily,tipo_tarifa:rateType})
  if(error)return alert(error.message);setName('');setNewRate('');await loadWorkers();alert('Trabajador guardado')
 }
 async function addMethod(){if(!methodName.trim())return;let {error}=await sb.from('metodos_pago').insert({nombre:methodName.trim()});if(error)return alert(error.message);setMethodName('');loadMethods()}
 async function save(){
  if(!worker||!from||!to||!rate)return alert('Completa trabajador, fechas y tarifa')
  if(status==='pagado'&&!method)return alert('Selecciona de dónde se pagó')
  let payload={trabajador_id:Number(worker),fecha_desde:from,fecha_hasta:to,valor_hora:Number(rate),total_horas:totalHours,total_pago:total,observaciones:obs||null,estado:status,metodo_pago_id:status==='pagado'?Number(method):null}
  let id=editId
  if(id){let {error}=await sb.from('liquidaciones').update(payload).eq('id',id);if(error)return alert(error.message);await sb.from('detalle_horas').delete().eq('liquidacion_id',id)}
  else{let {data,error}=await sb.from('liquidaciones').insert(payload).select('id').single();if(error)return alert(error.message);id=data.id}
  let det=rows.filter(r=>Number(r.horas)>0).map(r=>({liquidacion_id:id,fecha:r.fecha,horas:Number(r.horas),valor_hora:Number(rate),valor_dia:Number(r.horas)*Number(rate)}))
  if(det.length){let {error}=await sb.from('detalle_horas').insert(det);if(error)return alert(error.message)}
  reset();await loadHistory();setTab('history');alert('Liquidación guardada')
 }
 function reset(){setWorker('');setFrom('');setTo('');setRows([]);setRate('');setObs('');setStatus('pendiente');setMethod('');setEditId(null)}
 async function editPay(p){let {data}=await sb.from('detalle_horas').select('*').eq('liquidacion_id',p.id);let old={};(data||[]).forEach(x=>old[x.fecha]=x.horas);setEditId(p.id);setWorker(String(p.trabajador_id));setRate(p.valor_hora);setFrom(p.fecha_desde);setTo(p.fecha_hasta);setObs(p.observaciones||'');setStatus(p.estado||'pendiente');setMethod(p.metodo_pago_id?String(p.metodo_pago_id):'');makeRows(p.fecha_desde,p.fecha_hasta,old);setTab('new')}
 async function delPay(p){if(!confirm('¿Eliminar esta liquidación?'))return;let {error}=await sb.from('liquidaciones').delete().eq('id',p.id);if(error)return alert(error.message);loadHistory()}
 async function printPay(p){let {data}=await sb.from('detalle_horas').select('*').eq('liquidacion_id',p.id).order('fecha');setWorker(String(p.trabajador_id));setRate(p.valor_hora);setFrom(p.fecha_desde);setTo(p.fecha_hasta);setObs(p.observaciones||'');setStatus(p.estado||'pendiente');setMethod(p.metodo_pago_id?String(p.metodo_pago_id):'');setRows((data||[]).map(x=>({fecha:x.fecha,horas:x.horas})));setTab('new');setTimeout(()=>window.print(),200)}
 async function runReport(a=rFrom,b=rTo){if(!a||!b)return alert('Selecciona el rango');let {data,error}=await sb.from('liquidaciones').select('*, trabajadores(nombre), metodos_pago(nombre)').lte('fecha_desde',b).gte('fecha_hasta',a).order('fecha_desde');if(error)return alert(error.message);setReport(data||[])}
 const reportHours=report.reduce((s,p)=>s+Number(p.total_horas||0),0),reportTotal=report.reduce((s,p)=>s+Number(p.total_pago||0),0)
 const paidTotal=report.filter(p=>p.estado==='pagado').reduce((s,p)=>s+Number(p.total_pago||0),0)
 const byMethod=report.filter(p=>p.estado==='pagado').reduce((a,p)=>{let k=p.metodos_pago?.nombre||'Sin especificar';a[k]=(a[k]||0)+Number(p.total_pago||0);return a},{})
 const filtered=history.filter(h=>!filter||String(h.trabajador_id)===filter)
 return <main>
 <header className="hero"><h1>Liquidación de Pagos</h1><p>Control de pagos de personal</p></header>
 <nav className="nav no-print"><button onClick={()=>{reset();setTab('new')}}>➕ Nueva liquidación</button><button onClick={()=>setTab('workers')}>👥 Trabajadores</button><button onClick={()=>setTab('history')}>📋 Historial</button><button onClick={()=>setTab('reports')}>📊 Informes</button></nav>

 {tab==='workers'&&<section className="card no-print"><h2>Trabajadores</h2><div className="grid">
 <div className="field"><label>Nombre</label><input value={name} onChange={e=>setName(e.target.value)}/></div>
 <div className="field"><label>Tipo de tarifa</label><select value={rateType} onChange={e=>setRateType(e.target.value)}><option value="hora">Valor hora</option><option value="dia">Valor día (8 horas)</option></select></div>
 <div className="field"><label>{rateType==='dia'?'Valor día':'Valor hora'}</label><input type="number" step=".01" value={newRate} onChange={e=>setNewRate(e.target.value)}/>{rateType==='dia'&&newRate&&<small>Valor hora automático: <b>{money(Number(newRate)/8)}</b></small>}</div></div>
 <div className="actions"><button className="primary" onClick={addWorker}>Guardar trabajador</button></div>
 <h3>Personal registrado</h3>{workers.map(w=><p key={w.id}>{w.nombre} — <b>{money(w.valor_hora)}/h</b>{w.valor_dia?<> — {money(w.valor_dia)}/día</>:null}</p>)}
 <hr/><h3>Opciones de pago</h3><div className="grid"><div className="field"><label>Nueva opción</label><input placeholder="Ej. Chase, Bank of America..." value={methodName} onChange={e=>setMethodName(e.target.value)}/></div></div><div className="actions"><button onClick={addMethod}>+ Crear opción de pago</button></div><p>{methods.map(m=>m.nombre).join(' · ')}</p></section>}

 {tab==='new'&&<section className="card receipt-print"><h2>{editId?'Editar liquidación':'Nueva liquidación'}</h2>
 <div className="grid no-print"><div className="field"><label>Trabajador</label><select value={worker} onChange={e=>chooseWorker(e.target.value)}><option value="">Seleccionar...</option>{workers.map(w=><option key={w.id} value={w.id}>{w.nombre}</option>)}</select></div>
 <div className="field"><label>Valor hora</label><input type="number" step=".01" value={rate} onChange={e=>setRate(e.target.value)}/></div>
 <div className="field"><label>Desde</label><input type="date" value={from} onChange={e=>{setFrom(e.target.value);makeRows(e.target.value,to)}}/></div><div className="field"><label>Hasta</label><input type="date" value={to} onChange={e=>{setTo(e.target.value);makeRows(from,e.target.value)}}/></div></div>
 <div className="print-only"><h3>{workers.find(w=>String(w.id)===String(worker))?.nombre}</h3><p><b>Período:</b> {labelDate(from)} — {labelDate(to)} &nbsp; <b>Tarifa:</b> {money(rate)}/h</p></div>
 {rows.length>0&&<><table><thead><tr><th>Fecha</th><th>Horas</th><th className="money">Valor día</th></tr></thead><tbody>{rows.map((r,i)=><tr key={r.fecha}><td>{labelDate(r.fecha)}</td><td><span className="print-only">{r.horas||0}</span><div className="no-print"><input type="number" min="0" step=".25" value={r.horas} onChange={e=>{let a=[...rows];a[i].horas=e.target.value;setRows(a)}}/><button className="quick" onClick={()=>{let a=[...rows];a[i].horas=8;setRows(a)}}>8 h</button></div></td><td className="money">{money(Number(r.horas||0)*Number(rate||0))}</td></tr>)}</tbody></table>
 <div className="grid" style={{marginTop:10}}><div><b>Total horas:</b> {totalHours.toFixed(2)}</div><div className="total">TOTAL: {money(total)}</div></div>
 <div className="grid no-print" style={{marginTop:14}}><div className="field"><label>Estado</label><select value={status} onChange={e=>{setStatus(e.target.value);if(e.target.value!=='pagado')setMethod('')}}><option value="pendiente">Pendiente</option><option value="pagado">Pagado</option></select></div>
 {status==='pagado'&&<div className="field"><label>Pagado desde</label><select value={method} onChange={e=>setMethod(e.target.value)}><option value="">Seleccionar...</option>{methods.map(m=><option key={m.id} value={m.id}>{m.nombre}</option>)}</select></div>}
 <div className="field"><label>Observaciones</label><textarea value={obs} onChange={e=>setObs(e.target.value)}/></div></div>
 <div className="print-only"><p><b>Estado:</b> {status==='pagado'?'Pagado':'Pendiente'} {status==='pagado'&&<> — <b>Pagado desde:</b> {methods.find(m=>String(m.id)===String(method))?.nombre||''}</>}</p>{obs&&<p><b>Observaciones:</b> {obs}</p>}<p>Firma quien paga: ____________________ &nbsp;&nbsp; Firma quien recibe: ____________________</p></div>
 <div className="actions no-print"><button className="success" onClick={save}>{editId?'Guardar cambios':'Guardar liquidación'}</button><button onClick={()=>window.print()}>🖨️ Imprimir</button>{editId&&<button onClick={reset}>Cancelar</button>}</div></>}</section>}

 {tab==='history'&&<section className="card no-print"><h2>Historial</h2><div className="field"><label>Filtrar por trabajador</label><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="">Todos</option>{workers.map(w=><option key={w.id} value={w.id}>{w.nombre}</option>)}</select></div>
 <table><thead><tr><th>Trabajador</th><th>Período</th><th>Horas</th><th>Total</th><th>Estado / Pago</th><th>Acciones</th></tr></thead><tbody>{filtered.map(p=><tr key={p.id}><td>{p.trabajadores?.nombre}</td><td>{labelDate(p.fecha_desde)} / {labelDate(p.fecha_hasta)}</td><td>{p.total_horas}</td><td>{money(p.total_pago)}</td><td>{p.estado||'pendiente'}{p.metodos_pago?.nombre?<><br/><small>{p.metodos_pago.nombre}</small></>:null}</td><td><div className="actions"><button onClick={()=>editPay(p)}>Editar</button><button onClick={()=>printPay(p)}>Imprimir</button><button className="danger" onClick={()=>delPay(p)}>Eliminar</button></div></td></tr>)}</tbody></table></section>}

 {tab==='reports'&&<><section className="card no-print"><h2>📊 Informe de pagos</h2><div className="actions"><button onClick={()=>{let t=today();setRFrom(t);setRTo(t);runReport(t,t)}}>Hoy</button></div><div className="grid"><div className="field"><label>Desde</label><input type="date" value={rFrom} onChange={e=>setRFrom(e.target.value)}/></div><div className="field"><label>Hasta</label><input type="date" value={rTo} onChange={e=>setRTo(e.target.value)}/></div></div><div className="actions"><button className="primary" onClick={()=>runReport()}>Generar informe</button>{report.length>0&&<button onClick={()=>window.print()}>🖨️ Imprimir informe</button>}</div>
 {report.length>0&&<><div className="summary"><div className="stat">Liquidaciones<b>{report.length}</b></div><div className="stat">Horas<b>{reportHours.toFixed(2)}</b></div><div className="stat">Total pagado<b>{money(paidTotal)}</b></div></div><p><b>Por forma de pago:</b> {Object.entries(byMethod).map(([k,v])=>`${k}: ${money(v)}`).join(' · ')}</p></>}</section>
 <section className="report-print"><h2>Informe de Pagos</h2><p>Período: {labelDate(rFrom)} — {labelDate(rTo)}</p><div className="summary"><div className="stat">Liquidaciones<b>{report.length}</b></div><div className="stat">Horas<b>{reportHours.toFixed(2)}</b></div><div className="stat">Pagado<b>{money(paidTotal)}</b></div></div>
 <table><thead><tr><th>Trabajador</th><th>Período</th><th>Horas</th><th>Total</th><th>Estado</th><th>Pago</th></tr></thead><tbody>{report.map(p=><tr key={p.id}><td>{p.trabajadores?.nombre}</td><td>{labelDate(p.fecha_desde)}-{labelDate(p.fecha_hasta)}</td><td>{p.total_horas}</td><td>{money(p.total_pago)}</td><td>{p.estado}</td><td>{p.metodos_pago?.nombre||'-'}</td></tr>)}</tbody></table><p><b>Totales por forma de pago:</b> {Object.entries(byMethod).map(([k,v])=>`${k}: ${money(v)}`).join(' | ')}</p><h3>TOTAL PAGADO: {money(paidTotal)}</h3></section></>}
 </main>
}
