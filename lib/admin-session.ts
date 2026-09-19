import {createHmac,timingSafeEqual} from "node:crypto";
export function adminToken(){const expires=String(Date.now()+3600_000);return `${expires}.${sign(expires)}`}
function sign(value:string){return createHmac("sha256",process.env.ADMIN_PASSWORD||"disabled").update(`admin:${value}`).digest("hex")}
export function validAdminToken(token?:string){if(!process.env.ADMIN_PASSWORD||!token)return false;const[expires,signature]=token.split(".");if(!signature||!/^\d+$/.test(expires)||Number(expires)<=Date.now())return false;const expected=Buffer.from(sign(expires));const supplied=Buffer.from(signature);return expected.length===supplied.length&&timingSafeEqual(expected,supplied)}
