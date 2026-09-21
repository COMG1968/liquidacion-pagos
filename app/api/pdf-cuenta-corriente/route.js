import {PDFDocument,StandardFonts,rgb} from 'pdf-lib'

const money=n=>'$'+Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})
const clean=s=>String(s||'').replace(/[^\x20-\x7E\u00C0-\u00FF]/g,'-')
const fmt=d=>{if(!d)return'';const [y,m,day]=String(d).slice(0,10).split('-');return m+'/'+day+'/'+y}
const fit=(t,font,size,max)=>{let s=clean(t);while(s.length&&font.widthOfTextAtSize(s,size)>max)s=s.slice(0,-1);return s}
export async function POST(req){
 try{
  const d=await req.json(), items=(d.rows||[]).filter(r=>Number(r.pendiente)>0)
  const pdf=await PDFDocument.create(), reg=await pdf.embedFont(StandardFonts.Helvetica), bold=await pdf.embedFont(StandardFonts.HelveticaBold)
  const orange=rgb(.96,.45,.08), pale=rgb(1,.94,.88), ink=rgb(.08,.08,.08), red=rgb(.72,.05,.05), gray=rgb(.93,.93,.93), white=rgb(1,1,1)
  const W=612,H=792,M=34,rowH=44
  let page,y
  const text=(t,x,yy,size=9,font=reg,color=ink)=>page.drawText(clean(t),{x,y:yy,size,font,color})
  const right=(t,x,yy,size=9,font=reg,color=ink)=>page.drawText(clean(t),{x:x-font.widthOfTextAtSize(clean(t),size),y:yy,size,font,color})
  function header(){
   page=pdf.addPage([W,H]);page.drawRectangle({x:0,y:H-88,width:W,height:88,color:orange})
   text('SUNLANDTRUSS',M,H-36,20,bold,white);text('ESTADO DE CUENTA CORRIENTE',M,H-61,14,bold,white)
   right('Generado: '+fmt(d.generated),W-M,H-36,9,bold,white)
   text('Trabajador: '+clean(d.worker||''),M,H-112,13,bold)
   page.drawRectangle({x:M,y:H-168,width:W-2*M,height:42,color:pale})
   text('SALDO TOTAL PENDIENTE',M+12,H-144,10,bold,red);right(money(d.pending),W-M-12,H-149,18,bold,red)
   y=H-198
  }
  function tableHead(){
   page.drawRectangle({x:M,y:y-18,width:W-2*M,height:22,color:gray})
   text('Liq.',M+5,y-12,8,bold);text('Periodo',M+45,y-12,8,bold);right('Original',M+285,y-12,8,bold);right('Abonos',M+370,y-12,8,bold);right('Pendiente',M+465,y-12,8,bold);text('Estado',M+478,y-12,8,bold);y-=26
  }
  header();tableHead()
  if(!items.length){text('No existen liquidaciones pendientes o parciales.',M,y-10,11,bold)}
  for(const r of items){
   if(y-rowH<70){header();tableHead()}
   const partial=Number(r.abonos)>0
   text('#'+r.liquidacion_id,M+5,y-12,9,bold)
   text(fmt(r.fecha_desde)+' - '+fmt(r.fecha_hasta),M+45,y-12,8,reg)
   right(money(r.valor_original),M+285,y-12,9,reg)
   right(money(r.abonos),M+370,y-12,9,reg)
   right(money(r.pendiente),M+465,y-12,9,bold,red)
   text(partial?'PARCIAL':'PENDIENTE',M+478,y-12,7,bold,partial?orange:red)
   const detail=(r.payments||[]).map(p=>fmt(p.fecha)+' '+money(p.valor)+' · '+(p.origen||'')+(p.nota?' · '+p.nota:'')).join(' | ')
   if(detail)text(fit(detail,reg,7,W-2*M-50),M+45,y-30,7,reg)
   page.drawLine({start:{x:M,y:y-rowH+3},end:{x:W-M,y:y-rowH+3},thickness:.5,color:gray});y-=rowH
  }
  if(y<105){header()}
  y-=12;text('RESUMEN',M,y,10,bold);y-=22
  text('Total liquidado (historico): '+money(d.original),M,y,9,reg)
  text('Total abonos / pagos: '+money(d.paid),M+210,y,9,reg)
  right('SALDO: '+money(d.pending),W-M,y,11,bold,red)
  const bytes=await pdf.save()
  return new Response(bytes,{headers:{'content-type':'application/pdf','content-disposition':`inline; filename="cuenta-corriente-${String(d.worker||'trabajador').replace(/[^a-z0-9]+/gi,'-')}.pdf"`}})
 }catch(e){return Response.json({error:e.message},{status:500})}
}
