import React, { useRef, useState, useEffect } from 'react';

function drawFallbackBody(ctx, width, height, row, frame, statusLabel) {
  const cx = width / 2;
  const cy = height / 2 + 18;
  const angle = ((frame - 1) / 36) * Math.PI * 2;
  const facing = 0.38 + Math.abs(Math.cos(angle)) * 0.62;
  const elevation = row === 2 ? 0.62 : row === 1 ? 0.9 : row === -1 ? 1.08 : 1;
  const skin = ctx.createLinearGradient(cx - 110, cy - 260, cx + 120, cy + 280);
  skin.addColorStop(0, '#d7a782');
  skin.addColorStop(0.46, '#b97756');
  skin.addColorStop(1, '#754733');

  ctx.save();
  const backdrop = ctx.createRadialGradient(cx, cy - 70, 20, cx, cy, height * 0.48);
  backdrop.addColorStop(0, 'rgba(35, 45, 61, 0.92)');
  backdrop.addColorStop(0.58, 'rgba(13, 17, 24, 0.98)');
  backdrop.addColorStop(1, '#08090d');
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(103, 232, 249, 0.12)';
  ctx.lineWidth = 2;
  for (const radius of [150, 220, 290]) {
    ctx.beginPath();
    ctx.ellipse(cx, cy + 270, radius, radius * 0.18, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.055)';
  ctx.beginPath();
  ctx.moveTo(cx, 42);
  ctx.lineTo(cx, height - 46);
  ctx.stroke();

  ctx.translate(cx, cy);
  ctx.scale(1, elevation);
  ctx.shadowColor = 'rgba(34, 211, 238, 0.18)';
  ctx.shadowBlur = 28;
  ctx.fillStyle = skin;
  ctx.strokeStyle = skin;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const shoulder = 94 * facing;
  const waist = 54 * facing;
  const hip = 67 * facing;
  const headWidth = 38 * (0.72 + facing * 0.28);

  ctx.beginPath();
  ctx.ellipse(0, -244, headWidth, 49, angle, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-16 * facing, -205, 32 * facing, 27);

  ctx.beginPath();
  ctx.moveTo(-18 * facing, -188);
  ctx.bezierCurveTo(-shoulder * .55, -187, -shoulder, -168, -shoulder, -145);
  ctx.bezierCurveTo(-shoulder * .9, -91, -waist, -64, -waist, 7);
  ctx.bezierCurveTo(-waist, 38, -hip, 54, -hip, 70);
  ctx.lineTo(hip, 70);
  ctx.bezierCurveTo(hip, 54, waist, 38, waist, 7);
  ctx.bezierCurveTo(waist, -64, shoulder * .9, -91, shoulder, -145);
  ctx.bezierCurveTo(shoulder, -168, shoulder * .55, -187, 18 * facing, -188);
  ctx.closePath();
  ctx.fill();

  ctx.lineWidth = 25;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * shoulder * .88, -151);
    ctx.lineTo(side * (shoulder + 24), -57);
    ctx.lineTo(side * (shoulder + 15), 35);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(side * (shoulder + 14), 48, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.lineWidth = 35;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * hip * .56, 61);
    ctx.lineTo(side * (hip * .63), 174);
    ctx.lineTo(side * (hip * .60), 272);
    ctx.stroke();
  }
  ctx.lineWidth = 22;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * hip * .60, 268);
    ctx.lineTo(side * (hip * .67 + 7), 282);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(66, 41, 35, 0.26)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -170);
  ctx.lineTo(0, 54);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = 'rgba(8, 12, 18, 0.78)';
  ctx.fillRect(22, height - 62, width - 44, 36);
  ctx.fillStyle = '#dbeafe';
  ctx.font = '600 13px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(statusLabel, cx, height - 44);
}

// Pure function — no closure over component state, stale closure safe
function generateSpriteUrl(modelPrefix, row, frame) {
  let rowStr = '0';
  if (row === 1) rowStr = '45';
  if (row === -1) rowStr = 'n45';
  if (row === 2) return `/${modelPrefix}_top_001.webp`;
  const frameStr = frame.toString().padStart(3, '0');
  return `/${modelPrefix}_${rowStr}_${frameStr}.webp`;
}

// Using functional component architecture
export default function Sprite3DViewer({ modelPrefix = 'current' }) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  
  // State: image map
  const [images, setImages] = useState(new Map());
  const [loadedCount, setLoadedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [loadComplete, setLoadComplete] = useState(() => typeof Worker === 'undefined');
  const totalFrames = 109; // 36 * 3 + 1
  
  // State: interaction
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentFrame, setCurrentFrame] = useState(1); // 1 to 36
  const [currRow, setCurrRow] = useState(0); // 0: eye-level, 1: high (45), -1: low (-45), 2: top
  const [zoom, setZoom] = useState(1);
  const [isMagnifier, setIsMagnifier] = useState(false);
  

  useEffect(() => {
    // Generate all URLs — use pure fn with explicit modelPrefix to avoid stale closures
    const allUrls = [];
    // Priority: 0, 1, -1, 2
    [0, 1, -1].forEach(row => {
      for (let frame = 1; frame <= 36; frame++) {
        allUrls.push(generateSpriteUrl(modelPrefix, row, frame));
      }
    });
    allUrls.push(generateSpriteUrl(modelPrefix, 2, 1));

    if (typeof Worker === 'undefined') {
      return undefined;
    }

    const worker = new Worker(new URL('../workers/sprite-preloader.worker.js', import.meta.url));
    const bitmaps = new Set();
    
    worker.onmessage = (e) => {
      if (e.data.type === 'PROGRESS') {
        const { url, bitmap } = e.data;
        bitmaps.add(bitmap);
        setImages(prev => {
          const next = new Map(prev);
          next.set(url, bitmap);
          return next;
        });
        setLoadedCount(prev => prev + 1);
      } else if (e.data.type === 'ERROR') {
        setFailedCount(prev => prev + 1);
      } else if (e.data.type === 'COMPLETE') {
        setLoadComplete(true);
      }
    };

    worker.postMessage({ urls: allUrls });

    return () => {
      worker.terminate();
      bitmaps.forEach((bitmap) => bitmap.close?.());
      bitmaps.clear();
    };
  }, [modelPrefix]);

  // Render loop
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    ctx.clearRect(0, 0, width, height);

    const url = generateSpriteUrl(modelPrefix, currRow, currentFrame);
    const img = images.get(url);
    
    if (img) {
      const cx = width / 2;
      const cy = height / 2;
      const w = img.width;
      const h = img.height;
      const scale = Math.min(width / w, height / h);
      const drawW = w * scale;
      const drawH = h * scale;
      const dx = cx - drawW / 2;
      const dy = cy - drawH / 2;
      
      ctx.save();
      ctx.drawImage(img, dx, dy, drawW, drawH);
      
      // Magnifier Logic
      if (isMagnifier) {
        const lensRadius = 100;
        const zoomFactor = 3;
        
        // Use normalized relative coordinates from startPos (which is updated during move)
        const rect = canvasRef.current.getBoundingClientRect();
        const mouseX = (startPos.x - rect.left) * (width / rect.width);
        const mouseY = (startPos.y - rect.top) * (height / rect.height);

        ctx.beginPath();
        ctx.arc(mouseX, mouseY, lensRadius, 0, Math.PI * 2);
        ctx.clip();
        
        // Draw zoomed portion
        // Source rect around mouse
        const sw = (lensRadius * 2) / zoomFactor / scale;
        const sh = (lensRadius * 2) / zoomFactor / scale;
        const sx = (mouseX - dx) / scale - sw / 2;
        const sy = (mouseY - dy) / scale - sh / 2;
        
        ctx.drawImage(img, sx, sy, sw, sh, mouseX - lensRadius, mouseY - lensRadius, lensRadius * 2, lensRadius * 2);
        
        // Lens border
        ctx.restore();
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, lensRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'var(--accent)';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Lens reflection highlight
        const grad = ctx.createRadialGradient(mouseX - 30, mouseY - 30, 0, mouseX, mouseY, lensRadius);
        grad.addColorStop(0, 'rgba(255,255,255,0.2)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fill();
      } else {
        ctx.restore();
      }
    } else {
      const settled = loadedCount + failedCount;
      const status = loadComplete || failedCount > 0
        ? 'Interactive body fallback · drag to rotate'
        : `Preparing 2D body view · ${Math.round((settled / totalFrames) * 100)}%`;
      drawFallbackBody(ctx, width, height, currRow, currentFrame, status);
    }
  }, [currentFrame, currRow, failedCount, images, isMagnifier, loadComplete, loadedCount, modelPrefix, startPos.x, startPos.y]);

  const handlePointerDown = (e) => {
    setIsDragging(true);
    setStartPos({ x: e.clientX, y: e.clientY });
  };

  const handlePointerMove = (e) => {
    if (isMagnifier) {
      setStartPos({ x: e.clientX, y: e.clientY });
    }
    if (!isDragging) return;
    
    const dx = e.clientX - startPos.x;
    const dy = e.clientY - startPos.y;
    
    // Sensitivity thresholds
    if (Math.abs(dx) > 10) {
      // Move horizontal -> change frame
      const step = dx > 0 ? -1 : 1;
      let nextFrame = currentFrame + step;
      if (nextFrame > 36) nextFrame = 1;
      if (nextFrame < 1) nextFrame = 36;
      setCurrentFrame(nextFrame);
      setStartPos({ x: e.clientX, y: startPos.y }); // reset X but keep Y
    }
    
    if (Math.abs(dy) > 40) {
      // Move vertical -> change row
      const step = dy > 0 ? -1 : 1; // Down drag -> lower row, Up drag -> higher row
      
      let nextRow = currRow + step;
      // valid rows: -1, 0, 1, 2
      if (nextRow > 2) nextRow = 2;
      if (nextRow < -1) nextRow = -1;
      
      setCurrRow(nextRow);
      setStartPos({ x: startPos.x, y: e.clientY }); // reset Y but keep X
    }
  };

  const handlePointerUp = () => setIsDragging(false);
  
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.min(Math.max(1, prev + zoomDelta), 3));
  };
  
  const handleDoubleClick = () => {
    // 8K Magnifying glass toggle
    setIsMagnifier(!isMagnifier);
  };

  return (
    <div 
      ref={wrapperRef}
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative', 
        overflow: 'hidden',
        cursor: isMagnifier ? 'crosshair' : isDragging ? 'grabbing' : 'grab',
        touchAction: 'none'
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      role="img"
      aria-label="Interactive two-dimensional physique fallback. Drag horizontally to rotate and use the mouse wheel to zoom."
    >
      <canvas 
        ref={canvasRef}
        width={800}
        height={800}
        style={{
           width: '100%',
           height: '100%',
           objectFit: 'contain',
           transform: `scale(${zoom})`,
           transformOrigin: 'center center',
           transition: isDragging ? 'none' : 'transform 0.1s ease-out',
        }}
      />
      
      {/* UI Overlays */}
      <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', flexDirection: 'column', gap: 5, pointerEvents: 'none' }}>
        <span style={{ fontSize: '0.65rem', background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: 4, color: 'var(--text-1)' }}>
          Rot: {currRow === -1 ? '-45°' : currRow === 0 ? '0°' : currRow === 1 ? '45°' : 'Top'} 
        </span>
        <span style={{ fontSize: '0.65rem', background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: 4, color: 'var(--text-1)' }}>
          Zoom: {zoom.toFixed(1)}x
        </span>
        {isMagnifier && (
          <span style={{ fontSize: '0.65rem', background: 'var(--accent)', color: 'white', padding: '4px 8px', borderRadius: 4, fontWeight: 'bold' }}>
            8K LOUPE
          </span>
        )}
      </div>
      
      <div style={{ position: 'absolute', bottom: 10, width: '100%', textAlign: 'center', pointerEvents: 'none' }}>
         <div style={{ display: 'inline-flex', gap: 4 }}>
           {Array.from({ length: 36 }).map((_, i) => (
             <div key={i} style={{ 
               width: i + 1 === currentFrame ? 12 : 4,
               height: 4, 
               background: i + 1 === currentFrame ? 'var(--accent)' : 'rgba(255,255,255,0.2)',
               borderRadius: 2,
               transition: 'width 0.2s'
             }} />
           ))}
         </div>
      </div>
      
    </div>
  );
}
