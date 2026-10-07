// Deterministic 1080p motion graphics. No screenshots of signed transactions.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const require = createRequire(import.meta.url);
let canvasModule;
try { canvasModule = require('@napi-rs/canvas'); }
catch { canvasModule = require(process.env.SOLPACT_CANVAS_MODULE || '/tmp/solpact-promo-node/node_modules/@napi-rs/canvas'); }
const { createCanvas, GlobalFonts, loadImage } = canvasModule;
const SOURCE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(SOURCE);
const ASSETS = path.join(SOURCE, 'assets');
const T = JSON.parse(fs.readFileSync(path.join(SOURCE, 'timeline.json'), 'utf8'));
const W = T.format.width, H = T.format.height, FPS = T.format.fps;
GlobalFonts.registerFromPath(path.join(ASSETS, 'SpaceGrotesk.ttf'), 'Display');
GlobalFonts.registerFromPath(path.join(ASSETS, 'Inter.ttf'), 'Body');
GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 'CJK');
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', 'Mono');
const screenshot = await loadImage(path.join(ASSETS, 'app-home.png'));
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');
const C = { bg:'#080c14', white:'#f3f7fc', muted:'#94a3b8', faint:'#53647b',
  green:'#14f195', purple:'#ab79ff', amber:'#ffc55b', cyan:'#72d4ff', line:'#263243' };
const clamp = n => Math.max(0, Math.min(1, n));
const ease = n => 1 - (1 - clamp(n)) ** 3;
const smooth = n => { n=clamp(n); return n*n*(3-2*n); };
const sceneCaptions = new Map(T.scenes.map(s=>[s.id, T.captions.filter(c=>c.scene===s.id)]));
const cue = (s,i) => (sceneCaptions.get(s.id)[i]?.start ?? s.start) - s.start;
let globalTime=0;

function text(value,x,y,size=32,color=C.white,font='Body',weight='400',align='left',maxWidth=0) {
  ctx.save(); ctx.textAlign=align; ctx.textBaseline='alphabetic';
  ctx.font=`${weight} ${size}px ${font}`;
  if (maxWidth && ctx.measureText(value).width > maxWidth) {
    size *= maxWidth / ctx.measureText(value).width;
    ctx.font=`${weight} ${size}px ${font}`;
  }
  ctx.fillStyle=color; ctx.fillText(value,x,y); ctx.restore();
}
function gradient(x1,y1,x2,y2,colors=[C.green,C.purple]) {
  const g=ctx.createLinearGradient(x1,y1,x2,y2);
  colors.forEach((c,i)=>g.addColorStop(i/(colors.length-1),c)); return g;
}
function rect(x,y,w,h,r=24,fill='#111923',stroke=C.line,width=1) {
  ctx.save(); ctx.beginPath(); ctx.roundRect(x,y,w,h,r);
  if(fill) {ctx.fillStyle=fill;ctx.fill();}
  if(stroke) {ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}
  ctx.restore();
}
function line(x1,y1,x2,y2,color=C.line,width=2,dash=[]) {
  ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore();
}
function dot(x,y,r=5,color=C.green,glow=false) {
  ctx.save();ctx.fillStyle=color;
  if(glow){ctx.shadowBlur=24;ctx.shadowColor=color;}
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.restore();
}
function alpha(a,fn){ctx.save();ctx.globalAlpha*=clamp(a);fn();ctx.restore();}
function enter(t,delay,fn){const p=ease((t-delay)/.75);ctx.save();ctx.globalAlpha*=p;ctx.translate(0,28*(1-p));fn();ctx.restore();}
function label(value,x,y,color=C.muted,size=18) {
  ctx.save();ctx.font=`500 ${size}px Body`;ctx.fillStyle=color;
  let p=x;for(const ch of value){ctx.fillText(ch,p,y);p+=ctx.measureText(ch).width+2.2;}ctx.restore();
}
function pill(value,x,y,color=C.green,size=18) {
  ctx.save();ctx.font=`500 ${size}px Body`;
  const w=ctx.measureText(value).width+36;
  rect(x,y,w,42,21,'#101b26',color,1);
  text(value,x+18,y+28,size,color,'Body','500');ctx.restore();return w;
}
function icon(type,x,y,size=50,color=C.green) {
  ctx.save();ctx.translate(x,y);ctx.scale(size/64,size/64);
  ctx.lineWidth=3;ctx.strokeStyle=color;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();
  if(type==='lock') {
    ctx.roundRect(14,27,36,29,5);ctx.moveTo(22,27);ctx.lineTo(22,17);
    ctx.bezierCurveTo(22,3,42,3,42,17);ctx.lineTo(42,27);
    ctx.moveTo(32,39);ctx.lineTo(32,45);
  } else if(type==='check') {ctx.moveTo(13,33);ctx.lineTo(26,46);ctx.lineTo(51,18);}
  else if(type==='clock') {ctx.arc(32,32,24,0,Math.PI*2);ctx.moveTo(32,16);ctx.lineTo(32,33);ctx.lineTo(43,40);}
  else if(type==='file') {ctx.roundRect(16,7,33,50,4);ctx.moveTo(24,23);ctx.lineTo(41,23);ctx.moveTo(24,32);ctx.lineTo(41,32);ctx.moveTo(24,41);ctx.lineTo(35,41);}
  else if(type==='refund') {ctx.arc(34,33,21,-Math.PI*.8,Math.PI*.9);ctx.moveTo(9,11);ctx.lineTo(9,27);ctx.lineTo(25,27);ctx.moveTo(25,35);ctx.lineTo(42,35);}
  else if(type==='shield') {ctx.moveTo(32,5);ctx.lineTo(52,14);ctx.lineTo(49,38);ctx.quadraticCurveTo(44,52,32,59);ctx.quadraticCurveTo(20,52,15,38);ctx.lineTo(12,14);ctx.closePath();ctx.moveTo(22,31);ctx.lineTo(29,38);ctx.lineTo(42,24);}
  else if(type==='split') {ctx.moveTo(32,54);ctx.lineTo(32,33);ctx.lineTo(13,15);ctx.moveTo(32,33);ctx.lineTo(51,15);ctx.moveTo(13,28);ctx.lineTo(13,15);ctx.lineTo(26,15);ctx.moveTo(38,15);ctx.lineTo(51,15);ctx.lineTo(51,28);}
  else if(type==='wallet') {ctx.roundRect(9,15,45,37,7);ctx.roundRect(35,27,22,16,4);ctx.moveTo(18,9);ctx.lineTo(43,9);}
  else if(type==='arrow') {ctx.moveTo(9,32);ctx.lineTo(54,32);ctx.moveTo(39,17);ctx.lineTo(54,32);ctx.lineTo(39,47);}
  ctx.stroke();ctx.restore();
}
function solanaMark(x,y,size=200) {
  ctx.save();ctx.translate(x,y);ctx.scale(size/100,size/100);
  ctx.fillStyle=gradient(0,0,95,77,[C.green,'#79bdde','#9945ff']);
  for(const points of [[[18,0],[100,0],[82,18],[0,18]],[[0,28],[82,28],[100,46],[18,46]],[[18,56],[100,56],[82,74],[0,74]]]) {
    ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fill();
  }ctx.restore();
}
function wire(x1,y1,x2,y2,p,color=C.green,width=2) {
  line(x1,y1,x2,y2,C.line,width);
  if(p>0){line(x1,y1,x1+(x2-x1)*clamp(p),y1+(y2-y1)*clamp(p),color,width+1);
    dot(x1+(x2-x1)*clamp(p),y1+(y2-y1)*clamp(p),6,color,true);}
}
function orbit(x,y,r,t,color=C.green) {
  ctx.save();ctx.translate(x,y);ctx.rotate(t*.12);
  for(let i=0;i<3;i++){
    ctx.save();ctx.rotate(i*Math.PI/3);
    ctx.beginPath();ctx.ellipse(0,0,r,r*.35,0,0,Math.PI*2);
    ctx.strokeStyle=i%2?C.purple:color;ctx.lineWidth=1.5;ctx.globalAlpha*=.25;ctx.stroke();ctx.restore();
  }
  dot(Math.cos(t*.5)*r,Math.sin(t*.5)*r*.35,6,color,true);ctx.restore();
}

const bg=createCanvas(W,H);const bx=bg.getContext('2d');
bx.fillStyle=C.bg;bx.fillRect(0,0,W,H);
for(const [x,y,r,col] of [[1530,230,980,'rgba(153,69,255,.12)'],[420,690,860,'rgba(20,241,149,.07)']]) {
  const g=bx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,col);g.addColorStop(1,'rgba(8,12,20,0)');bx.fillStyle=g;bx.fillRect(0,0,W,H);
}
bx.lineWidth=1;bx.strokeStyle='rgba(126,150,186,.035)';
for(let x=0;x<W;x+=80){bx.beginPath();bx.moveTo(x,0);bx.lineTo(x,H);bx.stroke();}
for(let y=0;y<H;y+=80){bx.beginPath();bx.moveTo(0,y);bx.lineTo(W,y);bx.stroke();}

function background(t) {
  ctx.drawImage(bg,0,0);
  for(let i=0;i<38;i++){
    const x=(i*173.13+t*(3+i%4))%W, y=(i*137.37+Math.sin(t*.12+i)*22)%H;
    alpha(.12+.09*Math.sin(t*.7+i),()=>dot(x,y,i%5?1.5:2.2,i%2?C.green:C.purple));
  }
  alpha(.16,()=>orbit(1610,500,460,t,C.purple));
}
function header(scene,index) {
  rect(96,56,50,50,14,'#162119','#35583c');icon('lock',108,68,26,C.amber);
  text('SolPact',162,92,31,C.white,'Display','600');
  label('SOLANA HACKATHON · BUILDER STORY',1154,87,C.muted,17);
  line(96,136,1824,136,'#202936',1);
  label(scene.chapter,98,192,C.green,18);
  text(`${String(index+1).padStart(2,'0')} / 12`,1823,194,17,C.faint,'Mono','400','right');
}

const drawScene={
  hook(t,s){
    enter(t,.05,()=>text('WORK TOGETHER.',98,326,72,C.muted,'Display','500'));
    enter(t,.3,()=>text('WHO GOES FIRST?',90,493,134,C.white,'Display','600','left',1730));
    const on=ease((t-1.5)/1.1);
    alpha(on,()=>{
      rect(98,584,658,177,28,'#121a25','#385368');
      icon('wallet',136,641,58,C.cyan);text('THE MONEY',222,690,53,C.cyan,'Display','600');
      rect(1164,584,658,177,28,'#171527','#4e3b6b');
      icon('file',1202,641,58,C.purple);text('THE WORK',1288,690,53,C.purple,'Display','600');
      line(775,673,1145,673,'#4c5768',2,[8,10]);
      rect(908,626,104,94,25,'#111a24','#4c5768');text('?',960,697,65,C.white,'Display','500','center');
      dot(782+((t*.13)%1)*350,673,5,C.green,true);
    });
    enter(t,2.6,()=>text('Global collaboration. A local trust problem.',98,836,29,C.muted));
  },
  problem(t,s){
    enter(t,0,()=>{text('Good work deserves',98,292,81,C.white,'Display','600');
      text('better rules.',98,382,91,C.green,'Display','600');});
    const items=[['file','Unclear scope','What does “done” mean?',C.cyan],['clock','Delayed payment','When will the work be paid?',C.purple],['wallet','Upfront risk','Who carries the uncertainty?',C.amber]];
    items.forEach((v,i)=>enter(t,.5+i*.3,()=>{
      const x=98+i*582;rect(x,459,562,320,26,'#101923',i===1?'#413253':'#293545');
      icon(v[0],x+36,498,66,v[3]);text(v[1],x+36,624,40,C.white,'Display','600');
      text(v[2],x+36,677,24,C.muted,'Body','400','left',490);
      line(x+36,722,x+526,722,'#263240');label(`0${i+1} / THE COLLABORATION GAP`,x+36,753,C.faint,14);
    }));
    text('FREELANCERS   /   STUDIOS   /   SMALL TEAMS',100,847,20,C.muted,'Mono');
  },
  brand(t,s){
    alpha(.55,()=>orbit(960,484,555,t,C.green));
    enter(t,0,()=>{rect(896,223,128,128,33,'#12271f','#2c5a45');icon('lock',929,255,62,C.green);});
    enter(t,.15,()=>text('SolPact',960,563,206,gradient(590,360,1330,580,[C.white,C.white,C.green]),'Display','600','center'));
    enter(t,.5,()=>text('Milestone-based USDC escrow on Solana',960,646,39,C.muted,'Body','400','center'));
    enter(t,.8,()=>{
      const values=['AGREE.','DELIVER.','GET PAID.'];
      values.forEach((v,i)=>{const x=501+i*323;rect(x,718,278,72,22,'#111c26',i===2?'#27825b':C.line);
        text(v,x+139,765,29,i===2?C.green:C.white,'Display','500','center');});
    });
  },
  team(t,s){
    enter(t,0,()=>{text('Built by two.',98,296,86,C.white,'Display','600');text('For anyone who builds.',98,379,69,C.muted,'Display','500');});
    const people=[['O','Oscar','Product & System Architecture','PRODUCT × SYSTEMS',C.green],['Z','zhaoyan','Smart Contracts','PROTOCOL × ENGINEERING',C.purple]];
    people.forEach((p,i)=>enter(t,.4+i*.3,()=>{
      const x=98+i*880;rect(x,437,846,350,28,'#111a25',i?'#4c3c67':'#2b5644');
      const y=540+Math.sin(t*.5+i)*3;dot(x+102,y,56,i?'#2d2044':'#153b2c');
      text(p[0],x+102,y+22,65,p[4],'Display','500','center');
      text(p[1],x+193,555,71,C.white,'Display','600');
      text(p[2],x+193,614,29,C.muted,'Body','400','left',610);
      line(x+38,673,x+808,673,C.line);label(p[3],x+38,724,p[4],17);
      text(i?'// make the rules executable':'// turn the problem into a product',x+38,760,16,C.faint,'Mono');
    }));
    text('A shared mission: clearer agreements, fairer collaboration.',100,849,27,C.muted);
  },
  fund(t,s){
    enter(t,0,()=>text('Start with a clear agreement.',98,310,77,C.white,'Display','600','left',1730));
    const deposit=ease((t-cue(s,2)-1)/1.65);
    enter(t,.3,()=>{
      rect(98,405,1042,409,28,'#111b26','#324150');
      text('Design & development',134,461,33,C.white,'Display','600');
      label('ILLUSTRATIVE PROJECT',134,498,C.faint,14);
      pill('2 milestones',900,432,C.muted,16);
      const rows=[['01','Design','7-day deadline','200'],['02','Development','14-day deadline','300']];
      rows.forEach((r,i)=>{
        const y=535+i*113;rect(127,y,984,98,18,'#0b121c','#253241');
        dot(166,y+48,20,i? '#332744':'#14382a');text(r[0],166,y+54,16,i?C.purple:C.green,'Mono','400','center');
        text(r[1],208,y+41,29,C.white,'Display','500');text(r[2],208,y+73,18,C.muted);
        text(r[3],991,y+45,40,C.white,'Display','600','right');text('USDC',1075,y+45,19,C.muted,'Body','500','right');
      });
      text('Total budget',138,789,22,C.muted);text('500 USDC',1080,789,29,C.white,'Display','600','right');
    });
    enter(t,.7,()=>{
      rect(1220,405,604,409,28,'#0f211c',deposit>.8?'#25845a':'#294537');
      label('PROJECT ESCROW VAULT',1259,462,C.green,17);icon('lock',1257,493,62,C.green);
      text(String(Math.round(500*deposit)),1260,664,114,C.white,'Display','600');text('USDC',1560,657,30,C.green);
      text(deposit>.98?'Full budget reserved':'Client funds the agreement',1260,724,24,C.muted);
      rect(1260,759,518,7,3,'#183c2b',null);rect(1260,759,Math.max(1,518*deposit),7,3,C.green,null);
    });
    wire(1148,610,1212,610,deposit,C.green,3);
    text('ILLUSTRATIVE WORKFLOW · 500 USDC · NOT A LIVE TRANSACTION',99,861,16,C.faint,'Mono');
  },
  pay(t,s){
    enter(t,0,()=>{text('Deliver one stage.',98,282,76,C.white,'Display','600');text('Get paid for one stage.',98,366,76,C.green,'Display','600');});
    const pay=ease((t-cue(s,1)-1.0)/1.6);
    const cards=[98,700,1302];
    cards.forEach((x,i)=>enter(t,.35+i*.15,()=>rect(x,442,522,327,28,i===1?'#121c28':'#101c23',i===2&&pay>.8?'#248a5b':'#2d3a4b')));
    enter(t,.5,()=>{
      label('PROJECT VAULT',132,491,C.muted,17);icon('lock',131,520,50,C.green);
      text(String(Math.round(500-200*pay)),135,671,105,C.white,'Display','600');text('USDC',402,659,24,C.muted);
      text('Next stage stays funded',133,731,24,C.muted);
    });
    enter(t,.7,()=>{
      label('MILESTONE 01',738,491,C.cyan,17);icon(pay>.2?'check':'file',741,520,50,pay>.2?C.green:C.cyan);
      text('Design delivered',738,622,31,C.white,'Display','600');text('deliverable.link/design',738,666,20,C.muted,'Mono');
      pill(pay>.25?'Approved by client':'Delivery submitted',738,701,pay>.25?C.green:C.cyan,16);
    });
    enter(t,.9,()=>{
      label('BUILDER RECEIVES',1340,491,C.green,17);icon('wallet',1340,520,50,C.green);
      text(String(Math.round(200*pay)),1340,671,105,pay>.8?C.green:C.white,'Display','600');text('USDC',1607,659,24,C.muted);
      text(pay>.99?'Milestone paid':'Payment tied to delivery',1341,731,24,C.muted);
    });
    wire(630,609,688,609,clamp((t-1.4)/1.5),C.cyan,3);
    wire(1234,609,1290,609,pay,C.green,3);
    alpha(pay,()=>{icon('check',101,811,35,C.green);text('200 paid. 300 reserved. One milestone at a time.',152,839,31,C.white,'Display','500');});
    text('ILLUSTRATIVE WORKFLOW · NOT A LIVE TRANSACTION',101,880,15,C.faint,'Mono');
  },
  protect(t,s){
    enter(t,0,()=>{text('Fair exits. Clear authority.',98,298,81,C.white,'Display','600');text('Agreed rules for both sides.',101,362,32,C.muted);});
    const active=t<cue(s,2)?0:t<cue(s,3)?1:2;
    const cards=[['clock','Claim after timeout',['Undisputed delivery.','Seller submits a claim.'],'RESPONSE WINDOW',C.green],
      ['refund','Refund missed work',['Delivery deadline passes.','Client requests a refund.'],'MISSED DEADLINE',C.cyan],
      ['split','Resolve disputes',['The chosen arbitrator','allocates the payment.'],'DESIGNATED ARBITRATOR',C.purple]];
    cards.forEach((v,i)=>enter(t,.4+i*.15,()=>{
      const x=98+i*582;rect(x,440,562,354,26,'#101923',active===i?v[4]:'#293545',active===i?1.6:1);
      icon(v[0],x+36,476,69,v[4]);text(v[1],x+36,614,32,C.white,'Display','600','left',490);
      v[2].forEach((a,j)=>text(a,x+36,660+j*35,24,C.muted));
      label(v[3],x+36,761,v[4],14);
    }));
    text('Rules agreed up front. Actions remain visible on-chain.',99,856,27,C.muted);
  },
  solana(t,s){
    enter(t,0,()=>{text('WHY',94,385,139,C.white,'Display','600');
      text('SOLANA?',90,539,143,gradient(96,520,900,520),'Display','600');
      text('Built for every milestone.',98,646,45,C.muted,'Display','500');});
    enter(t,.4,()=>{
      rect(1054,256,770,429,38,'#111b26','#3a3b57');
      alpha(.5,()=>orbit(1441,427,188,t));
      solanaMark(1319,308,241);
      text('Low transaction costs.',1439,567,38,C.white,'Display','500','center');
      text('Fast confirmations.',1439,628,38,C.green,'Display','500','center');
    });
    const names=['CREATE','FUND','SUBMIT','APPROVE'];
    names.forEach((name,i)=>enter(t,.6+i*.1,()=>{
      const x=98+i*441;rect(x,761,407,84,21,'#111b25','#2a3b48');
      const lit=(Math.floor(t*1.1)%4)===i;dot(x+34,804,5,lit?C.green:C.faint,lit);
      text(name,x+60,812,22,lit?C.green:C.muted,'Mono');
      if(i<3) icon('arrow',x+409,789,31,C.faint);
    }));
  },
  usdc(t,s){
    enter(t,0,()=>text('One unit. Across borders.',98,294,82,C.white,'Display','600'));
    alpha(ease(t/.8),()=>{
      orbit(673,598,364,t,C.cyan);
      dot(673,598,157,'#102833');
      ctx.save();ctx.strokeStyle=C.cyan;ctx.lineWidth=3;ctx.beginPath();ctx.arc(673,598,160,0,Math.PI*2);ctx.stroke();ctx.restore();
      text('$',673,619,110,C.white,'Display','500','center');text('USDC',673,694,39,C.cyan,'Display','600','center');
      [[336,468,'CLIENT'],[1008,457,'BUILDER'],[1031,738,'TEAM']].forEach(([x,y,lab],i)=>{
        dot(x,y,31,'#172232');dot(x,y,4,i?C.purple:C.green,true);
        text(lab,x,y+64,17,C.muted,'Mono','400','center');
      });
    });
    enter(t,.5,()=>{
      rect(1247,411,577,369,28,'#111a25','#3b4059');label('WALLET ECOSYSTEM',1285,461,C.muted,17);
      [['P','Phantom',C.purple],['S','Solflare',C.amber]].forEach((v,i)=>{
        const y=505+i*117;rect(1278,y,515,94,18,'#0d141e','#273344');dot(1327,y+47,25,i?'#3b2c14':'#322449');
        text(v[0],1327,y+56,25,v[2],'Display','500','center');text(v[1],1375,y+59,34,C.white,'Display','500');icon('check',1736,y+32,30,C.green);
      });
    });
    text('Quote in USDC. Settle in USDC.',100,850,32,C.muted,'Display','500');
  },
  native(t,s){
    enter(t,0,()=>text('Rebuilt for Solana.',98,293,85,C.white,'Display','600'));
    enter(t,.4,()=>{pill('Avalanche prototype',99,338,C.muted,22);icon('arrow',419,342,41,C.faint);pill('Rust + Anchor',481,338,C.green,22);});
    const p=ease((t-1)/1.4);
    wire(958,551,958,652,p,C.purple,2);wire(612,652,1304,652,p,C.purple,2);
    wire(612,652,612,691,p,C.purple,2);wire(1304,652,1304,691,p,C.purple,2);wire(1327,489,1490,489,p,C.green,3);
    enter(t,.6,()=>{
      rect(542,419,785,132,25,'#10241d','#2a6750');label('PROJECT ACCOUNT',577,463,C.green,17);
      text('Participants · Budget · Rules',577,512,31,C.white,'Display','500');
      icon('file',1227,458,51,C.green);
    });
    [[423,'MILESTONE 01','Design · 200 USDC'],[1115,'MILESTONE 02','Build · 300 USDC']].forEach(([x,l,v],i)=>enter(t,1+i*.1,()=>{
      rect(x,689,380,111,22,'#191529','#4c3968');label(l,x+28,732,C.purple,15);text(v,x+28,772,25,C.white,'Display','500');
    }));
    enter(t,.9,()=>{
      rect(1491,418,333,191,25,'#10251e','#2e6d54');icon('lock',1522,445,46,C.green);
      label('PROJECT VAULT',1583,477,C.green,14);text('SPL USDC',1524,542,34,C.white,'Display','600');text('Independent escrow',1524,580,21,C.muted);
    });
    text('Each project. Its own vault.',100,854,38,C.green,'Display','500');
    label('SOLANA ACCOUNT MODEL',99,552,C.faint,16);text('Isolate funds.',99,601,28,C.muted);text('Verify rules.',99,643,28,C.muted);
  },
  progress(t,s){
    enter(t,0,()=>text('Built. Deployed. Still building.',98,295,74,C.white,'Display','600','left',1730));
    enter(t,.4,()=>{
      rect(98,379,1044,469,24,'#111a25','#33434f');
      label('ACTUAL FRONTEND · UI PREVIEW',130,417,C.amber,16);
      ctx.save();ctx.beginPath();ctx.roundRect(116,442,1008,389,13);ctx.clip();
      ctx.drawImage(screenshot,0,0,1480,750,116,442,1008,511);ctx.restore();
    });
    enter(t,.65,()=>{
      rect(1192,379,632,469,28,'#101d25','#304958');
      dot(1229,422,6,C.green,true);label('SOLANA DEVNET',1250,429,C.green,17);
      const rows=[['Program deployed','On-chain escrow program',C.green],['Protocol tests recorded','Approvals · Refunds · Arbitration',C.cyan],['Browser integration','In progress',C.amber]];
      rows.forEach((r,i)=>{const y=481+i*105;
        text(r[0],1228,y,29,C.white,'Display','500','left',558);text(r[1],1228,y+35,21,r[2]);
        if(i<2)line(1228,y+58,1785,y+58,C.line);
      });
      text('Program: 8yTJg…Q5bt',1228,813,19,C.muted,'Mono');
    });
    text('Next: finish the wallet-to-contract experience and run service team pilots.',101,888,24,C.muted);
  },
  close(t,s){
    alpha(.65,()=>orbit(960,477,575,t,C.green));
    enter(t,0,()=>{solanaMark(894,218,132);text('BUILT ON SOLANA',960,359,20,C.green,'Mono','400','center');});
    enter(t,.25,()=>text('SolPact',960,565,207,gradient(580,390,1340,575,[C.white,C.white,C.green]),'Display','600','center'));
    enter(t,.6,()=>text('Agree. Deliver. Get paid.',960,660,63,C.white,'Display','500','center'));
    enter(t,.9,()=>text('Oscar  /  Product & Architecture     ×     zhaoyan  /  Smart Contracts',960,752,23,C.muted,'Body','400','center'));
    enter(t,1.2,()=>text('github.com/murphywuwu/MilePay',960,815,26,C.green,'Mono','400','center'));
    enter(t,1.5,()=>text('Clear milestones. Verifiable rules. Collaboration across borders.',960,872,25,C.muted,'Body','400','center'));
  }
};

function wrap(value,size,maxWidth,font='Body') {
  ctx.save();ctx.font=`500 ${size}px ${font}`;
  const words=value.split(' ');const lines=[];let row='';
  for(const w of words){const test=row?row+' '+w:w;if(row&&ctx.measureText(test).width>maxWidth){lines.push(row);row=w;}else row=test;}
  if(row)lines.push(row);ctx.restore();return lines;
}
function subtitles(t) {
  const cap=T.captions.find(c=>t>=c.start && t<c.end);
  const g=ctx.createLinearGradient(0,894,0,1056);g.addColorStop(0,'rgba(8,12,20,0)');g.addColorStop(.25,'rgba(8,12,20,.92)');g.addColorStop(1,'rgba(8,12,20,.98)');
  ctx.fillStyle=g;ctx.fillRect(0,894,W,166);
  if(cap){
    let lines=wrap(cap.en,28,1728);
    let size=28;if(lines.length>2){size=26;lines=wrap(cap.en,size,1728);}
    const first=lines.length===1?956:936;
    lines.forEach((row,i)=>text(row,960,first+i*35,size,C.white,'Body','500','center'));
    text(cap.zh,960,1025,30,'#acb9cc','CJK','400','center',1740);
  }
  line(96,1062,1824,1062,'#243040',3);
  line(96,1062,96+1728*clamp(t/T.duration),1062,C.green,3);
}
function frame(t,caption=true) {
  globalTime=t;background(t);
  let index=T.scenes.findIndex(s=>t<s.end);if(index<0)index=T.scenes.length-1;
  const scene=T.scenes[index], local=t-scene.start;
  const blend=index?smooth(local/.55):1;
  if(index&&blend<1){const previous=T.scenes[index-1];alpha(1-blend,()=>drawScene[previous.id](previous.duration-.05,previous));}
  alpha(blend,()=>drawScene[scene.id](local,scene));
  header(scene,index);if(caption)subtitles(t);
  const fade=clamp((T.duration-t)/.45);
  if(fade<1){ctx.fillStyle=`rgba(8,12,20,${1-fade})`;ctx.fillRect(0,0,W,H);}
}

async function stills() {
  const out=path.join(ASSETS,'stills');fs.mkdirSync(out,{recursive:true});
  for(const [i,s] of T.scenes.entries()){
    frame(s.start+s.duration*.57);fs.writeFileSync(path.join(out,`${String(i+1).padStart(2,'0')}-${s.id}.png`),canvas.toBuffer('image/png'));
  }
  const s=T.scenes.find(s=>s.id==='close');frame(s.start+3.1,false);
  fs.writeFileSync(path.join(ROOT,'SolPact-Hackathon-cover.png'),canvas.toBuffer('image/png'));
  console.log('12 storyboard frames and cover exported.');
}
async function render() {
  const ffmpeg=process.env.FFMPEG || fs.readFileSync(path.join(SOURCE,'ffmpeg-path.txt'),'utf8').trim();
  const file=path.join(ASSETS,'silent-video.mp4');
  const encoder=spawn(ffmpeg,['-y','-hide_banner','-loglevel','error','-f','rawvideo','-pixel_format','rgba',
    '-video_size',`${W}x${H}`,'-framerate',String(FPS),'-i','pipe:0','-an','-c:v','libx264',
    '-preset','veryfast','-crf','19','-threads','6','-pix_fmt','yuv420p',
    '-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-movflags','+faststart',file],
    {stdio:['pipe','ignore','pipe']});
  let failures='';encoder.stderr.on('data',d=>{failures+=d;});
  encoder.stdin.on('error',()=>{});
  const completed=new Promise((resolve,reject)=>{
    encoder.on('error',reject);encoder.on('close',code=>code===0?resolve():reject(new Error(`FFmpeg exited ${code}: ${failures}`)));
  });
  const start=Date.now();
  for(let i=0;i<T.frames;i++){
    frame(i/FPS);const data=ctx.getImageData(0,0,W,H).data;
    if(!encoder.stdin.write(Buffer.from(data.buffer,data.byteOffset,data.byteLength)))await once(encoder.stdin,'drain');
    if(i%300===0)console.log(`Rendered ${i}/${T.frames} frames (${Math.round((Date.now()-start)/1000)}s elapsed)`);
  }
  encoder.stdin.end();await completed;
  console.log(`Silent video ready: ${T.frames} frames, ${T.duration.toFixed(2)}s.`);
}
if(process.argv.includes('--stills'))await stills();else await render();
