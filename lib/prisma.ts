import {PrismaClient} from "@prisma/client";
import {invalidateCatalogCaches} from "./cache";
const globalForPrisma=globalThis as unknown as{prisma?:PrismaClient};
const base=globalForPrisma.prisma??new PrismaClient();
if(process.env.NODE_ENV!=="production")globalForPrisma.prisma=base;
export const prisma=base.$extends({query:{$allModels:{async $allOperations({model,operation,args,query}){const result=await query(args);if(["Artist","ArtistAlias","Album","AlbumVersion","PurchaseOffer"].includes(model)&&["create","createMany","update","updateMany","upsert","delete","deleteMany"].includes(operation))invalidateCatalogCaches();return result}}}});
