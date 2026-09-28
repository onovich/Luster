const {createServer}=require('node:http');
const {readFile,stat}=require('node:fs/promises');
const {spawn}=require('node:child_process');
const path=require('node:path');

const root=path.resolve(__dirname,'../..');
const host='127.0.0.1',port=8798;
const browserArgument=process.argv.find(argument=>argument.startsWith('--browser='));
const selectedBrowser=browserArgument?.slice('--browser='.length);
if(selectedBrowser&&!['chromium','firefox','webkit'].includes(selectedBrowser))throw new Error(`Unsupported browser: ${selectedBrowser}`);
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.frag':'text/plain'};

const server=createServer(async(request,response)=>{
  try{
    const pathname=decodeURIComponent(new URL(request.url,`http://${host}:${port}`).pathname);
    if(!pathname.startsWith('/dist-online/')&&!pathname.startsWith('/.test-output/online-web-export/')){
      response.writeHead(404).end();return;
    }
    if(pathname.includes('\\')||pathname.split('/').includes('..')){
      response.writeHead(400).end();return;
    }
    let file=path.resolve(root,pathname.slice(1));
    if(!file.startsWith(root+path.sep)){
      response.writeHead(400).end();return;
    }
    if((await stat(file)).isDirectory())file=path.join(file,'index.html');
    const body=await readFile(file);
    response.writeHead(200,{'content-type':`${types[path.extname(file)]||'application/octet-stream'}; charset=utf-8`}).end(body);
  }catch{
    response.writeHead(404).end();
  }
});

function run(file){
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[path.join(__dirname,file)],{cwd:root,stdio:'inherit',env:{...process.env,...(selectedBrowser?{LUSTER_BROWSER:selectedBrowser}:{})}});
    child.once('error',reject);
    child.once('exit',(code,signal)=>code===0?resolve():reject(new Error(`${file} exited ${code??signal}`)));
  });
}

(async()=>{
  await new Promise((resolve,reject)=>server.once('error',reject).listen(port,host,resolve));
  try{
    if(process.argv.includes('--stress-only'))await run('stress.cjs');
    else{
      if(!process.argv.includes('--layout-only'))await run('browser.cjs');
      await run('layout.cjs');
    }
  }finally{
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
