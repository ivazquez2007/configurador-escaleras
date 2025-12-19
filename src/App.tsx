import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, ContactShadows, Text, Line, TransformControls, Environment } from '@react-three/drei';
import * as THREE from 'three';

// ====================================================================
// 1. GENERADOR DE PLANO (SVG + BOM)
// ====================================================================
const generateSVG = (params: any) => {
  const H = params.totalHeight * 1000;
  const W_IN = params.widthInner * 1000;
  const RAIL_W = params.railWidth * 1000;
  const RAIL_D = params.railDepth * 1000;
  const W_OUT = W_IN + (RAIL_W * 2);
  const PITCH = params.pitch * 1000;
  const WALL_D = params.wallDistance * 1000;
  const OFFSET = params.offset * 1000;
  const LANDING_H = params.landingHeight * 1000;
  const PLAT_D = params.platformDepth * 1000;
  const TOP_D = params.topLandingDepth * 1000;
  
  const EXIT_H = params.hasExit ? params.exitExtension * 1000 : 0;
  const TOTAL_RAIL_H = H + EXIT_H; 

  let totalProfileMeters = (H * 2) / 1000; 
  if (params.hasExit) totalProfileMeters += (params.exitExtension * 2);
  if (params.hasLanding) totalProfileMeters += (1.1 * 2); 
  if (params.hasLanding) totalProfileMeters += ((H - LANDING_H) * 2) / 1000; 
  
  const rungs: number[] = [];
  let cy = 150;
  while (cy < H) {
    rungs.push(cy);
    cy += PITCH;
  }
  const numRungs = rungs.length;
  const numBrackets = params.supports.length * 2;

  const CANVAS_W = 3500;
  const CANVAS_H = TOTAL_RAIL_H + 2000; 
  const DRAW_Y_START = 1000; 
  const toSvgY = (y_mm: number) => (CANVAS_H - DRAW_Y_START) - y_mm;

  const css = `
    <style>
      text { font-family: 'Consolas', 'Courier New', monospace; fill: #000; }
      .title { font-size: 80px; font-weight: bold; }
      .header { font-size: 40px; font-weight: bold; }
      .dim-text { font-size: 30px; fill: #444; }
      .outline { stroke: #000; stroke-width: 3; fill: none; }
      .thick { stroke: #000; stroke-width: 6; fill: none; }
      .thin { stroke: #000; stroke-width: 1; fill: none; }
      .profile { fill: #fff; stroke: #000; stroke-width: 3; }
      .rung { stroke: #000; stroke-width: 8; stroke-linecap: round; }
      .dim-line { stroke: #000; stroke-width: 2; }
      .bom-box { fill: none; stroke: #000; stroke-width: 3; }
      .bom-line { stroke: #000; stroke-width: 2; }
      .bom-text { font-size: 35px; }
      .bom-header { font-size: 35px; font-weight: bold; }
    </style>
  `;

  const defs = `
    <defs>
      <marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
        <path d="M2,2 L10,6 L2,10 L2,2" fill="#000" />
      </marker>
    </defs>
  `;

  const dimV = (x: number, y1: number, y2: number, txt: string) => `
    <line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" class="dim-line" marker-start="url(#arrow)" marker-end="url(#arrow)" />
    <text x="${x-20}" y="${(y1+y2)/2}" text-anchor="end" dominant-baseline="middle" class="dim-text" transform="rotate(-90, ${x-20}, ${(y1+y2)/2})">${txt}</text>
    <line x1="${x-10}" y1="${y1}" x2="${x+30}" y2="${y1}" class="dim-line" />
    <line x1="${x-10}" y1="${y2}" x2="${x+30}" y2="${y2}" class="dim-line" />
  `;
  
  const dimH = (y: number, x1: number, x2: number, txt: string) => `
    <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" class="dim-line" marker-start="url(#arrow)" marker-end="url(#arrow)" />
    <text x="${(x1+x2)/2}" y="${y-15}" text-anchor="middle" class="dim-text">${txt}</text>
    <line x1="${x1}" y1="${y-30}" x2="${x1}" y2="${y+10}" class="dim-line" />
    <line x1="${x2}" y1="${y-30}" x2="${x2}" y2="${y+10}" class="dim-line" />
  `;

  let alzadoProfiles = '';
  if (params.hasLanding) {
      alzadoProfiles += `<rect x="0" y="${toSvgY(LANDING_H)}" width="${RAIL_W}" height="${LANDING_H}" class="profile" />`;
      alzadoProfiles += `<rect x="${W_OUT-RAIL_W}" y="${toSvgY(LANDING_H)}" width="${RAIL_W}" height="${LANDING_H}" class="profile" />`;
      let topH = TOTAL_RAIL_H - LANDING_H;
      alzadoProfiles += `<g transform="translate(${OFFSET}, 0)">
         <rect x="0" y="${toSvgY(TOTAL_RAIL_H)}" width="${RAIL_W}" height="${topH}" class="profile" />
         <rect x="${W_OUT-RAIL_W}" y="${toSvgY(TOTAL_RAIL_H)}" width="${RAIL_W}" height="${topH}" class="profile" />
      </g>`;
  } else {
      alzadoProfiles += `<rect x="0" y="${toSvgY(TOTAL_RAIL_H)}" width="${RAIL_W}" height="${TOTAL_RAIL_H}" class="profile" />`;
      alzadoProfiles += `<rect x="${W_OUT-RAIL_W}" y="${toSvgY(TOTAL_RAIL_H)}" width="${RAIL_W}" height="${TOTAL_RAIL_H}" class="profile" />`;
  }

  let svg = `<svg width="${CANVAS_W}" height="${CANVAS_H}" viewBox="0 0 ${CANVAS_W} ${CANVAS_H}" xmlns="http://www.w3.org/2000/svg">
    ${css} ${defs}
    <rect x="50" y="50" width="${CANVAS_W-100}" height="250" fill="none" stroke="#000" stroke-width="5" />
    <text x="100" y="150" class="title">PLANO DE FABRICACIÓN</text>
    <text x="100" y="220" class="dim-text">REF: ESC-${Math.floor(Math.random()*1000)} | H ÚTIL=${params.totalHeight}m</text>
    <line x1="50" y1="${toSvgY(0)}" x2="${CANVAS_W-50}" y2="${toSvgY(0)}" class="thick" />
    <text x="${CANVAS_W-400}" y="${toSvgY(0)+60}" class="dim-text">Nivel ±0.00</text>

    <g transform="translate(400, 0)">
       <text x="${W_OUT/2}" y="${toSvgY(H + 800)}" text-anchor="middle" class="header">ALZADO</text>
       ${alzadoProfiles}
       ${params.hasLanding ? `
          <rect x="0" y="${toSvgY(LANDING_H + 1100)}" width="${RAIL_W}" height="1100" class="profile" stroke-dasharray="10,5" />
          <rect x="${W_OUT-RAIL_W}" y="${toSvgY(LANDING_H + 1100)}" width="${RAIL_W}" height="1100" class="profile" stroke-dasharray="10,5" />
       ` : ''}
       ${rungs.filter(r => !params.hasLanding || r <= LANDING_H).map(r => `<line x1="${RAIL_W}" y1="${toSvgY(r)}" x2="${W_OUT-RAIL_W}" y2="${toSvgY(r)}" class="rung" />`).join('')}
       ${params.hasLanding ? `
          <g transform="translate(${OFFSET}, 0)">
             ${rungs.filter(r => r > LANDING_H).map(r => `<line x1="${RAIL_W}" y1="${toSvgY(r)}" x2="${W_OUT-RAIL_W}" y2="${toSvgY(r)}" class="rung" />`).join('')}
          </g>
          <rect x="${OFFSET >= 0 ? 0 : OFFSET}" y="${toSvgY(LANDING_H)}" width="${Math.abs(OFFSET)+W_OUT}" height="50" class="profile" fill="#eee" />
       ` : ''}
       ${dimH(toSvgY(-200), 0, W_OUT, `ANCHO ${W_OUT}`)}
       ${dimV(-150, toSvgY(0), toSvgY(H), `H ÚTIL = ${H}`)}
       ${params.hasExit ? dimV(-150, toSvgY(H), toSvgY(TOTAL_RAIL_H), `SALIDA +${params.exitExtension * 1000}`) : ''}
       ${params.hasLanding ? dimV(-250, toSvgY(0), toSvgY(LANDING_H), `H CORTE = ${LANDING_H}`) : ''}
    </g>

    <g transform="translate(${1500 + Math.abs(OFFSET)}, 0)">
       <text x="${WALL_D}" y="${toSvgY(H + 800)}" text-anchor="middle" class="header">PERFIL</text>
       <line x1="0" y1="${toSvgY(-100)}" x2="0" y2="${toSvgY(TOTAL_RAIL_H+500)}" class="thick" stroke="#999" />
       ${params.supports.map((sh:number) => {
          let y = sh * 1000;
          if (y > H) return '';
          return `<rect x="0" y="${toSvgY(y+40)}" width="${WALL_D}" height="80" fill="#555" stroke="black" /><text x="-20" y="${toSvgY(y)}" text-anchor="end" class="dim-text">Soporte +${y}</text>`;
       }).join('')}
       <rect x="${WALL_D}" y="${toSvgY(TOTAL_RAIL_H)}" width="${RAIL_D}" height="${TOTAL_RAIL_H}" class="profile" />
       ${rungs.map(r => `<rect x="${WALL_D+10}" y="${toSvgY(r)+RAIL_D/4}" width="${RAIL_D-20}" height="15" fill="#000" />`).join('')}
       ${params.hasLanding ? `
          <rect x="${WALL_D}" y="${toSvgY(LANDING_H)}" width="${PLAT_D}" height="60" class="profile" fill="#ccc" />
          <path d="M ${WALL_D+PLAT_D} ${toSvgY(LANDING_H)} v ${-1100}" class="outline" />
          <line x1="${WALL_D}" y1="${toSvgY(LANDING_H)}" x2="${WALL_D+PLAT_D}" y2="${toSvgY(LANDING_H+1100)}" class="thin" />
          <line x1="${WALL_D}" y1="${toSvgY(LANDING_H+1100)}" x2="${WALL_D+PLAT_D}" y2="${toSvgY(LANDING_H)}" class="thin" />
          ${dimH(toSvgY(LANDING_H - 100), WALL_D, WALL_D+PLAT_D, `L=${PLAT_D}`)}
       ` : ''}
       ${params.hasTopLanding ? `
          <rect x="${WALL_D}" y="${toSvgY(H)}" width="${TOP_D}" height="60" class="profile" fill="#bbb" />
          <rect x="${WALL_D+TOP_D}" y="${toSvgY(H+1100)}" width="40" height="1100" class="profile" />
          <rect x="${WALL_D}" y="${toSvgY(H+1100)}" width="${TOP_D}" height="40" class="outline" />
          <rect x="${WALL_D}" y="${toSvgY(H+550)}" width="${TOP_D}" height="20" class="thin" />
          <line x1="${WALL_D}" y1="${toSvgY(H)}" x2="${WALL_D+TOP_D}" y2="${toSvgY(H+1100)}" class="thin" stroke="#000" />
          <line x1="${WALL_D}" y1="${toSvgY(H+1100)}" x2="${WALL_D+TOP_D}" y2="${toSvgY(H)}" class="thin" stroke="#000" />
          ${dimH(toSvgY(H - 200), WALL_D, WALL_D+TOP_D, `DESEMBARCO L=${TOP_D}`)}
          ${dimV(WALL_D+TOP_D+100, toSvgY(H), toSvgY(H+1100), `1100`)}
       ` : ''}
       ${dimH(toSvgY(-200), 0, WALL_D, `PARED ${WALL_D}`)}
    </g>

    <g transform="translate(${CANVAS_W - 1100}, ${CANVAS_H - 600})">
       <rect x="0" y="0" width="1000" height="500" class="bom-box" />
       <line x1="0" y1="80" x2="1000" y2="80" class="bom-line" />
       <text x="500" y="55" text-anchor="middle" class="bom-header">LISTA DE MATERIALES (BOM)</text>
       <text x="50" y="140" class="bom-text">1. Perfil ${RAIL_D}x${RAIL_W}mm: .... ${totalProfileMeters.toFixed(2)} m</text>
       <text x="50" y="200" class="bom-text">2. Peldaños: ............... ${numRungs} uds</text>
       <text x="50" y="260" class="bom-text">3. Soportes Pared: ......... ${numBrackets} uds</text>
       ${params.hasLanding ? `<text x="50" y="320" class="bom-text">4. Plataforma Intermedia: .. 1 ud (${PLAT_D}mm)</text>` : ''}
       ${params.hasTopLanding ? `<text x="50" y="380" class="bom-text">5. Kit Desembarco Sup.: .... 1 ud (${TOP_D}mm)</text>` : ''}
       ${params.hasCage ? `<text x="50" y="440" class="bom-text">6. Jaula Seguridad: ........ INSTALADA</text>` : ''}
    </g>
  </svg>`;
  
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `PLANO_${Math.floor(Math.random()*1000)}.svg`;
  link.click();
};

// ====================================================================
// 2. COMPONENTES UI
// ====================================================================
const NumberControl = ({ label, value, onChange, step = 0.1, min = 0, unit = '' }: any) => {
  const update = (val: number) => {
    const safeVal = Math.max(min, parseFloat(val.toFixed(3)));
    onChange(safeVal);
  };
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={{ display: 'block', fontSize: '0.85rem', color: '#555', marginBottom: '4px' }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <button onClick={() => update(value - step)} style={{ width: '30px', height: '30px', background: '#ddd', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
        <input type="number" value={value} onChange={(e) => update(parseFloat(e.target.value))} step={step} style={{ flex: 1, textAlign: 'center', height: '30px', border: '1px solid #ccc', borderRadius: '4px' }} />
        <button onClick={() => update(value + step)} style={{ width: '30px', height: '30px', background: '#ddd', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
        {unit && <span style={{ fontSize: '0.8rem', color: '#666', width: '25px' }}>{unit}</span>}
      </div>
    </div>
  );
};

// ====================================================================
// 3. COMPONENTES 3D Y COTAS
// ====================================================================

const Dimension3DBase = ({ start, end, text, color = "black" }: any) => {
  const s = new THREE.Vector3(...start);
  const e = new THREE.Vector3(...end);
  const points = [s, e];
  
  const tickSize = 0.05;
  const dir = new THREE.Vector3().subVectors(e, s).normalize();
  let perp = new THREE.Vector3(0, 1, 0); 
  if (Math.abs(dir.y) > 0.9) perp = new THREE.Vector3(1, 0, 0); 
  else if (Math.abs(dir.x) > 0.9) perp = new THREE.Vector3(0, 0, 1);
  else if (Math.abs(dir.z) > 0.9) perp = new THREE.Vector3(1, 0, 0);

  const tick1Start = s.clone().add(perp.clone().multiplyScalar(-tickSize));
  const tick1End = s.clone().add(perp.clone().multiplyScalar(tickSize));
  const tick2Start = e.clone().add(perp.clone().multiplyScalar(-tickSize));
  const tick2End = e.clone().add(perp.clone().multiplyScalar(tickSize));

  const mid = new THREE.Vector3().addVectors(s, e).multiplyScalar(0.5);

  return (
    <group>
      <Line points={points} color={color} lineWidth={1.5} transparent opacity={0.8} />
      <Line points={[tick1Start, tick1End]} color={color} lineWidth={1.5} transparent opacity={0.8} />
      <Line points={[tick2Start, tick2End]} color={color} lineWidth={1.5} transparent opacity={0.8} />
      <Text
        position={[mid.x, mid.y, mid.z]} color={color} fontSize={0.2}
        anchorX="center" anchorY="middle"
        outlineWidth={0.02} outlineColor="#ffffff"
      >
        {text}
      </Text>
    </group>
  );
};

const DraggableDimension = (props: any) => {
  return (
    <TransformControls mode="translate" size={0.5}>
      <group>
         <Dimension3DBase {...props} />
      </group>
    </TransformControls>
  );
};

const SceneDimensions = ({ params }: any) => {
  const { totalHeight: H, widthInner: Wi, railWidth: Rw, railDepth: Rd, pitch, wallDistance: Wd, offset, landingHeight: LH, platformDepth: PD, topLandingDepth: TD, hasExit, exitExtension, hasLanding, hasTopLanding } = params;

  const W_total = Wi + (Rw * 2);
  const ExitH = hasExit ? exitExtension : 0;
  const TotalH = H + ExitH;
  
  const dX2 = W_total/2 + 0.8; 
  const dX_Left = -W_total/2 - 0.3; 
  const dY_Below = -0.3; 
  const dZ_Front = Rd/2 + 0.3; 

  const baseColor = "#000000";
  const detailColor = "#444444"; 

  return (
    <group>
      {/* ALZADO */}
      <DraggableDimension start={[dX2, 0, 0]} end={[dX2, H, 0]} text={`H Útil: ${H.toFixed(2)}m`} color={baseColor} />
      {hasExit && (
        <DraggableDimension start={[dX2, H, 0]} end={[dX2, TotalH, 0]} text={`Salida: +${ExitH.toFixed(2)}m`} color={baseColor} />
      )}
      {hasLanding && (
        <DraggableDimension start={[dX_Left, 0, 0]} end={[dX_Left, LH, 0]} text={`Corte: ${LH.toFixed(2)}m`} color={baseColor} />
      )}

      {/* ANCHOS */}
      <DraggableDimension start={[-W_total/2, dY_Below, 0]} end={[W_total/2, dY_Below, 0]} text={`Ancho Total: ${W_total.toFixed(3)}m`} color={baseColor} />
      <DraggableDimension start={[-Wi/2, dY_Below + 0.15, 0]} end={[Wi/2, dY_Below + 0.15, 0]} text={`Luz: ${Wi.toFixed(3)}m`} color={detailColor} />

      {/* DETALLES */}
      <DraggableDimension start={[0, 0.15, 0]} end={[0, 0.15 + pitch, 0]} text={`Paso: ${pitch.toFixed(3)}m`} color={detailColor} />
      
      {/* PERFIL */}
      <group position={[W_total/2 + 0.1, 0, 0]}>
          <DraggableDimension start={[0, H/2, 0]} end={[0, H/2, -Wd]} text={`Pared: ${Wd.toFixed(2)}m`} color={baseColor} />
          <DraggableDimension start={[0, H/2 + 0.3, -Rd/2]} end={[0, H/2 + 0.3, Rd/2]} text={`Perfil: ${Rd.toFixed(3)}m`} color={detailColor} />
      </group>

      {/* SPLIT */}
      {hasLanding && (
        <group position={[offset/2, LH, 0]}>
           <DraggableDimension start={[W_total/2 + 0.1, 0, -Rd/2]} end={[W_total/2 + 0.1, 0, -Rd/2 + PD]} text={`Prof. Plat.: ${PD.toFixed(2)}m`} color={baseColor} />
           <DraggableDimension start={[-offset/2, -0.2, dZ_Front]} end={[offset/2, -0.2, dZ_Front]} text={`Offset: ${offset.toFixed(2)}m`} color={baseColor} />
        </group>
      )}

      {/* DESEMBARCO SUPERIOR */}
      {hasTopLanding && (
         <group position={[hasLanding ? offset : 0, H, 0]}>
            <DraggableDimension start={[W_total/2 + 0.1, 0, -Rd/2]} end={[W_total/2 + 0.1, 0, -Rd/2 + TD]} text={`Desembarco: ${TD.toFixed(2)}m`} color={baseColor} />
         </group>
      )}
    </group>
  );
};

// ====================================================================
// 4. COMPONENTES ESTRUCTURA 3D
// ====================================================================

const WallBracket = ({ y, side, width, wallDist }: any) => {
  const xPos = side * (width / 2 + 0.024/2); 
  return (
    <group position={[xPos, y, -wallDist/2]}>
       <mesh position={[0, 0, 0]} castShadow><boxGeometry args={[0.04, 0.04, wallDist]} /><meshStandardMaterial color="#555" /></mesh>
       <mesh position={[0, 0, -wallDist/2 + 0.005]}><boxGeometry args={[0.1, 0.15, 0.01]} /><meshStandardMaterial color="#444" /></mesh>
       <mesh position={[0, 0, wallDist/2 - 0.01]}><boxGeometry args={[0.05, 0.06, 0.05]} /><meshStandardMaterial color="#555" /></mesh>
    </group>
  )
}

const Rung = ({ position, width, size }: any) => (
  <mesh position={position} castShadow receiveShadow>
    <boxGeometry args={[width, size, size]} />
    <meshStandardMaterial color="#A0A0A0" roughness={0.5} metalness={0.7} />
  </mesh>
);

const Rail = ({ height, side, width, profileW, profileD }: any) => {
  const xPos = side * (width / 2 + profileW / 2);
  return (
    <mesh position={[xPos, height / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[profileW, height, profileD]} />
      <meshStandardMaterial color="#B0B0B0" roughness={0.3} metalness={0.5} />
    </mesh>
  );
};

const ExitHandrails = ({ position, width, height }: any) => {
  return (
    <group position={position}>
       {[-1, 1].map(side => (
         <group key={side} position={[side * (width/2 + 0.02), height, 0]}>
            <mesh position={[0, 0.5, 0]}><boxGeometry args={[0.04, 1.0, 0.04]} /><meshStandardMaterial color="#999" /></mesh>
            <mesh position={[0, 1.0, -0.2]} rotation={[Math.PI/4, 0, 0]}><boxGeometry args={[0.04, 0.6, 0.04]} /><meshStandardMaterial color="#999" /></mesh>
         </group>
       ))}
    </group>
  );
};

const SmartPlatform = ({ position, width, offset, depth }: any) => {
  const platformThickness = 0.05;
  const railDepth = 0.065; 
  const railH = 1.1;       
  const backZ = -railDepth / 2;
  const centerZ = backZ + (depth / 2);
  const startX = width / 2;
  const endX = offset + width / 2 + 0.05; 
  const platLength = endX - startX;
  const centerX = startX + platLength / 2;

  return (
    <group position={position}>
      {/* Suelo */}
      <mesh position={[centerX, -platformThickness/2, centerZ]} receiveShadow castShadow>
         <boxGeometry args={[platLength, platformThickness, depth]} />
         <meshStandardMaterial color="#555" roughness={0.8} />
      </mesh>
      {/* Rodapies */}
      <mesh position={[centerX, 0.1, backZ + depth - 0.01]}><boxGeometry args={[platLength, 0.2, 0.02]} /><meshStandardMaterial color="#333" /></mesh>
      <mesh position={[centerX, 0.1, backZ + 0.01]}><boxGeometry args={[platLength, 0.2, 0.02]} /><meshStandardMaterial color="#333" /></mesh>
      <mesh position={[endX - 0.01, 0.1, centerZ]}><boxGeometry args={[0.02, 0.2, depth]} /><meshStandardMaterial color="#333" /></mesh>
      <group position={[centerX, 0, backZ + depth - 0.02]}>
          <mesh position={[-platLength/2 + 0.02, railH/2, 0]}><boxGeometry args={[0.04, railH, 0.04]} /><meshStandardMaterial color="#999"/></mesh>
          <mesh position={[platLength/2 - 0.02, railH/2, 0]}><boxGeometry args={[0.04, railH, 0.04]} /><meshStandardMaterial color="#999"/></mesh>
          <mesh position={[0, railH, 0]}><boxGeometry args={[platLength, 0.04, 0.04]} /><meshStandardMaterial color="#999"/></mesh>
          <mesh position={[0, railH/2, 0]}><boxGeometry args={[platLength, 0.02, 0.02]} /><meshStandardMaterial color="#999"/></mesh>
      </group>
      <group position={[centerX, 0, backZ + 0.02]}>
          <mesh position={[-platLength/2 + 0.02, railH/2, 0]}><boxGeometry args={[0.04, railH, 0.04]} /><meshStandardMaterial color="#999"/></mesh>
          <mesh position={[platLength/2 - 0.02, railH/2, 0]}><boxGeometry args={[0.04, railH, 0.04]} /><meshStandardMaterial color="#999"/></mesh>
          <mesh position={[0, railH, 0]}><boxGeometry args={[platLength, 0.04, 0.04]} /><meshStandardMaterial color="#999"/></mesh>
          <mesh position={[0, railH/2, 0]}><boxGeometry args={[platLength, 0.02, 0.02]} /><meshStandardMaterial color="#999"/></mesh>
      </group>
      <group position={[endX - 0.02, 0, centerZ]}>
          <mesh position={[0, railH, 0]}><boxGeometry args={[0.04, 0.04, depth]} /><meshStandardMaterial color="#999"/></mesh>
          <mesh position={[0, railH/2, 0]}><boxGeometry args={[0.02, 0.02, depth]} /><meshStandardMaterial color="#999"/></mesh>
      </group>
    </group>
  );
};

const TopLanding = ({ position, width, depth }: any) => {
  const railingHeight = 1.1;
  const diagLength = Math.sqrt(Math.pow(depth, 2) + Math.pow(railingHeight, 2));
  const angle = Math.atan(railingHeight / depth);

  return (
    <group position={position}>
      <mesh position={[0, 0, -depth / 2]} receiveShadow><boxGeometry args={[width + 0.1, 0.05, depth]} /><meshStandardMaterial color="#444" roughness={0.9} /></mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (width / 2 + 0.05), 0, -depth / 2]}>
          <mesh position={[0, railingHeight / 2, 0]}><boxGeometry args={[0.04, railingHeight, depth]} /><meshStandardMaterial color="#B0B0B0" wireframe /></mesh>
          <mesh position={[0, railingHeight, 0]}><boxGeometry args={[0.04, 0.04, depth]} /><meshStandardMaterial color="#B0B0B0" /></mesh>
          <group position={[0, railingHeight/2, 0]}>
             <mesh rotation={[angle, 0, 0]}><boxGeometry args={[0.02, 0.02, diagLength]} /><meshStandardMaterial color="#888" /></mesh>
             <mesh rotation={[-angle, 0, 0]}><boxGeometry args={[0.02, 0.02, diagLength]} /><meshStandardMaterial color="#888" /></mesh>
          </group>
        </group>
      ))}
    </group>
  );
};

const SafetyCage = ({ height, startHeight, width }: any) => {
  const zOffset = 0.35;    
  const hoops = [];
  for(let y=startHeight; y<height; y+=0.9) hoops.push(y);

  return (
    <group>
      {hoops.map((y, i) => (
        <group key={i} position={[0, y, 0]}>
           <mesh rotation={[Math.PI/2, 0, 0]} position={[0, 0, zOffset]}>
             <torusGeometry args={[width/2 + 0.05, 0.015, 8, 32, Math.PI*1.3]} />
             <meshStandardMaterial color="#999" />
           </mesh>
        </group>
      ))}
      {[-0.6, -0.3, 0, 0.3, 0.6].map((a, i) => (
         <mesh key={i} position={[Math.sin(a)*0.4, (height+startHeight)/2, Math.cos(a)*0.4 + 0.35]}>
            <boxGeometry args={[0.02, height-startHeight, 0.005]} />
            <meshStandardMaterial color="#888" />
         </mesh>
      ))}
    </group>
  );
};

const LadderSection = ({ height, startY, startX, config, isTopSection, isBottomSectionInSplit }: any) => {
  const { pitch, rungSize, widthInner, railWidth, railDepth, exitExtension, hasCage, hasHandrails, wallDistance, supports, cageStartHeight } = config;
  const rungs = [];
  let curY = 0.15;
  while(curY < height) { rungs.push(curY); curY += pitch; }
  let railH = height;
  if (isTopSection && config.hasExit) railH += exitExtension;
  else if (isBottomSectionInSplit) railH += 1.1;
  
  // LOGICA CORREGIDA DE INICIO DE JAULA:
  // Si la escalera empieza en el suelo (startY == 0), usa la altura configurada (ej. 2m).
  // Si empieza en una plataforma (split), empieza inmediatamente (0).
  const cageStart = (startY === 0 && cageStartHeight) ? cageStartHeight : 0;
  
  const showCage = hasCage && (height > cageStart);

  return (
    <group position={[startX, startY, 0]}>
      <Rail height={railH} side={-1} width={widthInner} profileW={railWidth} profileD={railDepth} />
      <Rail height={railH} side={1} width={widthInner} profileW={railWidth} profileD={railDepth} />
      {rungs.map((y, i) => <Rung key={i} position={[0, y, 0]} width={widthInner} size={rungSize} />)}
      {showCage && <SafetyCage height={railH} startHeight={cageStart} width={widthInner} />}
      {isTopSection && hasHandrails && <ExitHandrails position={[0, 0, 0]} width={widthInner} height={railH} />}
      {supports.map((supH: number, i: number) => {
         const relativeH = supH - startY; 
         if (relativeH >= 0 && relativeH <= railH) {
             return (
                 <group key={`sup-${i}`}>
                    <WallBracket y={relativeH} side={-1} width={widthInner} wallDist={wallDistance} />
                    <WallBracket y={relativeH} side={1} width={widthInner} wallDist={wallDistance} />
                 </group>
             )
         }
         return null;
      })}
    </group>
  );
};

// ====================================================================
// 5. APP PRINCIPAL
// ====================================================================

export default function App() {
  const [isSnapshot, setIsSnapshot] = useState(false);
  const [showDimensions, setShowDimensions] = useState(false); // Estado COTAS
  
  const [params, setParams] = useState({
    totalHeight: 5.0, widthInner: 0.588, pitch: 0.300,
    railWidth: 0.024, railDepth: 0.065, rungSize: 0.0295,
    wallDistance: 0.200, supports: [1.5, 4.0],
    hasExit: true, exitExtension: 1.150, hasHandrails: false,
    hasLanding: false, landingHeight: 2.5, offset: 0.8, platformDepth: 0.8,
    hasCage: true, cageStartHeight: 2.0, // NUEVO PARÁMETRO: Altura inicio jaula
    hasTopLanding: true, topLandingDepth: 1.0 
  });

  const addSupport = () => setParams({...params, supports: [...params.supports, 2.0]});
  const removeSupport = (idx: number) => {
     const newSup = [...params.supports];
     newSup.splice(idx, 1);
     setParams({...params, supports: newSup});
  }
  const updateSupport = (idx: number, val: number) => {
     const newSup = [...params.supports];
     newSup[idx] = val;
     setParams({...params, supports: newSup});
  }

  const handleCapture = () => {
    setIsSnapshot(true); // Ocultar suelo
    setTimeout(() => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        const link = document.createElement('a');
        link.download = `escalera_v16_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
      setIsSnapshot(false); // Restaurar suelo
    }, 100);
  };

  const toggleDimensions = () => {
    setShowDimensions(!showDimensions);
  };

  let bottomH = params.totalHeight;
  let topH = 0;
  let topStartX = 0;

  if (params.hasLanding) {
    bottomH = params.landingHeight;
    topH = params.totalHeight - params.landingHeight;
    if (topH < 0) topH = 0;
    topStartX = params.offset;
  }

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', fontFamily: 'Segoe UI, sans-serif' }}>
      
      {/* SIDEBAR */}
      <div style={{ width: '420px', background: '#f4f4f4', borderRight: '1px solid #ccc', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ padding: '20px', background: '#333', color: 'white' }}>
          <h2 style={{ margin: 0 }}>Configurador v16.6</h2>
          <small>Corrección Jaula (Inicio Variable)</small>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          <details open>
            <summary style={{fontWeight:'bold', cursor:'pointer'}}>1. Dimensiones</summary>
            <div style={{padding:'10px', background:'#fff', border:'1px solid #ddd', marginTop:'5px'}}>
               <NumberControl label="Altura Total (m)" value={params.totalHeight} onChange={(v:number)=>setParams({...params, totalHeight:v})} step={0.1} unit="m" />
               <NumberControl label="Ancho Interior (m)" value={params.widthInner} onChange={(v:number)=>setParams({...params, widthInner:v})} step={0.01} unit="m" />
               <NumberControl label="Paso Peldaño (m)" value={params.pitch} onChange={(v:number)=>setParams({...params, pitch:v})} step={0.005} unit="m" />
            </div>
          </details>

          <details>
             <summary style={{fontWeight:'bold', cursor:'pointer', color:'#d32f2f'}}>2. Soportes</summary>
             <div style={{padding:'10px', background:'#fff', border:'1px solid #ddd', marginTop:'5px'}}>
               <NumberControl label="Distancia Pared" value={params.wallDistance} onChange={(v:number)=>setParams({...params, wallDistance:v})} step={0.01} unit="m" />
               <strong>Alturas Soportes (m):</strong>
               {params.supports.map((h, i) => (
                    <div key={i} style={{display:'flex', gap:'5px', marginBottom:'5px', alignItems:'center'}}>
                       <button onClick={() => updateSupport(i, Math.max(0, parseFloat((h - 0.1).toFixed(2))))} style={{width:'30px', height:'30px', background:'#ddd', border:'none', borderRadius:'4px'}}>-</button>
                       <input type="number" step="0.1" value={h} onChange={e => updateSupport(i, parseFloat(e.target.value))} style={{flex:1, textAlign:'center', height:'30px', border:'1px solid #ccc', borderRadius:'4px'}} />
                       <button onClick={() => updateSupport(i, parseFloat((h + 0.1).toFixed(2)))} style={{width:'30px', height:'30px', background:'#ddd', border:'none', borderRadius:'4px'}}>+</button>
                       <button onClick={() => removeSupport(i)} style={{background:'#e57373', color:'white', border:'none', cursor:'pointer', height:'30px', borderRadius:'4px'}}>X</button>
                    </div>
                  ))}
                  <button onClick={addSupport} style={{width:'100%', padding:'5px', marginTop:'5px', background:'#ddd', cursor:'pointer'}}>+ Añadir Altura</button>
             </div>
          </details>

          <details>
             <summary style={{fontWeight:'bold', cursor:'pointer'}}>3. Descansillo (Split)</summary>
             <div style={{padding:'10px', background:'#e3f2fd', border:'1px solid #90caf9', marginTop:'5px'}}>
                <label style={{display:'block', fontWeight:'bold', marginBottom:'10px'}}><input type="checkbox" checked={params.hasLanding} onChange={e=>setParams({...params, hasLanding:e.target.checked})}/> Activar Split</label>
                {params.hasLanding && (
                   <div>
                      <NumberControl label="Altura Corte" value={params.landingHeight} onChange={(v:number)=>setParams({...params, landingHeight:v})} step={0.1} unit="m" />
                      <NumberControl label="Offset Lateral" value={params.offset} onChange={(v:number)=>setParams({...params, offset:v})} step={0.1} unit="m" />
                      <NumberControl label="Prof. Plataforma" value={params.platformDepth} onChange={(v:number)=>setParams({...params, platformDepth:v})} step={0.1} unit="m" />
                   </div>
                )}
             </div>
          </details>

          <details>
             <summary style={{fontWeight:'bold', cursor:'pointer'}}>4. Desembarco (Top)</summary>
             <div style={{padding:'10px', background:'#e8f5e9', border:'1px solid #a5d6a7', marginTop:'5px'}}>
                <label style={{display:'block', fontWeight:'bold', marginBottom:'10px'}}><input type="checkbox" checked={params.hasTopLanding} onChange={e=>setParams({...params, hasTopLanding:e.target.checked})}/> Activar Desembarco</label>
                {params.hasTopLanding && (
                    <NumberControl label="Longitud" value={params.topLandingDepth} onChange={(v:number)=>setParams({...params, topLandingDepth:v})} step={0.1} unit="m" />
                )}
             </div>
          </details>

          <details>
             <summary style={{fontWeight:'bold', cursor:'pointer'}}>5. Seguridad</summary>
             <div style={{padding:'10px', background:'#fff', border:'1px solid #ddd', marginTop:'5px'}}>
                <label style={{display:'block', marginBottom:'5px'}}><input type="checkbox" checked={params.hasCage} onChange={e=>setParams({...params, hasCage:e.target.checked})}/> Jaula de Seguridad</label>
                
                {/* --- NUEVO CONTROL DE INICIO DE JAULA --- */}
                {params.hasCage && (
                  <div style={{marginLeft:'20px', borderLeft:'2px solid #ccc', paddingLeft:'10px'}}>
                     <NumberControl label="Inicio Jaula (m)" value={params.cageStartHeight} onChange={(v:number)=>setParams({...params, cageStartHeight:v})} step={0.1} unit="m" />
                  </div>
                )}
                {/* ---------------------------------------- */}

                <hr/>
                <label style={{display:'block', marginBottom:'5px'}}><input type="checkbox" checked={params.hasExit} onChange={e=>setParams({...params, hasExit:e.target.checked})}/> Salida (+1.15m)</label>
                {params.hasExit && <NumberControl label="Extension Extra" value={params.exitExtension} onChange={(v:number)=>setParams({...params, exitExtension:v})} step={0.1} unit="m" />}
                <label style={{display:'block'}}><input type="checkbox" checked={params.hasHandrails} onChange={e=>setParams({...params, hasHandrails:e.target.checked})}/> Bastones Salida</label>
             </div>
          </details>

          <div style={{ marginTop:'20px', paddingBottom:'20px' }}>
            <div style={{ display: 'flex', gap: '5px', marginBottom:'5px'}}>
              <button 
                onClick={toggleDimensions} 
                style={{ flex: 1, padding: '15px', background: showDimensions ? '#ff9800' : '#ddd', color: showDimensions ? 'white' : 'black', border:'none', fontWeight:'bold', cursor:'pointer', borderRadius:'6px' }}
              >
                {showDimensions ? '👁️ OCULTAR COTAS' : '📏 VER COTAS'}
              </button>
              <button onClick={handleCapture} style={{ flex: 1, padding: '15px', background: '#4caf50', color: 'white', border:'none', fontWeight:'bold', cursor:'pointer', borderRadius:'6px' }}>📸 FOTO</button>
            </div>
            <p style={{fontSize:'0.8rem', color:'#666', textAlign:'center', margin:'5px 0'}}>* Activa cotas, arrástralas y luego haz la foto.</p>
            <button onClick={() => generateSVG(params)} style={{ width: '100%', padding: '15px', background: '#1976d2', color: 'white', border:'none', fontWeight:'bold', cursor:'pointer', borderRadius:'6px' }}>📐 PLANO</button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, background: '#e0e0e0', position: 'relative' }}>
        <Canvas shadows camera={{ position: [5, 5, 8], fov: 50 }} gl={{ preserveDrawingBuffer: true, alpha: true }}>
          
          {/* LUCES MANUALES + AMBIENTE (REEMPLAZA A STAGE Y CENTER) */}
          <ambientLight intensity={0.7} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
          <Environment preset="city" />

          {/* GRUPO PRINCIPAL MANUALMENTE POSICIONADO EN 0,0,0 */}
          <group position={[0, 0, 0]}>
             <LadderSection 
                height={bottomH} startY={0} startX={0} config={params}
                isTopSection={!params.hasLanding} isBottomSectionInSplit={params.hasLanding}
             />
             {params.hasLanding && (
               <>
                 <SmartPlatform position={[0, bottomH, 0]} width={params.widthInner} offset={params.offset} depth={params.platformDepth} />
                 <LadderSection 
                   height={topH} startY={bottomH} startX={params.offset} config={params}
                   isTopSection={true} isBottomSectionInSplit={false}
                 />
               </>
             )}
             {params.hasTopLanding && (
               <TopLanding position={[topStartX, params.totalHeight, 0]} width={params.widthInner} depth={params.topLandingDepth} />
             )}

             {/* LAS COTAS YA NO ROMPEN LA CÁMARA PORQUE NO HAY AUTO-CENTER */}
             {showDimensions && <SceneDimensions params={params} />}
          </group>
          
          {!isSnapshot && (
            <>
              <ContactShadows position={[0, -0.01, 0]} opacity={0.5} scale={10} blur={2.5} far={4} />
              <Grid position={[0, -0.05, 0]} infiniteGrid fadeDistance={25} sectionColor="#999" cellColor="#ccc" />
            </>
          )}

          {/* ORBIT CONTROLS APUNTANDO AL CENTRO DE LA ESCALERA AUTOMÁTICAMENTE */}
          <OrbitControls makeDefault target={[params.offset/2, params.totalHeight/2, 0]} />
        </Canvas>
      </div>
    </div>
  );
}
