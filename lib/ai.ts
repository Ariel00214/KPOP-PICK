import { albums } from "./data";
import { recommendOffers } from "./pricing";

export interface AIProvider { recommend(input:{budget:number;avoidRandom:boolean;priority:"price"|"speed"}):Promise<unknown>; extract(input:string):Promise<Record<string,unknown>>; }
export class RulesProvider implements AIProvider {
  async recommend(input:{budget:number;avoidRandom:boolean;priority:"price"|"speed"}) { return recommendOffers(albums.flatMap(a=>a.offers),input.budget,input.avoidRandom,input.priority); }
  async extract(input:string) {
    const price = input.match(/(?:¥|￥)?\s*(\d+(?:\.\d{1,2})?)/)?.[1];
    const album = albums.find(a=>input.toLowerCase().includes(a.title.toLowerCase()));
    return {artist:album?.artist??"待确认",album:album?.title??"待确认",channel:"待确认",price:price?Number(price):null,deadline:"待确认",shipping:"待确认",source:"用户提交",confidence:price?.length?0.62:0.35};
  }
}
export const aiProvider:AIProvider = new RulesProvider();
