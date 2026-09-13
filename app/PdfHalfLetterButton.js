'use client'
import {useEffect,useState} from 'react'

export default function PdfHalfLetterButton(){
 const [visible,setVisible]=useState(false)
 useEffect(()=>{
  const check=()=>{const r=document.querySelector('.receipt-print');setVisible(!!(r&&r.querySelector('tbody tr')))}
  check();const o=new MutationObserver(check);o.observe(document.body,{childList:true,subtree:true})
  const intercept=e=>{
   const b=e.target?.closest?.('button');if(!b)return
   const text=(b.textContent||'').trim().toLowerCase()
   if(text.includes('imprimir')&&!text.includes('pdf')){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();makePdf()}
  }
  document.addEventListener('click',intercept,true)
  return()=>{o.disconnect();document.removeEventListener('click',intercept,true)}
 },[])
 async function makePdf(){
  const r=document.querySelector('.receipt-print');if(!r)return alert('Abre primero una liquidación.')
  const worker=(r.querySelector('.print-only h3')?.textContent||'').trim()
  const period=(r.querySelector('.print-only p')?.textContent||'').trim()
  const rows=[...r.querySelectorAll('tbody tr')].map(tr=>[...tr.querySelectorAll('td')].map(td=>(td.innerText||'').trim().split('\n')[0]))
  const totals=[...r.querySelectorAll('.total')].map(x=>(x.textContent||'').trim())
  const adjustTitle=[...r.querySelectorAll('h3')].find(x=>(x.textContent||'').trim()==='Ajustes adicionales')
  const adjustBox=adjustTitle?.parentElement
  const adjustments=adjustBox?[...adjustBox.querySelectorAll('p')].map(x=>(x.textContent||'').trim()).filter(Boolean):[]
  const printBlocks=[...r.querySelectorAll('.print-only')]
  const footer=printBlocks.length?(printBlocks[printBlocks.length-1].innerText||'').trim():''
  const body={worker,period,rows,totalHours:(r.innerText.match(/Total horas:\s*[\d.]+/)||[''])[0],total:totals.find(x=>/^TOTAL:/i.test(x))||'',adjustments,grandTotal:totals.find(x=>/GRAN TOTAL:/i.test(x))||'',footer}
  const res=await fetch('/api/pdf-media-carta',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})
  if(!res.ok)return alert('No fue posible generar el PDF media carta.')
  const blob=await res.blob(),url=URL.createObjectURL(blob);window.open(url,'_blank','noopener,noreferrer');setTimeout(()=>URL.revokeObjectURL(url),60000)
 }
 if(!visible)return null
 return <button type="button" onClick={makePdf} className="primary no-print" style={{position:'fixed',right:18,bottom:18,zIndex:9999,boxShadow:'0 3px 14px #0005'}}>📄 PDF media carta</button>
}
