Shader "Luster/LayeredUI"
{
 Properties
 {
  _ArtTex ("Artwork", 2D) = "white" {}
  _NormalTex ("Film XY16", 2D) = "gray" {}
  _NormalSize ("Film map size", Vector) = (256,256,0,0)
  _SurfaceTex ("Substrate RGBA", 2D) = "gray" {}
  _Angle ("View angle", Float) = 5
  _LightAngle ("Light angle", Float) = 24.39
  _Strength ("Film strength", Range(0,0.8)) = 0.3
  _Richness ("Color richness", Range(0,35)) = 22
  _SurfaceAmount ("Substrate", Range(0,1)) = 1
  _FilmAmount ("Film", Range(0,1)) = 1
  _StencilComp ("Stencil Comparison", Float) = 8
  _Stencil ("Stencil ID", Float) = 0
  _StencilOp ("Stencil Operation", Float) = 0
  _StencilWriteMask ("Stencil Write Mask", Float) = 255
  _StencilReadMask ("Stencil Read Mask", Float) = 255
  _ColorMask ("Color Mask", Float) = 15
  [Toggle(UNITY_UI_ALPHACLIP)] _UseUIAlphaClip ("Use Alpha Clip", Float) = 0
 }
 SubShader
 {
  Tags { "Queue"="Transparent" "RenderType"="Transparent" "IgnoreProjector"="True" "CanUseSpriteAtlas"="True" }
  Stencil { Ref [_Stencil] Comp [_StencilComp] Pass [_StencilOp] ReadMask [_StencilReadMask] WriteMask [_StencilWriteMask] }
  ColorMask [_ColorMask]
  Cull Off ZWrite Off ZTest [unity_GUIZTestMode] Blend SrcAlpha OneMinusSrcAlpha
  Pass
  {
   CGPROGRAM
   #pragma vertex vert
   #pragma fragment frag
   #pragma target 3.0
   #pragma multi_compile_local _ UNITY_UI_CLIP_RECT
   #pragma multi_compile_local _ UNITY_UI_ALPHACLIP
   #include "UnityCG.cginc"
   #include "UnityUI.cginc"
   sampler2D _ArtTex, _NormalTex, _SurfaceTex;
   float2 _NormalSize;
   float _Angle,_LightAngle,_Strength,_Richness,_SurfaceAmount,_FilmAmount;
   float4 _ClipRect;
   static const float PI=3.141592653589793;
   struct app { float4 vertex:POSITION; float2 uv:TEXCOORD0; };
   struct interpolated { float4 vertex:SV_POSITION; float2 uv:TEXCOORD0; float4 worldPosition:TEXCOORD1; };
   interpolated vert(app v){interpolated o;o.worldPosition=v.vertex;o.vertex=UnityObjectToClipPos(v.vertex);o.uv=v.uv;return o;}
   float2 unpackPair(float4 q){return float2(dot(q.rg,float2(65280.,255.)),dot(q.ba,float2(65280.,255.)))/65535.;}
   float2 pairMap(float2 p){
    float2 z=clamp(p*_NormalSize-.5,0.,_NormalSize-1.),i=floor(z),f=frac(z);
    float2 a=unpackPair(tex2D(_NormalTex,(i+.5)/_NormalSize));
    float2 b=unpackPair(tex2D(_NormalTex,(i+float2(1.5,.5))/_NormalSize));
    float2 c=unpackPair(tex2D(_NormalTex,(i+float2(.5,1.5))/_NormalSize));
    float2 d=unpackPair(tex2D(_NormalTex,(i+1.5)/_NormalSize));
    return lerp(lerp(a,b,f.x),lerp(c,d,f.x),f.y);
   }
   float gauss(float x){return exp(-.5*x*x);}
   float3 cie(float w){
    float x=.362*gauss((w-442.)*(w<442.?.0624:.0374))+1.056*gauss((w-599.8)*(w<599.8?.0264:.0323))-.065*gauss((w-501.1)*(w<501.1?.049:.0382));
    float y=.821*gauss((w-568.8)*(w<568.8?.0213:.0247))+.286*gauss((w-530.9)*(w<530.9?.0613:.0322));
    float z=1.217*gauss((w-437.)*(w<437.?.0845:.0278))+.681*gauss((w-459.)*(w<459.?.0385:.0725));
    return float3(x,y,z);
   }
   float3 rotateNormal(float3 v,float a){return float3(v.x*cos(a)+v.z*sin(a),v.y,-v.x*sin(a)+v.z*cos(a));}
   float3 substrateResponse(float3 cn,float4 m,float pose,float lighting){
    cn=rotateNormal(cn,radians(pose));
    float3 cv=float3(0.,0.,1.),cl=normalize(float3(sin(radians(lighting)),.12,cos(radians(lighting))));
    float3 h=normalize(cv+cl);float nh=max(dot(cn,h),0.);
    float rough=.25,specular=.5,pearl=.58;
    float lobe=pow(nh,lerp(160.,12.,rough));
    float phase=m.b+(1.-dot(cn,cv))*3.+radians(pose)*1.6-radians(lighting-24.39)*1.1;
    float3 rainbow=.5+.5*cos(6.2831853*(phase+float3(0.,.333,.667)));
    float3 sheen=lerp(float3(.8,.85,.95),rainbow,pearl)*lobe*specular;
    float3 colored=rainbow*pearl*(.12+.4*lobe);
    return colored+sheen;
   }
   float3 substrateLight(float3 art,float2 uv){
    if(_SurfaceAmount<=0.)return art;
    float4 m=tex2D(_SurfaceTex,uv);float2 xy=m.rg*2.-1.;
    float3 cn=normalize(float3(xy,sqrt(max(.01,1.-dot(xy,xy)))));
    float3 change=substrateResponse(cn,m,_Angle,_LightAngle)-substrateResponse(cn,m,0.,24.39);
    return max(float3(0.,0.,0.),art+change*_SurfaceAmount*.65);
   }
   fixed4 frag(interpolated i):SV_Target{
    float2 uv=i.uv;
    float2 xy=pairMap(uv)*2.-1.;
    float3 n0=normalize(float3(xy,sqrt(max(1.-dot(xy,xy),.001))));
    float3 ambientGradient=float3(1.,0.,_Richness);
    float3 surfaceGradient=ambientGradient-n0*dot(n0,ambientGradient);
    float localPeriod=.7/max(length(surfaceGradient),.15);
    float3 t0=normalize(surfaceGradient),b0=normalize(cross(n0,t0));
    float3 n=rotateNormal(n0,radians(_Angle)),t=rotateNormal(t0,radians(_Angle)),b=rotateNormal(b0,radians(_Angle));
    float la=radians(_LightAngle);float3 v=float3(sin(la),0.,cos(la)),central=v;
    float peak=1000.*localPeriod*abs(dot(t,central+v));
    float selection=smoothstep(max(0.,.027-.06*.5),.027+.06*.5,length(xy));
    float efficiency=lerp(.04,4.,selection);
    float3 xyz=0.;float white=0.;float fw=length(float2(ddx(peak),ddy(peak)));
    [unroll] for(int j=0;j<5;j++){
     float2 o=j==0?float2(0.,0.):j==1?float2(1.,0.):j==2?float2(-1.,0.):j==3?float2(0.,1.):float2(0.,-1.);
     float ax=la+radians(.4)*o.x;
     float3 l=normalize(float3(sin(ax),radians(.4)*o.y,cos(ax))),hv=l+v;
     float wavelength=1000.*localPeriod*abs(dot(t,hv)),crossq=dot(b,hv);
     float width=sqrt(18.*18.+min(fw,60.)*min(fw,60.));
     float3 c=0.;float norm=0.;
     [loop] for(int k=0;k<64;k++){
      float wl=380.+(k+.5)*400./64.;float3 cmf=cie(wl);
      float power=gauss((wl-wavelength)/width)*gauss(crossq/.45);
      c+=cmf*power;norm+=cmf.y;
     }
     xyz+=c/max(norm,.001)/5.;
     float3 halfv=normalize(hv);float nh=max(dot(n,halfv),0.);float r=.07;
     float D=(r*r)/(PI*pow(nh*nh*(r*r-1.)+1.,2.));
     float fresnel=.04+.96*pow(1.-max(dot(v,halfv),0.),5.);
     white+=D*fresnel/5.;
    }
    float3 spectral=max(float3(3.2406*xyz.x-1.5372*xyz.y-.4986*xyz.z,-.9689*xyz.x+1.8758*xyz.y+.0415*xyz.z,.0557*xyz.x-.2040*xyz.y+1.0570*xyz.z),0.);
    float face=smoothstep(0.,.05,dot(n,v))*smoothstep(0.,.05,dot(n,central));
    float3 reflected=(spectral*1.8*efficiency+float3(.035*white*4.,.035*white*4.,.035*white*4.))*face;
    float3 base=pow(tex2D(_ArtTex,uv).rgb,2.2);
    base=substrateLight(base,uv);
    float gain=_Strength*_FilmAmount;
    float3 color=base*(1.-.08*gain*min(efficiency,1.))+reflected*gain;
    float4 outputColor=float4(pow(saturate(color),1./2.2),1.);
    #ifdef UNITY_UI_CLIP_RECT
    outputColor.a*=UnityGet2DClipping(i.worldPosition.xy,_ClipRect);
    #endif
    #ifdef UNITY_UI_ALPHACLIP
    clip(outputColor.a-.001);
    #endif
    return outputColor;
   }
   ENDCG
  }
 }
}
