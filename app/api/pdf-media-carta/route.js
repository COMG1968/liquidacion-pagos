import {PDFDocument,StandardFonts,rgb} from 'pdf-lib'

const W=5.5*72,H=8.5*72,M=22
const clean=s=>String(s||'').replace(/[^\x20-\x7E\u00C0-\u00FF]/g,'-')
const moneyText=s=>clean(s)
function fit(text,font,size,max){let t=clean(text);while(t.length&&font.widthOfTextAtSize(t,size)>max)t=t.slice(0,-1);return t}
export async function POST(req){
 try{
  const d=await req.json();const pdf=await PDFDocument.create();const p=pdf.addPage([W,H]);const bold=await pdf.embedFont(StandardFonts.HelveticaBold),reg=await pdf.embedFont(StandardFonts.Helvetica)
  let y=H-24;const line=(txt,x=M,size=10,font=reg)=>{p.drawText(fit(txt,font,size,W-x-M),{x,y,size,font,color:rgb(0.04,0.10,0.20)});y-=size+5}
  p.drawRectangle({x:M,y:y-40,width:52,height:36,borderWidth:1,borderColor:rgb(.7,.7,.7)})
  p.drawText('LIQUIDACION DE PAGOS',{x:82,y:y-20,size:15,font:bold,color:rgb(.04,.10,.20)})
  p.drawText('SUNLAND TRUSS',{x:310,y:y-18,size:6.5,font:reg,color:rgb(.04,.10,.20)})
  p.drawLine({start:{x:M,y:y-47},end:{x:W-M,y:y-47},thickness:2.5,color:rgb(.96,.45,.08)});y-=64
  line(clean(d.worker).toUpperCase(),M,20,bold);line(d.period,M,9.5,bold);y-=4
  const c1=M,c2=142,c3=286;p.drawText('Fecha',{x:c1,y,size:10,font:bold});p.drawText('Horas',{x:c2,y,size:10,font:bold});p.drawText('Valor dia',{x:c3,y,size:10,font:bold});y-=8;p.drawLine({start:{x:M,y},end:{x:W-M,y},thickness:1,color:rgb(.55,.55,.55)});y-=13
  for(const r of (d.rows||[])){p.drawText(fit(r[0],reg,9,120),{x:c1,y,size:9,font:reg});p.drawText(clean(r[1]),{x:c2,y,size:9,font:reg});const v=moneyText(r[2]);p.drawText(v,{x:W-M-reg.widthOfTextAtSize(v,9),y,size:9,font:reg});y-=18;p.drawLine({start:{x:M,y:y+5},end:{x:W-M,y:y+5},thickness:.5,color:rgb(.7,.7,.7)})}
  y-=3;p.drawLine({start:{x:M,y},end:{x:W-M,y},thickness:1.4,color:rgb(.2,.2,.2)});y-=17
  p.drawText(clean(d.totalHours),{x:M,y,size:10,font:bold});const tt=clean(d.total);p.drawText(tt,{x:W-M-bold.widthOfTextAtSize(tt,12),y,size:12,font:bold});y-=12;p.drawLine({start:{x:M,y},end:{x:W-M,y},thickness:1.4,color:rgb(.2,.2,.2)});y-=22
  p.drawText('Ajustes adicionales',{x:M+6,y,size:12,font:bold});y-=10;p.drawLine({start:{x:M+6,y},end:{x:W-M-6,y},thickness:.7,color:rgb(.5,.5,.5)});y-=14
  for(const a of (d.adjustments||[])){const t=clean(a);p.drawText(t,{x:W-M-6-reg.widthOfTextAtSize(t,9),y,size:9,font:bold});y-=14}
  y-=2;p.drawLine({start:{x:M+6,y},end:{x:W-M-6,y},thickness:1.2,color:rgb(.2,.2,.2)});y-=18
  const gt=clean(d.grandTotal);p.drawText(gt,{x:W-M-6-bold.widthOfTextAtSize(gt,15),y,size:15,font:bold});y-=25
  for(const f of clean(d.footer).split('\n').filter(Boolean)){line(f,M,8.5,bold)}
  const bytes=await pdf.save();return new Response(bytes,{headers:{'content-type':'application/pdf','content-disposition':'inline; filename="liquidacion-media-carta.pdf"','cache-control':'no-store'}})
 }catch(e){return Response.json({error:e.message},{status:500})}
}
