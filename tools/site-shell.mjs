export function siteHeader(current,{home,product,pricing,editor}){
  const links=[['home','Home',home],['product','Product',product],['pricing','Pricing',pricing],['editor','Editor',editor]].filter(([, ,href])=>href);
  return `<header class="siteHeader"><a class="siteBrand" href="${home}" aria-label="Luster home">Luster</a><nav class="siteNav" aria-label="Main navigation">${links.map(([key,label,href])=>`<a href="${href}"${key===current?' aria-current="page"':''}>${label}</a>`).join('')}</nav><label class="siteLanguage"><span class="srOnly">Language</span><select id="siteLanguage" aria-label="Language"><option value="en">EN</option><option value="zh-CN">中文</option></select></label></header>`;
}
export function replaceHeader(html,header){return html.replace(/<header\b[^>]*>[\s\S]*?<\/header>/,header);}
