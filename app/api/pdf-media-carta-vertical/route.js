import {PDFDocument,StandardFonts,rgb} from 'pdf-lib'
const W=5.5*72,H=8.5*72,M=16
const ink=rgb(.03,.07,.12),orange=rgb(.98,.45,.08),gray=rgb(.92,.92,.92),pale=rgb(.96,.96,.96),line=rgb(.5,.5,.5),red=rgb(.85,.03,.03),green=rgb(.03,.55,.10)
const clean=s=>String(s||'').replace(/[^\x20-\x7E\u00C0-\u00FF]/g,'-')
const fit=(t,f,s,m)=>{let x=clean(t);while(x.length&&f.widthOfTextAtSize(x,s)>m)x=x.slice(0,-1);return x}
const right=(p,t,x,y,s,f,c=ink)=>p.drawText(clean(t),{x:x-f.widthOfTextAtSize(clean(t),s),y,size:s,font:f,color:c})
function adj(raw){const s=clean(raw).trim(),neg=/^\s*(?:\(\s*-\s*\)|-|−)/.test(s),no=s.replace(/^\s*(?:\(\s*[+\-−]\s*\)|[+\-−])\s*/,'').trim(),m=no.match(/^(.*?)(?:\s*:\s*)?(\$\s*[\d,.]+)\s*$/);return{sign:neg?'-':'+',label:(m?.[1]||no).replace(/:\s*$/,''),value:m?.[2]||'',neg}}
export async function POST(req){try{
 const d=await req.json(),pdf=await PDFDocument.create(),p=pdf.addPage([W,H]),bold=await pdf.embedFont(StandardFonts.HelveticaBold),reg=await pdf.embedFont(StandardFonts.Helvetica)
 p.drawRectangle({x:8,y:8,width:W-16,height:H-16,borderWidth:.8,borderColor:line})
 // encabezado compacto como referencia vertical
 const lx=M+4,hy=H-48
 p.drawLine({start:{x:lx,y:hy},end:{x:lx+22,y:hy+14},thickness:1.6,color:orange});p.drawLine({start:{x:lx+22,y:hy+14},end:{x:lx+44,y:hy},thickness:1.6,color:orange});p.drawLine({start:{x:lx,y:hy},end:{x:lx+44,y:hy},thickness:1.6,color:orange});p.drawText('SUNLAND TRUSS',{x:lx+2,y:hy-9,size:5.5,font:bold,color:ink})
 p.drawText('LIQUIDACION DE PAGOS',{x:92,y:H-45,size:15.5,font:bold,color:ink});p.drawText('SUNLAND TRUSS',{x:315,y:H-44,size:5.8,font:reg,color:ink});p.drawLine({start:{x:M+4,y:H-60},end:{x:W-M-4,y:H-60},thickness:2,color:orange})
 let y=H-88;p.drawText(fit(clean(d.worker).toUpperCase(),bold,20,W-2*M-8),{x:M+4,y,size:20,font:bold,color:ink});y-=18
 let period=clean(d.period).replace(/^\s*Per[ií]odo\s*:\s*/i,'').trim();p.drawText(fit('Periodo: '+period,bold,9,W-2*M-8),{x:M+4,y,size:9,font:bold,color:ink});y-=25
 const x0=M+4,x4=W-M-4,xHours=155
 p.drawRectangle({x:x0,y:y-20,width:x4-x0,height:20,color:gray,borderWidth:.5,borderColor:line});p.drawText('Fecha',{x:x0+4,y:y-14,size:9,font:bold,color:ink});p.drawText('Horas',{x:xHours,y:y-14,size:9,font:bold,color:ink});right(p,'Valor dia',x4-4,y-14,9,bold);y-=20
 for(const r of (d.rows||[]).slice(0,7)){p.drawRectangle({x:x0,y:y-22,width:x4-x0,height:22,borderWidth:.35,borderColor:line});p.drawText(fit(r[0],reg,8.5,130),{x:x0+4,y:y-15,size:8.5,font:reg,color:ink});p.drawText(clean(r[1]),{x:xHours,y:y-15,size:8.5,font:reg,color:ink});right(p,r[2],x4-4,y-15,8.5,reg);y-=22}
 p.drawRectangle({x:x0,y:y-25,width:x4-x0,height:25,color:pale,borderWidth:.6,borderColor:line});p.drawText(clean(d.totalHours||'Total horas:'),{x:x0+4,y:y-17,size:10,font:bold,color:ink});right(p,d.total||'TOTAL:',x4-4,y-18,12,bold);y-=34
 p.drawRectangle({x:x0,y:y-22,width:x4-x0,height:22,color:gray,borderWidth:.5,borderColor:line});p.drawText('Ajustes adicionales',{x:x0+5,y:y-16,size:12,font:bold,color:ink});y-=22
 for(const raw of (d.adjustments||[]).filter(Boolean).slice(0,3)){const a=adj(raw),c=a.neg?red:ink;p.drawRectangle({x:x0,y:y-21,width:x4-x0,height:21,borderWidth:.35,borderColor:line});p.drawText(fit(a.label,reg,9,220),{x:x0+5,y:y-15,size:9,font:reg,color:ink});p.drawText(a.sign,{x:x4-78,y:y-16,size:14,font:bold,color:a.neg?red:green});right(p,a.value,x4-5,y-15,10,bold,c);y-=21}
 p.drawRectangle({x:x0,y:y-31,width:x4-x0,height:31,color:pale,borderWidth:.5,borderColor:line});right(p,d.grandTotal||'GRAN TOTAL:',x4-5,y-22,17,bold);y-=43
 const lines=clean(d.footer).split('\n').filter(Boolean),status=lines.find(s=>/^Estado:/i.test(s))||'Estado: Pendiente';p.drawText(status,{x:x0,y,size:10,font:bold,color:ink});y-=25
 p.drawLine({start:{x:x0+5,y},end:{x:x0+155,y},thickness:.7,color:ink});p.drawLine({start:{x:x0+205,y},end:{x:x4-5,y},thickness:.7,color:ink});p.drawText('Firma quien paga',{x:x0+40,y:y-14,size:8,font:reg,color:ink});p.drawText('Firma quien recibe',{x:x0+230,y:y-14,size:8,font:reg,color:ink})
 const bytes=await pdf.save();return new Response(bytes,{headers:{'content-type':'application/pdf','content-disposition':'inline; filename="liquidacion-media-carta-vertical.pdf"','cache-control':'no-store'}})
}catch(e){return Response.json({error:e.message},{status:500})}}
