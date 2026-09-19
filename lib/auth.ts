import {cookies} from "next/headers";
import {createHash,randomBytes,randomUUID,scrypt as scryptCallback,timingSafeEqual} from "node:crypto";
import {promisify} from "node:util";
import {prisma} from "./prisma";

const scrypt=promisify(scryptCallback);
export const SESSION_COOKIE="kpop_session";
export const SESSION_MAX_AGE=60*60*24*30;

export function normalizeEmail(value:string){return value.trim().toLowerCase()}
export async function hashPassword(password:string){
 const salt=randomBytes(16).toString("hex");
 const key=await scrypt(password,salt,64) as Buffer;
 return `scrypt:${salt}:${key.toString("hex")}`;
}
export async function verifyPassword(password:string,stored:string){
 const [,salt,hex]=stored.split(":");
 if(!salt||!hex)return false;
 const key=await scrypt(password,salt,64) as Buffer;
 const expected=Buffer.from(hex,"hex");
 return key.length===expected.length&&timingSafeEqual(key,expected);
}
const tokenHash=(token:string)=>createHash("sha256").update(token).digest("hex");
export async function createSession(userId:string){
 const token=randomBytes(32).toString("base64url");
 const expiresAt=new Date(Date.now()+SESSION_MAX_AGE*1000);
 await prisma.session.create({data:{tokenHash:tokenHash(token),userId,expiresAt}});
 return {token,expiresAt};
}
export async function deleteSession(token?:string){if(token)await prisma.session.deleteMany({where:{tokenHash:tokenHash(token)}})}
export async function getCurrentUser(){
 const token=(await cookies()).get(SESSION_COOKIE)?.value;
 if(!token)return null;
 const session=await prisma.session.findUnique({where:{tokenHash:tokenHash(token)},include:{user:{select:{id:true,displayName:true,mode:true,createdAt:true,account:{select:{email:true}}}}}});
 if(!session||session.expiresAt<=new Date()){if(session)await prisma.session.delete({where:{id:session.id}}).catch(()=>{});return null}
 const{account,...user}=session.user;return {...user,email:account?.email??null};
}
export const newAnonymousId=()=>randomUUID();
export const sessionCookieOptions=(expires:Date)=>({httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax" as const,path:"/",expires});
