const playwright=require(process.env.PLAYWRIGHT_PATH||'playwright');
const {chromium}=playwright;
const browserName=process.env.LUSTER_BROWSER||'chromium';
if(!['chromium','firefox','webkit'].includes(browserName))throw new Error(`Unsupported browser: ${browserName}`);
const browserType=playwright[browserName];
const launchOptions=browserName==='chromium'
  ?{headless:true,args:['--enable-unsafe-swiftshader'],...(process.env.LUSTER_USE_BUNDLED_CHROMIUM==='1'?{}:process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{channel:'chrome'})}
  :{headless:!(browserName==='firefox'&&process.env.LUSTER_FIREFOX_HEADED==='1'),
    ...(browserName==='firefox'&&process.env.LUSTER_FIREFOX_ANGLE==='1'?{firefoxUserPrefs:{'webgl.disable-angle':false}}:{})};
module.exports={chromium,browserType,browserName,launchOptions};
