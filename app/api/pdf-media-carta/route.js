import {PDFDocument,StandardFonts,rgb} from 'pdf-lib'

// Media carta REAL horizontal: 8.5 x 5.5 pulgadas
const W=8.5*72,H=5.5*72,M=14
const orange=rgb(.96,.45,.08), pale=rgb(1,.91,.76), ink=rgb(.04,.06,.08), gray=rgb(.92,.92,.92), line=rgb(.48,.48,.48)
const clean=s=>String(s||'').replace(/[^\x20-\x7E\u00C0-\u00FF]/g,'-')
const fit=(text,font,size,max)=>{let t=clean(text);while(t.length&&font.widthOfTextAtSize(t,size)>max)t=t.slice(0,-1);return t}
const right=(p,t,xRight,y,size,font)=>p.drawText(clean(t),{x:xRight-font.widthOfTextAtSize(clean(t),size),y,size,font,color:ink})
export async function POST(req){
 try{
  const d=await req.json();const pdf=await PDFDocument.create();const p=pdf.addPage([W,H]);
  const bold=await pdf.embedFont(StandardFonts.HelveticaBold),reg=await pdf.embedFont(StandardFonts.Helvetica)
  // marco y encabezado naranja
  p.drawRectangle({x:5,y:5,width:W-10,height:H-10,borderWidth:.8,borderColor:line})
  p.drawRectangle({x:M,y:H-70,width:W-2*M,height:55,color:orange})
  p.drawText('SUNLAND TRUSS',{x:M+14,y:H-46,size:15,font:bold,color:ink})
  p.drawText('BUILDING A STRONGER TOMORROW',{x:M+15,y:H-58,size:5.5,font:bold,color:ink})
  p.drawText('LIQUIDACION DE PAGOS',{x:205,y:H-43,size:22,font:bold,color:ink})
  p.drawText('MIAMI, FLORIDA',{x:292,y:H-59,size:8.5,font:bold,color:ink})
  p.drawText('TRUSSES  PEOPLE  QUALITY  RESULTS',{x:458,y:H-47,size:6.5,font:bold,color:ink})

  // trabajador y periodo
  const top=H-88
  p.drawText('TRABAJADOR:',{x:M+6,y:top,size:8,font:bold,color:line})
  p.drawText(fit(clean(d.worker).toUpperCase(),bold,20,285),{x:M+6,y:top-24,size:20,font:bold,color:ink})
  p.drawText('Periodo:',{x:330,y:top-1,size:9,font:bold,color:ink})
  p.drawText(fit(d.period,reg,8.5,235),{x:374,y:top-1,size:8.5,font:reg,color:ink})

  // tabla principal
  let y=top-42; const x0=M+6,x1=165,x2=300,x3=430,x4=W-M-6
  p.drawRectangle({x:x0,y:y-18,width:x4-x0,height:18,color:gray,borderWidth:.5,borderColor:line})
  p.drawText('Fecha',{x:x0+48,y:y-13,size:9,font:bold,color:ink});p.drawText('Horas',{x:x2+18,y:y-13,size:9,font:bold,color:ink});right(p,'Valor dia',x4-10,y-13,9,bold)
  y-=18
  const rows=(d.rows||[]).slice(0,7)
  for(const r of rows){
   p.drawRectangle({x:x0,y:y-18,width:x4-x0,height:18,borderWidth:.35,borderColor:line})
   p.drawText(fit(r[0],reg,8,240),{x:x0+8,y:y-13,size:8,font:reg,color:ink});p.drawText(clean(r[1]),{x:x2+22,y:y-13,size:8,font:reg,color:ink});right(p,r[2],x4-8,y-13,8,reg);y-=18
  }
  // total horas / total
  p.drawRectangle({x:x0,y:y-22,width:x4-x0,height:22,color:gray,borderWidth:.6,borderColor:line})
  p.drawText(clean(d.totalHours||'Total horas:'),{x:x0+8,y:y-15,size:9.5,font:bold,color:ink});right(p,d.total||'TOTAL:',x4-8,y-16,12,bold);y-=29

  // ajustes
  p.drawRectangle({x:x0,y:y-20,width:x4-x0,height:20,color:pale,borderWidth:.5,borderColor:line})
  p.drawText('Ajustes adicionales',{x:x0+8,y:y-15,size:12,font:bold,color:ink});y-=20
  const adjustments=(d.adjustments||[]).filter(Boolean).slice(0,3)
  for(const a of adjustments){p.drawRectangle({x:x0,y:y-16,width:x4-x0,height:16,borderWidth:.35,borderColor:line});p.drawText(fit(a,reg,8.5,x4-x0-18),{x:x0+8,y:y-12,size:8.5,font:reg,color:ink});y-=16}
  p.drawRectangle({x:x0,y:y-25,width:x4-x0,height:25,color:pale,borderWidth:.5,borderColor:line})
  right(p,d.grandTotal||'GRAN TOTAL:',x4-10,y-18,16,bold);y-=36

  // pie
  const footerLines=clean(d.footer).split('\n').filter(Boolean)
  const status=footerLines.find(s=>/^Estado:/i.test(s))||'Estado: Pendiente'
  p.drawText(status,{x:x0+6,y,size:9.5,font:bold,color:ink})
  p.drawText('Firma quien paga',{x:x0+70,y:y-29,size:8,font:reg,color:ink});p.drawLine({start:{x:x0+8,y:y-19},end:{x:x0+175,y:y-19},thickness:.7,color:ink})
  p.drawText('Firma quien recibe',{x:x0+360,y:y-29,size:8,font:reg,color:ink});p.drawLine({start:{x:x0+300,y:y-19},end:{x:x4-8,y:y-19},thickness:.7,color:ink})
  const bytes=await pdf.save();return new Response(bytes,{headers:{'content-type':'application/pdf','content-disposition':'inline; filename="liquidacion-media-carta-horizontal.pdf"','cache-control':'no-store'}})
 }catch(e){return Response.json({error:e.message},{status:500})}
}
