'use client'
import {useEffect,useState} from 'react'

export default function PdfHalfLetterButton(){
 const [visible,setVisible]=useState(false)
 function findReceipt(){
  const candidates=[...document.querySelectorAll('.receipt-print')]
  return candidates.find(r=>r.querySelector('tbody tr'))||candidates[0]||null
 }
 useEffect(()=>{
  const check=()=>setVisible(!!findReceipt())
  check();const o=new MutationObserver(check);o.observe(document.body,{childList:true,subtree:true})
  // La app ya carga la liquidación elegida desde Historial y después llama window.print().
  // Sustituimos SOLO esa llamada final por el PDF media carta aprobado.
  const originalPrint=window.print.bind(window)
  window.print=()=>{setTimeout(()=>makePdf(),80)}
  return()=>{o.disconnect();window.print=originalPrint}
 },[])
 function getBody(){
  const r=findReceipt();if(!r)return null
  const worker=(r.querySelector('.print-only h3')?.textContent||r.querySelector('h2,h3')?.textContent||'').trim()
  const period=(r.querySelector('.print-only p')?.textContent||[...r.querySelectorAll('p')].find(x=>/per[ií]odo/i.test(x.textContent||''))?.textContent||'').trim()
  const rows=[...r.querySelectorAll('tbody tr')].map(tr=>[...tr.querySelectorAll('td')].map(td=>(td.innerText||'').trim().split('\n')[0])).filter(x=>x.length>=3)
  const totals=[...r.querySelectorAll('.total')].map(x=>(x.textContent||'').trim())
  const adjustTitle=[...r.querySelectorAll('h3')].find(x=>(x.textContent||'').trim()==='Ajustes adicionales'),adjustBox=adjustTitle?.parentElement
  const adjustments=adjustBox?[...adjustBox.querySelectorAll('p')].map(x=>(x.textContent||'').trim()).filter(Boolean):[]
  const printBlocks=[...r.querySelectorAll('.print-only')],footer=printBlocks.length?(printBlocks[printBlocks.length-1].innerText||'').trim():''
  const allText=r.innerText||''
  return {worker,period,rows,totalHours:(allText.match(/Total horas:\s*[\d.]+/i)||[''])[0],total:totals.find(x=>/^TOTAL:/i.test(x))||((allText.match(/TOTAL:\s*\$[\d,.]+/i)||[''])[0]),adjustments,grandTotal:totals.find(x=>/GRAN TOTAL:/i.test(x))||((allText.match(/GRAN TOTAL:\s*\$[\d,.]+/i)||[''])[0]),footer}
 }
 async function makePdf(){
  // Espera breve por si la liquidación acaba de cargarse desde Historial.
  let body=getBody()
  if(!body){await new Promise(r=>setTimeout(r,250));body=getBody()}
  if(!body)return alert('No se pudo preparar la liquidación para imprimir. Intenta nuevamente.')
  const res=await fetch('/api/pdf-media-carta',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})
  if(!res.ok)return alert('No fue posible generar el PDF media carta.')
  const blob=await res.blob(),url=URL.createObjectURL(blob);window.open(url,'_blank','noopener,noreferrer');setTimeout(()=>URL.revokeObjectURL(url),60000)
 }
 if(!visible)return null
 return <button type="button" onClick={makePdf} className="primary no-print" style={{position:'fixed',right:18,bottom:18,zIndex:9999,boxShadow:'0 3px 14px #0005'}}>📄 Media carta horizontal</button>
}
