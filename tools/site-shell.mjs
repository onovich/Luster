export function siteHeader(current,{home,product,pricing,editor},utility=''){
  const links=[['home','Home',home],['product','Product',product],['pricing','Pricing',pricing],['editor','Editor',editor]];
  return `<header class="siteHeader"><a class="siteBrand" href="${home}" aria-label="Luster home">Luster</a><nav class="siteNav" aria-label="Main navigation">${links.map(([key,label,href])=>`<a href="${href}"${key===current?' aria-current="page"':''}>${label}</a>`).join('')}</nav>${utility?`<div class="siteUtility">${utility}</div>`:''}</header>`;
}
export function replaceHeader(html,header){return html.replace(/<header\b[^>]*>[\s\S]*?<\/header>/,header);}
