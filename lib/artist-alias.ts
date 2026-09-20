export function normalizeAlias(value:string){
 return value.normalize("NFKC").toLocaleLowerCase().replace(/[\s\p{P}\p{S}]+/gu,"");
}

export function aliasMatches(query:string,values:string[]){
 const normalized=normalizeAlias(query);
 return normalized.length>0&&values.some(value=>normalizeAlias(value)===normalized);
}

export function parseAliasList(value:string){try{const aliases=JSON.parse(value);return Array.isArray(aliases)?aliases.filter((alias):alias is string=>typeof alias==="string"):[]}catch{return[]}}
