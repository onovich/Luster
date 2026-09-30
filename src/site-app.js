import {getLocale,setLocale,translateDocument,t} from './site-i18n.js';
const root=new URL('../',import.meta.url),area=document.getElementById('pageFrames');
const paths=document.body.dataset.siteMode==='gallery'?{home:''}:{home:'',product:'product/',pricing:'pricing/',editor:'trial/'};
const frames=new Map();let current=null,token=0;
for(const link of document.querySelectorAll('.siteHeader a'))link.href=new URL(link.getAttribute('href'),location.href).href;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function route(url){return Object.keys(paths).find(key=>url.pathname===new URL(paths[key],root).pathname);}
function language(){
 const locale=getLocale();translateDocument(document,locale);
 const key=route(new URL(location.href));if(key)document.title=`${t({home:'Home',product:'Product',pricing:'Pricing',editor:'Editor'}[key])} · Luster`;
 document.getElementById('siteLanguage').value=locale;
 for(const [key,frame] of frames){frame.title=t({home:'Material gallery',product:'Product',pricing:'Pricing',editor:'Editor'}[key]);frame.contentWindow?.postMessage({type:'luster:locale',locale},location.origin);}
}
async function navigate(url,{history=true}={}){
 const key=route(url);if(!key)return location.assign(url.href);
 const mine=++token,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 area.classList.add('isLeaving');area.setAttribute('aria-busy','true');
 let frame=frames.get(key);
 if(!frame){
  frame=document.createElement('iframe');frame.dataset.page=key;frame.title=t({home:'Material gallery',product:'Product',pricing:'Pricing',editor:'Editor'}[key]);
  frame.style.visibility='hidden';frame.name=`luster-${key}`;frame.src=new URL(`content/${key}.html${url.search}${url.hash}`,root).href;
  frame.ready=new Promise(resolve=>frame.addEventListener('load',()=>{language();resolve();},{once:true}));
  frames.set(key,frame);area.append(frame);
 }
 await Promise.all([frame.ready,sleep(reduced?0:160)]);if(mine!==token)return;
 if(current&&current!==frame){current.contentWindow.postMessage({type:'luster:pause'},location.origin);current.hidden=true;}
 frame.hidden=false;frame.style.visibility='';current=frame;
 if(history)window.history.pushState({page:key},'',url.href);
 const labels={home:'Home',product:'Product',pricing:'Pricing',editor:'Editor'};
 document.title=`${t(labels[key])} · Luster`;
 for(const link of document.querySelectorAll('.siteNav a')){
  if(route(new URL(link.href))===key)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
 }
 frame.contentWindow.postMessage({type:'luster:activate',search:url.search,hash:url.hash},location.origin);
 area.classList.remove('isLeaving');area.setAttribute('aria-busy','false');
 document.getElementById('pageAnnouncement').textContent=t(labels[key]);
}
document.addEventListener('click',event=>{
 const link=event.target.closest('a');if(!link||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 const url=new URL(link.href);if(url.origin!==location.origin||!route(url))return;
 event.preventDefault();if(url.href!==location.href)navigate(url);
});
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||![...frames.values()].some(frame=>frame.contentWindow===event.source))return;
 if(event.data?.type==='luster:navigate'){const url=new URL(event.data.url);if(url.origin===location.origin)navigate(url);}
});
window.addEventListener('popstate',()=>navigate(new URL(location.href),{history:false}));
document.getElementById('siteLanguage').addEventListener('change',event=>{setLocale(event.target.value);language();});
language();navigate(new URL(location.href),{history:false});
