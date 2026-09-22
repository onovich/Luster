const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const launchOptions={headless:true,args:['--enable-unsafe-swiftshader'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{channel:'chrome'})};
module.exports={chromium,launchOptions};
