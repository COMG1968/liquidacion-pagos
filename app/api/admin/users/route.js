import {createClient} from '@supabase/supabase-js'
import {NextResponse} from 'next/server'
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,secret=process.env.SUPABASE_SECRET_KEY,publishable=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
function adminClient(){return createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false}})}
function verifyClient(){return createClient(url,publishable,{auth:{autoRefreshToken:false,persistSession:false}})}
async function authorize(req){
 const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null
 if(!url||!secret||!publishable)throw new Error('Configuración de Supabase incompleta en el servidor')
 const v=verifyClient();const {data:{user},error:ue}=await v.auth.getUser(token);if(ue||!user)return null
 const a=adminClient();const {data:p,error:pe}=await a.from('usuarios_app').select('rol,activo').eq('user_id',user.id).maybeSingle();if(pe)throw pe
 return p?.rol==='administrador'&&p?.activo?{a,user}:null
}
async function removeLegacyCollision(a,email,phone,adminId){
 let page=1
 while(page<=10){const {data,error}=await a.auth.admin.listUsers({page,perPage:100});if(error)throw error;const users=data?.users||[]
  for(const u of users){const sameEmail=email&&u.email?.toLowerCase()===email;const samePhone=phone&&u.phone===phone;if(!sameEmail&&!samePhone)continue;if(u.id===adminId)throw new Error('Ese correo o teléfono pertenece al administrador y no puede utilizarse para un trabajador')
   const {data:p}=await a.from('usuarios_app').select('rol,activo,trabajador_id').eq('user_id',u.id).maybeSingle();
   if(p?.rol==='administrador')throw new Error('Ese correo o teléfono pertenece a un administrador')
   if(p?.activo&&p?.trabajador_id)throw new Error('Ese correo o teléfono ya pertenece a otro trabajador activo')
   await a.from('usuarios_app').delete().eq('user_id',u.id);const {error:de}=await a.auth.admin.deleteUser(u.id);if(de)throw de
  }
  if(users.length<100)break;page++
 }
}
export async function POST(req){
 try{const auth=await authorize(req);if(!auth)return NextResponse.json({error:'No autorizado'},{status:401});const b=await req.json();
  if(b.action==='create'){
   const email=b.email?String(b.email).trim().toLowerCase():null,phone=b.phone?String(b.phone).replace(/[^0-9+]/g,''):null
   if((!email&&!phone)||!b.password||b.password.length<8||!b.trabajador_id)return NextResponse.json({error:'Correo y/o teléfono, trabajador y contraseña de mínimo 8 caracteres son obligatorios'},{status:400})
   if(phone&&!/^\+1\d{10}$/.test(phone))return NextResponse.json({error:'Teléfono inválido. Usa +1 seguido de 10 dígitos'},{status:400})
   const {data:existing}=await auth.a.from('usuarios_app').select('user_id').eq('trabajador_id',Number(b.trabajador_id)).eq('activo',true).maybeSingle();if(existing?.user_id)return NextResponse.json({error:'Este trabajador ya tiene un acceso activo. Edítalo en lugar de crear otro.'},{status:409})
   await removeLegacyCollision(auth.a,email,phone,auth.user.id)
   const attrs={password:b.password};if(email){attrs.email=email;attrs.email_confirm=true}if(phone){attrs.phone=phone;attrs.phone_confirm=true}
   const {data,error}=await auth.a.auth.admin.createUser(attrs);if(error)throw error
   const {error:pe}=await auth.a.from('usuarios_app').upsert({user_id:data.user.id,email:data.user.email||email,telefono:data.user.phone||phone,trabajador_id:Number(b.trabajador_id),rol:'trabajador',activo:true,requiere_cambio_clave:true});if(pe){await auth.a.auth.admin.deleteUser(data.user.id);throw pe}
   return NextResponse.json({ok:true,user_id:data.user.id,email:data.user.email||email,phone:data.user.phone||phone,requiere_cambio_clave:true})
  }
  if(b.action==='password'){if(!b.user_id||!b.password||b.password.length<8)return NextResponse.json({error:'Contraseña de mínimo 8 caracteres requerida'},{status:400});const {data:p}=await auth.a.from('usuarios_app').select('rol').eq('user_id',b.user_id).single();if(p?.rol==='administrador'&&b.user_id!==auth.user.id)return NextResponse.json({error:'No puedes cambiar la contraseña de otro administrador'},{status:403});const {error}=await auth.a.auth.admin.updateUserById(b.user_id,{password:b.password});if(error)throw error;if(p?.rol==='trabajador'){const {error:pe}=await auth.a.from('usuarios_app').update({requiere_cambio_clave:true}).eq('user_id',b.user_id);if(pe)throw pe}return NextResponse.json({ok:true})}
  return NextResponse.json({error:'Acción no válida'},{status:400})
 }catch(e){return NextResponse.json({error:e.message||'Error del servidor'},{status:500})}
}
