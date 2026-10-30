// Pointillist sunset banner: dots generated from Diane's photos; dots near the cursor light up.
(()=>{
const IMAGES = {
  cover:{sunX:406, sunY:177, horizon:316, win:[91,430],
         glow:["255,234,160","255,196,80"], fade:0.34},
  exit: {sunX:373, sunY:216, horizon:278, win:[99,442],
         glow:["255,253,238","255,236,170"], fade:0.30}
};
// Each version = an artwork treatment + a glow per banner. V1 is the untouched original.
const VERSIONS = {
  "v2-gold":   {render:"v2", glow:{cover:"gold", exit:"gold"}, note:"Fine, defined dots · golden glow on both"},
  "v3-paired": {render:"v2", glow:{cover:"pink", exit:"gold"}, note:"Fine, defined dots · rose-pink cover, golden exit"}
};
const DEFAULTS = {v2:{spacing:3, pastel:0.22, scatter:0.45, radius:75, trail:0.955}};
const PARAMS = {v2:{...DEFAULTS.v2}};
// Rose glow sampled from the sun's reflection in Diane's photo, lifted so it reads as light
const PINK_GLOW = ["255,206,204","232,104,112"];
// Rose glow that actually glows: freshly lit dots start sun-white/yellow and cool to rose as they fade,
// with ~30% gold glimmers mixed in.
const HOT = ["255,248,218","255,214,120"];
const mixRGB=(a,b,f)=>a.split(',').map((v,i)=>Math.round(+v+(+b.split(',')[i]-v)*f)).join(',');
const ROSE_RAMP=[];for(let i=0;i<12;i++){const f=i/11,core=mixRGB(HOT[0],PINK_GLOW[0],f),edge=mixRGB(HOT[1],PINK_GLOW[1],f);
  ROSE_RAMP.push({spr:makeSprite([core,edge],.62+.08*f),core:`rgb(${core})`})}
const GLIM={spr:makeSprite(["255,242,186","255,198,84"],.65),core:"rgb(255,242,186)"};
let ver = "v3-paired";
let P = PARAMS[VERSIONS[ver].render];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const DPR = Math.min(2, window.devicePixelRatio||1);
const rnd = (a=0,b=1)=>a+Math.random()*(b-a);

/* ---------- colour helpers ---------- */
function rgb2hsl(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b);let h=0,s=0,l=(mx+mn)/2;
  if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h*=60}return[h,s,l]}
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
function hsl(h,s,l){return `hsl(${((h%360)+360)%360} ${(clamp(s,0,1)*100).toFixed(1)}% ${(clamp(l,0,1)*100).toFixed(1)}%)`}
function pageRGB(){const c=getComputedStyle(document.body).backgroundColor.match(/\d+/g).map(Number);return c}
const FLECK_SKY=[[275,.45,.80],[22,.85,.80],[350,.7,.84],[335,.6,.80]]; // no gold at rest: gold is reserved for light
const FLECK_WATER=[[270,.4,.80],[215,.45,.82],[300,.35,.84],[20,.8,.80]];

/* ---------- glow sprites ---------- */
function makeSprite([core,edge],edgeA=.55){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');
  const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,`rgba(${core},1)`);g.addColorStop(.28,`rgba(${core},.95)`);g.addColorStop(.45,`rgba(${edge},${edgeA})`);g.addColorStop(1,`rgba(${edge},0)`);
  x.fillStyle=g;x.fillRect(0,0,64,64);return c}
/* ---------- one banner ---------- */
class Banner{
  constructor(el,cfg){
    this.el=el;this.cfg=cfg;
    [this.photo,this.paint,this.glow]=el.querySelectorAll('canvas');
    this.gctx=this.glow.getContext('2d');
    this.active=new Set();this.last=null;this.raf=0;
    let n=0;const done=()=>{if(++n===2){this.prepare();this.build()}};
    this.img=new Image();this.img.onload=done;this.img.src=el.dataset.src;
    this.hi=new Image();this.hi.onload=done;this.hi.src=el.dataset.hi;
    el.addEventListener('pointermove',e=>this.move(e));
    el.addEventListener('pointerdown',e=>this.move(e));
    el.addEventListener('pointerleave',()=>this.last=null);
    new ResizeObserver(()=>{clearTimeout(this.rt);this.rt=setTimeout(()=>{if(this.el.clientWidth!==this.W||this.el.clientHeight!==this.H)this.build()},150)}).observe(el);
    if(!reduce){const io=new IntersectionObserver(es=>{if(es[0].isIntersecting&&this.ready){io.disconnect();setTimeout(()=>this.shimmer(),400)}else if(es[0].isIntersecting){this.pendingShimmer=true}},{threshold:.5});io.observe(el)}
  }
  prepare(){
    // 800px photo: framing + detail map
    const c=document.createElement('canvas');c.width=this.img.width;c.height=this.img.height;
    const x=c.getContext('2d',{willReadFrequently:true});x.filter='blur(1.2px)';x.drawImage(this.img,0,0);
    this.iw=c.width;this.ih=c.height;this.px=x.getImageData(0,0,c.width,c.height).data;
    // V2 sampler: 1600px photo, barely softened, so fine dots can pick up real detail
    const c2=document.createElement('canvas');c2.width=this.hi.width;c2.height=this.hi.height;
    const x2=c2.getContext('2d',{willReadFrequently:true});x2.filter='blur(0.5px)';x2.drawImage(this.hi,0,0);
    this.iw2=c2.width;this.ih2=c2.height;this.k2=this.iw2/this.iw;this.px2=x2.getImageData(0,0,c2.width,c2.height).data;
    // detail map: where the photo has edges (skyline, masts, boats, ripples) V2 places smaller, extra dots
    const L=new Float32Array(this.iw*this.ih);for(let i=0;i<L.length;i++){const j=i*4;L[i]=(this.px[j]*.3+this.px[j+1]*.59+this.px[j+2]*.11)/255}
    this.edge=new Float32Array(L.length);const w=this.iw;
    for(let y=1;y<this.ih-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;this.edge[i]=Math.min(1,(Math.abs(L[i+1]-L[i-1])+Math.abs(L[i+w]-L[i-w]))*5)}
  }
  sample(ix,iy){ix=clamp(ix|0,0,this.iw-1);iy=clamp(iy|0,0,this.ih-1);const i=(iy*this.iw+ix)*4;return[this.px[i],this.px[i+1],this.px[i+2]]}
  sample2(ix,iy){ix=clamp((ix*this.k2)|0,0,this.iw2-1);iy=clamp((iy*this.k2)|0,0,this.ih2-1);const i=(iy*this.iw2+ix)*4;return[this.px2[i],this.px2[i+1],this.px2[i+2]]}
  detail(ix,iy){ix=clamp(ix|0,0,this.iw-1);iy=clamp(iy|0,0,this.ih-1);return this.edge[iy*this.iw+ix]}
  build(){
    if(!this.px)return;
    this.render=VERSIONS[ver].render;this.glowMode=VERSIONS[ver].glow[this.el.id];
    const W=this.W=this.el.clientWidth,H=this.H=this.el.clientHeight,cfg=this.cfg;
    for(const c of [this.photo,this.paint,this.glow]){c.width=W*DPR;c.height=H*DPR}
    const wh=cfg.win[1]-cfg.win[0];
    const sc=Math.max(W/this.iw,H/wh);const vw=W/sc,vh=H/sc;
    const x0=clamp(cfg.sunX-vw/2,0,this.iw-vw),y0=clamp((cfg.win[0]+cfg.win[1])/2-vh/2,0,this.ih-vh);
    this.map={x0,y0,sc,vw,vh};
    this.hy=(cfg.horizon-y0)*sc;this.sx=(cfg.sunX-x0)*sc;this.sy=(cfg.sunY-y0)*sc;
    const pc=this.photo.getContext('2d');pc.setTransform(DPR,0,0,DPR,0,0);
    {const k=this.k2;pc.drawImage(this.hi,x0*k,y0*k,vw*k,vh*k,0,0,W,H)}
    const ctx=this.paint.getContext('2d');ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,W,H);
    const dots=this.buildV2(ctx);
    this.dots=dots;this.G=48;this.gw=Math.ceil(W/this.G)+1;this.grid=new Map();
    dots.forEach((d,i)=>{d.g=0;const k=((d.y/this.G)|0)*this.gw+((d.x/this.G)|0);let a=this.grid.get(k);if(!a)this.grid.set(k,a=[]);a.push(i)});
    this.active.clear();this.gctx.setTransform(DPR,0,0,DPR,0,0);this.gctx.clearRect(0,0,W,H);
    const gc=this.glowMode==='pink'?PINK_GLOW:cfg.glow;this.sprite=makeSprite(gc,this.glowMode==='pink'?.65:.55);this.coreCol=`rgb(${gc[0]})`;
    // V1 keeps its exact glow numbers; V2 has ~3x more (smaller) dots, so each one lights less often
    this.probK=0.55*Math.pow(P.spacing/5,2)*1.25; // many small dots, so each lights less often
    this.size=[1.3,1.5];
    const total=dots.length+(this.extra||0);
    {const ce=document.querySelector(`.count[data-for="${this.el.id}"]`);if(ce)ce.textContent=total.toLocaleString()+' dots';}
    this.ready=true;if(this.pendingShimmer){this.pendingShimmer=false;setTimeout(()=>this.shimmer(),400)}
  }
  wash(ctx,img,k,blur,alpha){ // underpainting, faded out at the top
    const {x0,y0,vw,vh}=this.map,W=this.W,H=this.H,bg=pageRGB();
    ctx.save();ctx.filter=`blur(${blur}px) saturate(0.85)`;ctx.drawImage(img,x0*k,y0*k,vw*k,vh*k,-12,-12,W+24,H+24);ctx.filter='none';
    ctx.fillStyle=`rgba(${bg[0]},${bg[1]},${bg[2]},${alpha})`;ctx.fillRect(0,0,W,H);
    const fz=this.cfg.fade*H;const g=ctx.createLinearGradient(0,0,0,fz*1.1);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,1)');
    ctx.globalCompositeOperation='destination-in';ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.restore();
  }
  /* ---------- V2: finer, denser, more faithful dots + a sparse painterly top layer ---------- */
  buildV2(ctx){
    const W=this.W,H=this.H,cfg=this.cfg,{x0,y0,sc}=this.map;const toImg=(x,y)=>[x0+x/sc,y0+y/sc];
    this.wash(ctx,this.hi,this.k2,3,0.55+P.pastel*0.55); // light, mostly page-coloured wash: gaps stay airy, not blurry
    const s=P.spacing*(W<600?0.9:1);const dots=[],top=[];
    const colour=(r,g,b,water,amt,fleckP)=>{
      let [h,sa,l]=rgb2hsl(r,g,b);const dark=l<0.3;
      const lo=0.06+P.pastel*0.6; l=lo+(0.94-lo)*l;   // keeps more of the photo's light and dark
      sa=Math.min(0.8,sa*1.4+0.05); if(dark){sa=Math.min(sa,0.24);l=Math.max(l,0.5)}
      if(h>165&&h<260){h+=(268-h)*0.5;sa=Math.min(sa,0.28);l=Math.max(l,0.48)} // gentler lavender shift than V1
      h+=rnd(-1,1)*9*amt; sa+=rnd(-.06,.06)*amt; l+=rnd(-.045,.045)*amt;
      if(Math.random()<fleckP){const f=(water?FLECK_WATER:FLECK_SKY)[Math.random()*4|0];const m=.5;h=f[0];sa=sa*(1-m)+f[1]*m;l=l*(1-m)+f[2]*m*(0.92+P.pastel*0.1)}
      return hsl(h,sa,l)};
    const fadeOK=(y,rr)=>{const t=y/H;if(t>=cfg.fade)return 1;const p=Math.pow(t/cfg.fade,1.5);return Math.random()>p?0:.55+.45*p};
    const add=(x,y,rx,ry,water)=>{
      const f=fadeOK(y);if(!f)return;rx*=f;ry*=f;
      const [ix,iy]=toImg(x,y);const [r,g,b]=this.sample2(ix,iy);const bright=rgb2hsl(r,g,b)[2];
      const dSun=Math.hypot(x-this.sx,y-this.sy)/W;
      let sens=water?0.30+0.70*Math.pow(bright,1.3):0.10+0.30*Math.random()+Math.max(0,0.25-dSun);
      if(water&&Math.abs(x-this.sx)<W*0.05)sens+=0.25;
      dots.push({x,y,rx,ry,c:colour(r,g,b,water,P.scatter,0.07*P.scatter),sens:Math.min(1,sens),water,ph:rnd(0,6.28)});
    };
    const addTop=(x,y,rx,ry,water)=>{const f=fadeOK(y);if(!f)return;const [ix,iy]=toImg(x,y);
      if(this.detail(ix,iy)>0.3)return; // keep detailed areas crisp
      const [r,g,b]=this.sample2(ix,iy);top.push({x,y,rx:rx*f,ry:ry*f,c:colour(r,g,b,water,Math.min(1,P.scatter*1.7),0.2*P.scatter)})};
    // sky + skyline: fine jittered grid; extra smaller dots wherever the photo has edges
    for(let y=s*0.5;y<this.hy;y+=s*0.88)for(let x=s*0.5;x<W;x+=s){
      const px=x+rnd(-.45,.45)*s,py=y+rnd(-.4,.4)*s;const [ix,iy]=toImg(px,py);const d=this.detail(ix,iy);
      const r=s*rnd(.36,.48)*(1-.25*d);add(px,py,r,r,false);
      if(d>.3&&Math.random()<d){const r2=r*.75;add(x+rnd(-.5,.5)*s,y+rnd(-.5,.5)*s,r2,r2,false)}}
    // water: fine horizontal dabs in rows, larger toward the viewer
    for(let y=this.hy;y<H+s;y+=s*0.58){const k=1+((y-this.hy)/(H-this.hy||1))*0.55;const off=rnd(0,s);
      for(let x=-off;x<W+s;x+=s*1.12*k){const px=x+rnd(-.3,.3)*s,py=y+rnd(-.16,.16)*s;const [ix,iy]=toImg(px,py);const d=this.detail(ix,iy);
        add(px,py,s*k*rnd(.45,.62)*(1-.2*d),s*k*rnd(.18,.25),true)}}
    // painterly top layer: sparse, slightly larger, more colour-broken dots over the calm areas
    const sB=s*2.3;
    for(let y=sB*0.5;y<H;y+=sB*0.9)for(let x=sB*0.5;x<W;x+=sB){if(Math.random()>.55)continue;
      const px=x+rnd(-.5,.5)*sB,py=y+rnd(-.5,.5)*sB,w=py>this.hy;
      w?addTop(px,py,sB*rnd(.32,.42),sB*rnd(.12,.16),true):addTop(px,py,sB*rnd(.2,.28),0,false)}
    const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}};
    shuffle(dots);shuffle(top);
    for(const d of dots){ctx.fillStyle=d.c;ctx.beginPath();ctx.ellipse(d.x,d.y,d.rx,d.ry,0,0,6.2832);ctx.fill()}
    ctx.globalAlpha=.8;for(const d of top){ctx.fillStyle=d.c;ctx.beginPath();ctx.ellipse(d.x,d.y,d.rx,d.ry||d.rx,0,0,6.2832);ctx.fill()}ctx.globalAlpha=1;
    this.extra=top.length;return dots;
  }
  stamp(x,y,strength=1){
    const R=P.radius*(this.W<600?0.8:1),G=this.G;
    const isW=y>this.hy-10, RX=isW?R*1.8:R;
    for(let gy=((y-R)/G|0);gy<=((y+R)/G|0);gy++)for(let gx=((x-RX)/G|0);gx<=((x+RX)/G|0);gx++){
      const a=this.grid.get(gy*this.gw+gx);if(!a)continue;
      for(const i of a){const d=this.dots[i];const dx=(d.x-x)/(d.water?1.8:1),dy=d.y-y;const dd=dx*dx+dy*dy;if(dd>R*R)continue;
        const f=1-Math.sqrt(dd)/R;
        if(Math.random()<f*d.sens*strength*this.probK){if(d.g<0.2)d.kind=Math.random()<0.3?1:0;d.g=Math.max(d.g,0.55+0.45*f);this.active.add(i)}}
    }
    if(!this.raf)this.raf=requestAnimationFrame(t=>this.frame(t));
  }
  move(e){
    if(!this.dots)return;this.el.classList.add('touched');
    const r=this.el.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
    if(this.last){const dx=x-this.last[0],dy=y-this.last[1],n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/(P.radius*0.35)));
      for(let k=1;k<=n;k++)this.stamp(this.last[0]+dx*k/n,this.last[1]+dy*k/n,0.7)}
    else this.stamp(x,y,0.7);
    this.last=[x,y];
  }
  shimmer(){
    const t0=performance.now(),dur=1600;const step=now=>{const p=(now-t0)/dur;if(p>1)return;
      const y=this.hy+p*(this.H-this.hy);this.stamp(this.sx+Math.sin(p*9)*14,y,0.35);requestAnimationFrame(step)};requestAnimationFrame(step);
  }
  frame(t){
    const c=this.gctx,decay=reduce?0.8:P.trail;c.clearRect(0,0,this.W,this.H);
    const [s0,s1]=this.size,rose=this.glowMode==='pink';
    for(const i of this.active){const d=this.dots[i];d.g*=decay;if(d.g<0.02){d.g=0;this.active.delete(i);continue}
      let a=d.g;if(d.water&&!reduce)a*=0.6+0.4*Math.sin(t*0.011+d.ph);
      let sz=(d.rx+d.ry)*(s0+s1*d.g),spr=this.sprite,core=this.coreCol;
      if(rose){if(d.kind){spr=GLIM.spr;core=GLIM.core;sz*=1.3;if(!reduce)a*=0.75+0.25*Math.sin(t*0.017+d.ph*3)}
        else{const e=ROSE_RAMP[clamp(((0.95-d.g)/0.55*11)|0,0,11)];spr=e.spr;core=e.core;sz*=1+0.35*Math.max(0,d.g-0.7)}}
      c.globalAlpha=Math.min(1,a*0.9);c.drawImage(spr,d.x-sz,d.y-sz,sz*2,sz*2);
      c.globalAlpha=Math.min(1,a);c.fillStyle=core;c.beginPath();c.ellipse(d.x,d.y,d.rx*0.95,d.ry*0.95,0,0,6.2832);c.fill();
      if(rose&&d.kind&&d.g>0.6){const L=sz*1.15;c.globalAlpha=Math.min(1,(d.g-0.6)*2.2);c.strokeStyle=core;c.lineWidth=0.9; // tiny four-point glint
        c.beginPath();c.moveTo(d.x-L,d.y);c.lineTo(d.x+L,d.y);c.moveTo(d.x,d.y-L*.7);c.lineTo(d.x,d.y+L*.7);c.stroke()}}
    c.globalAlpha=1;
    this.raf=this.active.size?requestAnimationFrame(tt2=>this.frame(tt2)):0;
  }
}

const banners=[...document.querySelectorAll('.banner[data-src]')].map(el=>new Banner(el,IMAGES[el.id]));
const rebuild=()=>{clearTimeout(rebuild.t);rebuild.t=setTimeout(()=>banners.forEach(b=>b.build()),120)};
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',rebuild);
new MutationObserver(rebuild).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
})();
