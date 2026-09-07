import './globals.css'
export const metadata={title:'Liquidación de Pagos',description:'Control de pagos por horas'}

const printEnhancer=`
(function(){
 function prepare(){
   var r=document.querySelector('.receipt-print');
   if(!r)return;

   if(!r.querySelector('.print-head')){
     var h=document.createElement('div');
     h.className='print-head';
     h.innerHTML='<img src="/sunland-logo.png" alt="Sunland Truss"><div class="print-title">LIQUIDACIÓN DE PAGOS</div><div class="print-meta">SUNLAND TRUSS</div>';
     r.insertBefore(h,r.firstChild);
   }

   var hs=r.querySelectorAll('h3');
   hs.forEach(function(h){
     if((h.textContent||'').trim()==='Ajustes adicionales'){
       var box=h.parentElement;
       box.classList.add('adjustments-print');
       Array.from(box.children).forEach(function(el){
         if(el.tagName==='P'){
           if(!el.dataset.originalAdjustment) el.dataset.originalAdjustment=el.textContent;
           el.textContent=el.textContent.replace(/^\\+\\s*/,'(+) ').replace(/^[−-]\\s*/,'(−) ');
         }
       });
     }
   });
 }
 function restore(){
   document.querySelectorAll('[data-original-adjustment]').forEach(function(el){
     el.textContent=el.dataset.originalAdjustment;
     delete el.dataset.originalAdjustment;
   });
 }
 window.addEventListener('beforeprint',prepare);
 window.addEventListener('afterprint',restore);
})();
`;

export default function RootLayout({children}){
 return <html lang="es"><body>{children}<script dangerouslySetInnerHTML={{__html:printEnhancer}}/></body></html>
}
