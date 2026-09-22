#extension GL_OES_standard_derivatives : enable
precision highp float;varying vec2 uv;
uniform sampler2D normalMap,background;uniform vec2 normalSize;uniform float angle,lightAngle,period,spread,strength,kind,inspect,flatFloor,localBoost,threshold,softness,whiteGain;
const float PI=3.141592653589793;
vec2 unpackPair(vec4 q){return vec2(dot(q.rg,vec2(65280.,255.)),dot(q.ba,vec2(65280.,255.)))/65535.;}
vec2 pairMap(vec2 p){vec2 z=clamp(p*normalSize-.5,vec2(0.),normalSize-1.),i=floor(z),f=fract(z);return mix(mix(unpackPair(texture2D(normalMap,(i+.5)/normalSize)),unpackPair(texture2D(normalMap,(i+vec2(1.5,.5))/normalSize)),f.x),mix(unpackPair(texture2D(normalMap,(i+vec2(.5,1.5))/normalSize)),unpackPair(texture2D(normalMap,(i+1.5)/normalSize)),f.x),f.y);}
float gauss(float x){return exp(-.5*x*x);}
vec3 cie(float w){float x=.362*gauss((w-442.)*(w<442.?.0624:.0374))+1.056*gauss((w-599.8)*(w<599.8?.0264:.0323))-.065*gauss((w-501.1)*(w<501.1?.049:.0382));float y=.821*gauss((w-568.8)*(w<568.8?.0213:.0247))+.286*gauss((w-530.9)*(w<530.9?.0613:.0322));float z=1.217*gauss((w-437.)*(w<437.?.0845:.0278))+.681*gauss((w-459.)*(w<459.?.0385:.0725));return vec3(x,y,z);}
vec3 rotate(vec3 v,float a){return vec3(v.x*cos(a)+v.z*sin(a),v.y,-v.x*sin(a)+v.z*cos(a));}
void main(){vec2 xy=kind<.5?vec2(0.):pairMap(uv)*2.-1.;vec3 n0=normalize(vec3(xy,sqrt(max(1.-dot(xy,xy),.001))));vec3 t0=normalize(vec3(1.,0.,0.)-n0*n0.x);vec3 b0=normalize(cross(n0,t0));float a=radians(angle);vec3 n=rotate(n0,a),t=rotate(t0,a),b=rotate(b0,a);
// Orthographic observer and central source share the same world direction.
// Both stay fixed while the film rotates: lambda = 2*d*sin(theta-angle).
float la=radians(lightAngle);vec3 v=vec3(sin(la),0.,cos(la));vec3 central=v;float peak=1000.*period*abs(dot(t,central+v));
if(inspect>1.5&&inspect<2.5){float enc=clamp(peak/1500.,0.,1.);float q=floor(enc*65535.+.5);gl_FragColor=vec4(floor(q/256.)/255.,mod(q,256.)/255.,0.,1.);return;}
// Fixed, angle-independent art-directed diffraction efficiency, not geometry.
float selection=smoothstep(max(0.,threshold-softness*.5),threshold+softness*.5,length(xy));
float efficiency=kind<.5?1.:mix(flatFloor,localBoost,selection);
if(inspect>3.5){gl_FragColor=vec4(vec3(selection),1.);return;}
if(inspect>2.5){gl_FragColor=vec4(n0*.5+.5,1.);return;}
vec3 xyz=vec3(0.);float white=0.;float fw=length(vec2(dFdx(peak),dFdy(peak)));
for(int j=0;j<5;j++){vec2 o=j==0?vec2(0.):j==1?vec2(1.,0.):j==2?vec2(-1.,0.):j==3?vec2(0.,1.):vec2(0.,-1.);float ax=la+radians(spread)*o.x;vec3 l=normalize(vec3(sin(ax),radians(spread)*o.y,cos(ax)));vec3 hv=l+v;float wavelength=1000.*period*abs(dot(t,hv));float crossq=dot(b,hv);float width=sqrt(18.*18.+fw*fw);vec3 c=vec3(0.);float norm=0.;for(int k=0;k<64;k++){float wl=380.+(float(k)+.5)*400./64.;vec3 cmf=cie(wl);float power=gauss((wl-wavelength)/width)*gauss(crossq/.09);c+=cmf*power;norm+=cmf.y;}xyz+=c/max(norm,.001)/5.;vec3 halfv=normalize(hv);float nh=max(dot(n,halfv),0.);float r=.07;float D=(r*r)/(PI*pow(nh*nh*(r*r-1.)+1.,2.));float fresnel=.04+.96*pow(1.-max(dot(v,halfv),0.),5.);white+=D*fresnel/5.;}
vec3 spectral=max(mat3(3.2406,-.9689,.0557,-1.5372,1.8758,-.2040,-.4986,.0415,1.0570)*xyz,vec3(0.));
float face=smoothstep(0.,.05,dot(n,v))*smoothstep(0.,.05,dot(n,central));vec3 reflected=(spectral*1.8*efficiency+vec3(.035*white*whiteGain))*face;
vec3 base=kind>1.5?pow(texture2D(background,uv).rgb,vec3(2.2)):vec3(.018,.025,.035);float gain=kind>1.5?strength:.8;
vec3 color=base*(1.-.08*gain*min(efficiency,1.))+reflected*gain;if(inspect>.5)color=reflected*gain;
gl_FragColor=vec4(pow(clamp(color,0.,1.),vec3(1./2.2)),1.);}
