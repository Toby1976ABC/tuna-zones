"use strict";
// ---------- Geography ----------
const COAST_ANCHORS=[[46.25,-1.55],[46.0,-1.42],[45.8,-1.25],[45.6,-1.18],[45.4,-1.17],[45.0,-1.20],[44.6,-1.26],[44.2,-1.30],[43.8,-1.40],[43.5,-1.56],[43.4,-1.72],[43.33,-2.0]];
function coastLon(lat){for(let i=0;i<COAST_ANCHORS.length-1;i++){const[a,x]=COAST_ANCHORS[i],[b,y]=COAST_ANCHORS[i+1];if(lat<=a&&lat>=b)return x+(y-x)*(a-lat)/(a-b);}return COAST_ANCHORS.at(-1)[1];}
// Request grid: must match the order sent to the marine API.
const GRID=[];(function(){let lat=46.2;while(lat>=43.39){const c=coastLon(lat);let lon=c-0.08;while(lon>=c-1.32){let ok=true;if(lat<43.5&&lon<-2.05)ok=lat>=43.45&&lon>-2.6;if(ok)GRID.push([+lat.toFixed(3),+lon.toFixed(3)]);lon-=0.125;}lat-=0.125;}})();
const LAND=[[46.45,-1.25],[46.3,-1.25],[46.2,-1.16],[46.1,-1.10],[45.95,-1.05],[45.8,-1.15],[45.72,-1.24],[45.66,-1.15],[45.62,-1.04],[45.5,-0.93],[45.48,-0.98],[45.56,-1.06],[45.48,-1.13],[45.3,-1.16],[45.0,-1.20],[44.75,-1.23],[44.64,-1.255],[44.66,-1.19],[44.7,-1.05],[44.62,-1.10],[44.6,-1.18],[44.55,-1.21],[44.3,-1.27],[44.1,-1.32],[43.85,-1.38],[43.7,-1.43],[43.645,-1.445],[43.53,-1.495],[43.48,-1.56],[43.42,-1.60],[43.39,-1.66],[43.37,-1.76],[43.39,-1.79],[43.33,-1.90],[43.32,-1.98],[43.30,-2.10],[43.30,-2.25],[43.32,-2.40],[43.37,-2.50],[43.38,-2.62],[43.42,-2.72],[43.41,-2.85],[43.40,-3.1],[43.0,-3.1],[43.0,-0.3],[46.45,-0.3]];
const ISLANDS=[[[46.25,-1.56],[46.21,-1.46],[46.17,-1.32],[46.15,-1.25],[46.19,-1.32],[46.23,-1.48]],[[46.05,-1.42],[46.0,-1.35],[45.9,-1.26],[45.8,-1.19],[45.85,-1.24],[45.98,-1.38]]];
// Approximate 200 m shelf edge and canyon axes (orientation only).
const SHELF=[[46.35,-3.85],[46.0,-3.45],[45.6,-3.0],[45.2,-2.6],[44.8,-2.25],[44.5,-2.05],[44.2,-1.95],[43.9,-1.85],[43.72,-1.72],[43.62,-1.6],[43.56,-1.7],[43.52,-1.82],[43.49,-2.1],[43.5,-2.5],[43.53,-2.9]];
const CANYONS=[{name:"Capbreton canyon",pts:[[43.645,-1.47],[43.63,-1.62],[43.61,-1.8],[43.6,-2.0],[43.6,-2.25],[43.64,-2.5],[43.7,-2.75]]},{name:"Cap Ferret canyon",pts:[[44.62,-1.85],[44.6,-2.05],[44.56,-2.3],[44.5,-2.6]]}];
// Coastal towns and beaches, north to south. [full name, short label, lat, lon, rank]; rank 1 = harbour / main town (labelled first).
// Positions are approximate (beach front), for orientation only.
const TOWNS=[
["La Rochelle","La Rochelle",46.155,-1.155,1],["Châtelaillon-Plage","Châtelaillon",46.075,-1.09,2],["Royan","Royan",45.62,-1.03,1],
["Soulac-sur-Mer","Soulac",45.513,-1.125,2],["Montalivet","Montalivet",45.38,-1.16,2],["Hourtin-Plage","Hourtin",45.22,-1.17,2],
["Carcans-Plage","Carcans",45.08,-1.19,2],["Lacanau-Océan","Lacanau",45.0,-1.2,2],["Le Porge","Le Porge",44.89,-1.22,3],
["Cap Ferret","Cap Ferret",44.63,-1.25,2],["Arcachon","Arcachon",44.66,-1.17,1],["Pyla-sur-Mer","Pyla",44.59,-1.21,3],
["Biscarrosse-Plage","Biscarrosse",44.45,-1.25,2],["Mimizan-Plage","Mimizan",44.215,-1.3,2],["Lespecier","Lespecier",44.17,-1.305,3],
["Contis-Plage","Contis",44.09,-1.32,2],["Saint-Girons-Plage","St-Girons",43.95,-1.36,3],["Moliets-Plage","Moliets",43.85,-1.39,2],
["Messanges","Messanges",43.81,-1.4,3],["Vieux-Boucau","Vieux-Boucau",43.79,-1.41,3],["Seignosse","Seignosse",43.69,-1.44,3],
["Hossegor","Hossegor",43.665,-1.445,2],["Capbreton","Capbreton",43.645,-1.445,1],["Labenne-Océan","Labenne",43.6,-1.46,3],
["Ondres-Plage","Ondres",43.57,-1.48,3],["Tarnos","Tarnos",43.54,-1.5,3],["Anglet","Anglet",43.5,-1.53,3],
["Biarritz","Biarritz",43.48,-1.56,2],["Bidart","Bidart",43.44,-1.59,3],["Guéthary","Guéthary",43.42,-1.61,3],
["Saint-Jean-de-Luz","St-Jean-de-Luz",43.39,-1.665,1],["Hendaye","Hendaye",43.37,-1.78,2],["Hondarribia","Hondarribia",43.37,-1.79,2],
["San Sebastián","San Sebastián",43.32,-1.98,1]];
// East edge leaves a land strip for town names. Chart aspect = (dLon*cos 44.8°)/dLat ≈ 1739/3100 (see .chart in styles.css).
const BOUNDS={w:-3.0,e:-0.55,s:43.25,n:46.35};
const KX=Math.cos(44.8*Math.PI/180);
function km(a1,o1,a2,o2){const dy=(a1-a2)*111.2,dx=(o1-o2)*111.2*Math.cos((a1+a2)/2*Math.PI/180);return Math.hypot(dx,dy);}
function distToLine(lat,lon,pts){let best=1e9;for(let i=0;i<pts.length-1;i++){const[a1,o1]=pts[i],[a2,o2]=pts[i+1];const ax=o1*KX,ay=a1,bx=o2*KX,by=a2,px=lon*KX,py=lat;const vx=bx-ax,vy=by-ay,t=Math.max(0,Math.min(1,((px-ax)*vx+(py-ay)*vy)/(vx*vx+vy*vy)));const qx=ax+t*vx,qy=ay+t*vy;best=Math.min(best,Math.hypot(px-qx,py-qy)*111.2);}return best;}
const COASTLINE=LAND.slice(1,-4);
const STATIC=GRID.map(([la,lo])=>({coast:distToLine(la,lo,COASTLINE),shelf:distToLine(la,lo,SHELF),canyon:Math.min(...CANYONS.map(c=>distToLine(la,lo,c.pts)))}));
function bearing(a1,o1,a2,o2){const r=Math.PI/180,y=Math.sin((o2-o1)*r)*Math.cos(a2*r),x=Math.cos(a1*r)*Math.sin(a2*r)-Math.sin(a1*r)*Math.cos(a2*r)*Math.cos((o2-o1)*r);return(Math.atan2(y,x)/r+360)%360;}
function dm(v,pos,neg){const s=v<0?neg:pos,a=Math.abs(v),d=Math.floor(a),m=(a-d)*60;return`${d}°${m.toFixed(1).padStart(4,"0")}′${s}`;}
function fmtPos(la,lo){return`${dm(la,"N","S")} ${dm(lo,"E","W")}`;}

