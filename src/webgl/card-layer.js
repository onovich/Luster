// One extra sampled surface map and an analytic lighting lobe; no second spectral loop.
const cardShader=`
uniform sampler2D cardMap;
uniform float cardType,cardAmount,filmAmount,cardLift,cardTurn,cardViewport;
vec2 cardUV;
float cardCoverage;
// Rigid card orientation; inverse ray/plane projection below gives a projective quad.
mat3 cardRotation(){
 float lift=clamp(cardLift/.241228,0.,1.),x=radians(22.)*lift,y=radians(-10.)*lift;
 float a=cos(x),b=sin(x),c=cos(y),d=sin(y),e=cos(cardTurn),f=sin(cardTurn);
 return mat3(e,f,0.,-f,e,0.,0.,0.,1.)*mat3(c,0.,-d,0.,1.,0.,d,0.,c)*mat3(1.,0.,0.,0.,a,b,0.,-b,a);
}
vec3 cardResponse(vec3 cn,vec4 m,float pose,float lighting){
 cn=rotate(cn,radians(pose));
 vec3 cv=vec3(0.,0.,1.),cl=normalize(vec3(sin(radians(lighting)),.12,cos(radians(lighting))));
 vec3 h=normalize(cv+cl);float nh=max(dot(cn,h),0.);
 float rough=.28,specular=.55,pearl=.42;
 if(cardType<1.5){rough=m.a>.5?.22:.48;specular=.45;pearl=m.a>.5?.65:.25;}
 else if(cardType<2.5){rough=.36;specular=.28;pearl=.32;}
 else if(cardType<3.5){rough=.4;specular=.4;pearl=.55;}
 else if(cardType<4.5){rough=.17;specular=.55;pearl=.65;}
 else if(cardType<5.5){rough=mix(.4,.19,m.a);specular=.35;pearl=m.a*.65;}
 else if(cardType<6.5){rough=.25;specular=.5;pearl=.58;}
 else if(cardType<7.5){rough=.26;specular=.35;pearl=.42;}
 else{rough=.16;specular=.4;pearl=.38;}
 float exponent=mix(160.,12.,rough),lobe=pow(nh,exponent);
 if(cardType>1.5&&cardType<2.5){vec3 tangent=normalize(vec3(cn.z,0.,-cn.x));lobe=exp(-pow(dot(h,tangent)/.16,2.))*pow(nh,8.);}
 float phase=m.b+(1.-dot(cn,cv))*3.+radians(pose)*1.6-radians(lighting-24.39)*1.1;
 vec3 rainbow=.5+.5*cos(6.2831853*(phase+vec3(0.,.333,.667)));
 vec3 sheen=mix(vec3(.8,.85,.95),rainbow,pearl)*lobe*specular;
 vec3 colored=rainbow*pearl*(.12+.4*lobe);
 if(cardType>6.5&&cardType<7.5){float twinkle=pow(nh,240.)*smoothstep(.48,.9,m.a);sheen+=vec3(1.,.92,.75)*twinkle*.8;}
 if(cardType>7.5){sheen+=vec3(.8,.9,1.)*pow(nh,200.)*.3;}
 return colored+sheen;
}
vec3 cardLight(vec3 art){
 if(cardAmount<=0.)return art;
 vec4 m=texture2D(cardMap,cardUV);vec2 xy=m.rg*2.-1.;
 vec3 cn=normalize(vec3(xy,sqrt(max(.01,1.-dot(xy,xy)))));
 // Reference-image relighting: preserve authored art at zero pose, move its response
 // continuously with actual normals. This is not calibrated inverse rendering.
 vec3 change=cardResponse(cardRotation()*cn,m,angle,lightAngle)-cardResponse(cn,m,0.,24.39);
 float dark=cardType>1.5&&cardType<2.5||cardType>4.5&&cardType<5.5||cardType>7.5?1.:0.;
 float detail=mix(1.,.3+.7*smoothstep(.01,.35,dot(art,vec3(.2126,.7152,.0722))),dark);
 return max(vec3(0.),art+change*cardAmount*detail*.65);
}

`;
export function withCardLayer(source){
 // The original film shader remains authoritative; augment only the substrate/composition.
 let s=source.replace(/\buv\b/g,'foilUV').replace('varying vec2 foilUV;','varying vec2 uv;vec2 foilUV;');
 const main=s.indexOf('void main()');s=s.slice(0,main)+cardShader+s.slice(main);
 s=s.replace('void main(){',`void main(){
 foilUV=vec2(uv.x,uv.y*cardViewport);
 const float aspect=246./176.;
 float progress=clamp(cardLift/.241228,0.,1.);
 mat3 orientation=cardRotation();
 vec3 camera=vec3(0.,0.,4.),center=vec3(.02*progress,cardLift*aspect,.04*progress);
 vec3 ray=vec3((foilUV-.5)*vec2(1.,aspect),-4.);
 vec3 normal=orientation[2];
 vec3 hit=camera+ray*(dot(normal,center-camera)/dot(normal,ray))-center;
 // dot with the basis vectors is the inverse of this orthonormal rotation.
 vec2 local=vec2(dot(hit,orientation[0]),dot(hit,orientation[1]))/(1.-.1*progress);
 cardUV=local/vec2(1.,aspect)+.5;
 vec2 edge=min(cardUV,1.-cardUV);cardCoverage=step(0.,min(edge.x,edge.y));
 float sleeve=step(foilUV.y,1.);
 if(inspect<.5&&sleeve<.5&&cardCoverage<.5)discard;
 `);
 s=s.replace('pow(texture2D(background,foilUV).rgb,vec3(2.2))','pow(texture2D(background,cardUV).rgb,vec3(2.2))');
 s=s.replace('for(int j=0;', 'if(sleeve>.5&&filmAmount>0.||inspect>.5)for(int j=0;');
 s=s.replace('vec3 color=base*',`if(inspect<.5&&kind>1.5){base=mix(vec3(.70,.72,.76),cardLight(base),cardCoverage);gain*=filmAmount*sleeve;}
 vec3 color=base*`);
 return s;
}
