import {createClient} from '@supabase/supabase-js'
import {NextResponse} from 'next/server'

const url=process.env.NEXT_PUBLIC_SUPABASE_URL
const secret=process.env.SUPABASE_SECRET_KEY
export async function POST(req){
 try{
  if(!url||!secret||!process.env.ADMIN_RESET_CODE)return NextResponse.json({error:'Configuración del servidor incompleta'},{status:500})
  const {email,password,code}=await req.json()
  if(!email||!password||password.length<8||!code)return NextResponse.json({error:'Datos incompletos'},{status:400})
  if(code!==process.env.ADMIN_RESET_CODE)return NextResponse.json({error:'Código administrativo incorrecto'},{status:403})
  const admin=createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false}})
  const {data:{users},error:listError}=await admin.auth.admin.listUsers({page:1,perPage:1000})
  if(listError)throw listError
  const user=users.find(u=>(u.email||'').toLowerCase()===email.trim().toLowerCase())
  if(!user)return NextResponse.json({error:'Usuario no encontrado'},{status:404})
  const {data:profile,error:pErr}=await admin.from('usuarios_app').select('rol,activo').eq('user_id',user.id).single()
  if(pErr||profile?.rol!=='administrador'||!profile?.activo)return NextResponse.json({error:'La cuenta no es un administrador activo'},{status:403})
  const {error}=await admin.auth.admin.updateUserById(user.id,{password})
  if(error)throw error
  return NextResponse.json({ok:true})
 }catch(e){return NextResponse.json({error:e.message||'Error del servidor'},{status:500})}
}
