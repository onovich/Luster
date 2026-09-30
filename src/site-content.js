import {getLocale,translateDocument} from './site-i18n.js';
let locale=getLocale(),queued=false;
const root=new URL('../',import.meta.url),routes=['','product/','pricing/','trial/'].map(path=>new URL(path,root).pathname);
const observer=new MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(apply);}});
function apply(){queued=false;observer.disconnect();translateDocument(document,locale);observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','title','alt']});}
apply();
document.addEventListener('click',event=>{
 if(parent===window)return;
 const link=event.target.closest('a');if(!link||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.download||link.target==='_blank')return;
 const url=new URL(link.href);if(url.origin!==location.origin)return;
 if(url.hash&&url.pathname===new URL(document.baseURI).pathname){event.preventDefault();document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView();return;}
 if(routes.includes(url.pathname)){event.preventDefault();parent.postMessage({type:'luster:navigate',url:url.href},location.origin);}
});
window.addEventListener('message',async event=>{
 if(event.source!==parent||event.origin!==location.origin)return;
 if(event.data?.type==='luster:locale'){locale=event.data.locale;apply();}
 if(event.data?.type==='luster:pause'){document.getElementById('play')?.getAttribute('aria-pressed')==='true'&&document.getElementById('play').click();const rotate=document.getElementById('rotate');if(rotate?.checked){rotate.checked=false;rotate.dispatchEvent(new Event('change'));}}
 if(event.data?.type==='luster:activate'){
  const sample=new URLSearchParams(event.data.search).get('sample');
  if(sample&&window.lusterController){await window.lusterRestoration;if(window.lusterController.file?.name!==`luster-example-${sample}.png`)document.querySelector(`[data-sample="${sample==='card'?'card':'poster'}"]`)?.click();}
  if(event.data.hash){try{document.querySelector(event.data.hash)?.scrollIntoView();}catch{}}
 }
});
