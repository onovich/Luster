/** Retry transient transport errors without caching an error response. */
export async function fetchResource(url,{attempts=3,timeout=15000}={}) {
  for(let attempt=0;attempt<attempts;attempt++) {
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeout);
    try {
      const response=await fetch(url,{signal:controller.signal,...(attempt?{cache:'reload'}:{})});
      if(response.ok)return response;
      const error=new Error(`Resource ${response.status}: ${new URL(url).pathname.split('/').pop()}`);
      error.retryable=response.status>=500||response.status===408||response.status===429;
      throw error;
    } catch(error) {
      if(error.retryable===false||attempt===attempts-1)throw error;
    } finally {clearTimeout(timer);}
    await new Promise(resolve=>setTimeout(resolve,250*2**attempt));
  }
}
