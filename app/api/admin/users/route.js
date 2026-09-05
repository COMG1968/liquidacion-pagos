import {createClient} from '@supabase/supabase-js'
import {NextResponse} from 'next/server'
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,secret=process.env.SUPABASE_SECRET_KEY
function adminClient(){return createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false}})}
async function authorize(req){
 const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');if(!token)return null
 const a=adminClient();const {data:{user}}=await a.auth.getUser(token);if(!user)return null
 const {data:p}=await a.from('usuarios_app').select('rol,activo').eq('user_id',user.id).single();return p?.rol==='administrador'&&p?.activo?{a,user}:null
}
export async function POST(req){
 try{const auth=await authorize(req);if(!auth)return NextResponse.json({error:'No autorizado'},{status:401});const b=await req.json();
  if(b.action==='create'){if(!b.email||!b.password||b.password.length<8||!b.trabajador_id)return NextResponse.json({error:'Correo, trabajador y contraseña de mínimo 8 caracteres son obligatorios'},{status:400});const {data,error}=await auth.a.auth.admin.createUser({email:b.email.trim(),password:b.password,email_confirm:true});if(error)throw error;const {error:pe}=await auth.a.from('usuarios_app').upsert({user_id:data.user.id,email:data.user.email,trabajador_id:Number(b.trabajador_id),rol:'trabajador',activo:true});if(pe)throw pe;return NextResponse.json({ok:true,user_id:data.user.id})}
  if(b.action==='password'){if(!b.user_id||!b.password||b.password.length<8)return NextResponse.json({error:'Contraseña de mínimo 8 caracteres requerida'},{status:400});const {data:p}=await auth.a.from('usuarios_app').select('rol').eq('user_id',b.user_id).single();if(p?.rol==='administrador'&&b.user_id!==auth.user.id)return NextResponse.json({error:'No puedes cambiar la contraseña de otro administrador'},{status:403});const {error}=await auth.a.auth.admin.updateUserById(b.user_id,{password:b.password});if(error)throw error;return NextResponse.json({ok:true})}
  return NextResponse.json({error:'Acción no válida'},{status:400})
 }catch(e){return NextResponse.json({error:e.message||'Error del servidor'},{status:500})}
}
