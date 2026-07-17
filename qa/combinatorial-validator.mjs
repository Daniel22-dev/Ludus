import { readFile } from "node:fs/promises";
import path from "node:path";
export async function validateScenario(s,{root}) {
  const file=path.join(root,'engines',`${s.engine}.html`);
  const text=await readFile(file,'utf8').catch(()=>"");
  if(!text) return {pass:false,message:`Nenalezen engine ${s.engine}`};
  const hasBoot=/(DOMContentLoaded|readyState|init|start)/i.test(text);
  const tokenSafe=s.engine!=='indiana-jones' || /(replaceMappedToken|tokenBoundary|\[A-Za-zÀ-ž0-9_\])/i.test(text);
  const sharedVersion=/LUDUS STANDARD BLOCK START v1\.16\.2/.test(text) && /var VERSION=["']1\.16\.2["']/.test(text);
  return {pass:hasBoot&&tokenSafe&&sharedVersion,evidence:`engine=${s.engine}; boot=${hasBoot}; tokenSafe=${tokenSafe}; standard=${sharedVersion}; stage=${s.stage}; content=${s.content}; device=${s.device}`};
}
