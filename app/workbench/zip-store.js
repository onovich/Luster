// Deliberately narrow ZIP STORE reader/writer for .luster v1. No compression,
// data descriptors, external attributes, archive comments, or ZIP64.
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const table=new Uint32Array(256);
for(let n=0;n<256;n++){let c=n;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0);table[n]=c>>>0;}
function crc32(bytes){let c=0xffffffff;for(const byte of bytes)c=(c>>>8)^table[(c^byte)&255];return (c^0xffffffff)>>>0;}
function u16(view,offset,value){view.setUint16(offset,value,true);}
function u32(view,offset,value){view.setUint32(offset,value>>>0,true);}
function read16(view,offset){return view.getUint16(offset,true);}
function read32(view,offset){return view.getUint32(offset,true);}
function namesafe(name){
  if(typeof name!=='string'||!/^(?:[a-zA-Z0-9-]+\/)*[a-zA-Z0-9-]+\.[a-zA-Z0-9]+$/.test(name)||name.includes('..'))throw new Error('Unsafe archive path');
  return name;
}
function bytes(value){if(!(value instanceof Uint8Array))throw new TypeError('Archive entries must be Uint8Array');return value;}
export function writeStoredZip(entries){
  if(!(entries instanceof Map)||entries.size<1||entries.size>32)throw new Error('Invalid archive entry count');
  const items=[...entries].map(([name,data])=>({name:namesafe(name),nameBytes:encoder.encode(name),data:bytes(data)}));
  if(new Set(items.map(item=>item.name)).size!==items.length)throw new Error('Duplicate archive entry');
  let length=22,offset=0;
  for(const item of items){
    if(item.data.length>24*1024*1024)throw new Error('Archive entry too large');
    item.offset=offset;item.crc=crc32(item.data);
    offset+=30+item.nameBytes.length+item.data.length;
    length+=30+item.nameBytes.length+item.data.length+46+item.nameBytes.length;
  }
  if(length>40*1024*1024)throw new Error('Archive too large');
  const out=new Uint8Array(length),view=new DataView(out.buffer);
  let position=0;
  for(const item of items){
    u32(view,position,0x04034b50);u16(view,position+4,20);u16(view,position+6,0x800);u16(view,position+8,0);
    u32(view,position+14,item.crc);u32(view,position+18,item.data.length);u32(view,position+22,item.data.length);u16(view,position+26,item.nameBytes.length);
    position+=30;out.set(item.nameBytes,position);position+=item.nameBytes.length;out.set(item.data,position);position+=item.data.length;
  }
  const centralStart=position;
  for(const item of items){
    u32(view,position,0x02014b50);u16(view,position+4,20);u16(view,position+6,20);u16(view,position+8,0x800);u16(view,position+10,0);
    u32(view,position+16,item.crc);u32(view,position+20,item.data.length);u32(view,position+24,item.data.length);u16(view,position+28,item.nameBytes.length);
    u32(view,position+42,item.offset);position+=46;out.set(item.nameBytes,position);position+=item.nameBytes.length;
  }
  const centralLength=position-centralStart;
  u32(view,position,0x06054b50);u16(view,position+8,items.length);u16(view,position+10,items.length);
  u32(view,position+12,centralLength);u32(view,position+16,centralStart);
  return out;
}
export function readStoredZip(input){
  const data=bytes(input);
  if(data.length<22||data.length>40*1024*1024)throw new Error('Invalid archive size');
  const view=new DataView(data.buffer,data.byteOffset,data.byteLength),end=data.length-22;
  if(read32(view,end)!==0x06054b50||read16(view,end+20)!==0||read16(view,end+4)!==0||read16(view,end+6)!==0)throw new Error('Invalid ZIP end record');
  const count=read16(view,end+10),size=read32(view,end+12),start=read32(view,end+16);
  if(count<1||count>32||count!==read16(view,end+8)||start+size!==end)throw new Error('Invalid ZIP directory');
  const files=new Map();let cursor=start,total=0;
  for(let i=0;i<count;i++){
    if(cursor+46>end||read32(view,cursor)!==0x02014b50)throw new Error('Invalid ZIP directory entry');
    const flags=read16(view,cursor+8),method=read16(view,cursor+10),crc=read32(view,cursor+16),packed=read32(view,cursor+20),plain=read32(view,cursor+24);
    const nameLength=read16(view,cursor+28),extra=read16(view,cursor+30),comment=read16(view,cursor+32),local=read32(view,cursor+42);
    if(flags!==0x800||method!==0||packed!==plain||plain>24*1024*1024||extra!==0||comment!==0||cursor+46+nameLength>end)throw new Error('Unsupported ZIP entry');
    const name=namesafe(decoder.decode(data.subarray(cursor+46,cursor+46+nameLength)));
    if(files.has(name))throw new Error('Duplicate ZIP entry');
    if(local+30+nameLength>start||read32(view,local)!==0x04034b50||read16(view,local+6)!==flags||read16(view,local+8)!==method||read16(view,local+26)!==nameLength||read16(view,local+28)!==0||read32(view,local+14)!==crc||read32(view,local+18)!==packed||read32(view,local+22)!==plain)throw new Error('Invalid ZIP local entry');
    if(decoder.decode(data.subarray(local+30,local+30+nameLength))!==name)throw new Error('ZIP names disagree');
    const contentStart=local+30+nameLength,contentEnd=contentStart+plain;
    if(contentEnd>start)throw new Error('ZIP entry outside data');
    const content=data.slice(contentStart,contentEnd);
    if(crc32(content)!==crc)throw new Error('ZIP CRC mismatch');
    files.set(name,content);total+=plain;
    if(total>40*1024*1024)throw new Error('Archive content too large');
    cursor+=46+nameLength;
  }
  if(cursor!==end)throw new Error('ZIP directory trailing bytes');
  return files;
}
