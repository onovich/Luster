export const controlSpecs=[
 ['angle','Angle',-4,4,.01,'°'],['light','Light',3,35,.01,'°'],['period','间距',[.7,.8,1,1.5,2,2.5,3],'μm'],['spread','光源半角',[0,.4,1.2],'°'],
 ['strength','Intensity',.05,.8,.01,''],['flatFloor','平整区',0,1,.01,''],['localBoost','局部彩光',0,4,.05,''],['threshold','集中',.001,.06,.001,''],['softness','柔和',.002,.06,.001,''],['whiteGain','白光',0,4,.05,''],['richness','褶皱关联',0,35,.5,''],['bend','响应宽度',.09,.8,.01,'']
];
export function buildControls(container,onChange) {
 for(const [id,title,min,max,step,unit] of controlSpecs) {
  const label=document.createElement('label');label.htmlFor=id;label.textContent=title;
  const output=document.createElement('output');output.id=id+'Value';output.htmlFor=id;label.append(output);
  const input=document.createElement(Array.isArray(min)?'select':'input');input.id=id;
  if(Array.isArray(min)) for(const value of min) input.add(new Option(value+max,value));
  else {input.type='range';input.min=min;input.max=max;input.step=step;}
  input.addEventListener('input',()=>onChange(id,+input.value));label.append(input);container.append(label);
 }
}
export function syncControls(parameters,angle,variant) {
 for(const [id,,min,max,,,] of controlSpecs) {
  const input=document.getElementById(id),value=id==='angle'?angle:parameters[id];
  input.value=value??(id==='bend'?.09:0);
  const unit=Array.isArray(min)?max:controlSpecs.find(s=>s[0]===id)[5];
  document.getElementById(id+'Value').value=(id==='angle'?angle.toFixed(2):input.value)+(unit||'');
  if(input.type==='range')input.style.setProperty('--fill',`${(value-input.min)/(input.max-input.min)*100}%`);
  input.disabled=variant==='B11'&&['richness','bend'].includes(id);
 }
 for(const [id,target] of [['left',-4],['center',0],['right',4]])document.getElementById(id).setAttribute('aria-pressed',String(Math.abs(angle-target)<.001));
 document.getElementById('enabled').checked=parameters.enabled;
 for(const id of ['uniformStructure','restoreStructure']) document.getElementById(id).disabled=variant==='B11';
 document.querySelector('#inspect option[value="5"]').disabled=variant==='B11';
}
