import React, { useRef, useState, useEffect } from 'react';

// Using functional component architecture
export default function Sprite3DViewer({ modelPrefix = 'current' }) {
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  
  // State: image map
  const [images, setImages] = useState(new Map());
  const [loadedCount, setLoadedCount] = useState(0);
  const totalFrames = 109; // 36 * 3 + 1
  
  // State: interaction
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentFrame, setCurrentFrame] = useState(1); // 1 to 36
  const [currRow, setCurrRow] = useState(0); // 0: eye-level, 1: high (45), -1: low (-45), 2: top
  const [zoom, setZoom] = useState(1);
  const [isMagnifier, setIsMagnifier] = useState(false);
  
  const generateSpriteUrl = (row, frame) => {
    let rowStr = '0';
    if (row === 1) rowStr = '45';
    if (row === -1) rowStr = 'n45';
    if (row === 2) return `/${modelPrefix}_top_001.webp`;
    
    // pad frame to 3 chars
    const frameStr = frame.toString().padStart(3, '0');
    return `/${modelPrefix}_${rowStr}_${frameStr}.webp`;
  };

  useEffect(() => {
    // Generate all URLs
    const allUrls = [];
    // Priority: 0, 1, -1, 2
    [0, 1, -1].forEach(row => {
      for (let frame = 1; frame <= 36; frame++) {
        allUrls.push(generateSpriteUrl(row, frame));
      }
    });
    allUrls.push(generateSpriteUrl(2, 1));

    const worker = new Worker(new URL('../workers/sprite-preloader.worker.js', import.meta.url));
    
    worker.onmessage = (e) => {
      if (e.data.type === 'PROGRESS') {
        const { url, bitmap } = e.data;
        setImages(prev => {
          const next = new Map(prev);
          next.set(url, bitmap);
          return next;
        });
        setLoadedCount(prev => prev + 1);
      }
    };

    worker.postMessage({ urls: allUrls });

    return () => worker.terminate();
  }, [modelPrefix]);

  // Render loop
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    ctx.clearRect(0, 0, width, height);

    const url = generateSpriteUrl(currRow, currentFrame);
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
      // Draw placeholder
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = 'var(--text-3)';
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (loadedCount < 36) {
         ctx.fillText(`Loading Assets... ${Math.round((loadedCount/totalFrames)*100)}%`, width / 2, height / 2);
      } else {
         // Create a synthetic placeholder visually approximating a skeleton
         ctx.beginPath();
         ctx.ellipse(width/2, height/2 - 50, 40, 60, 0, 0, 2*Math.PI);
         ctx.fillStyle = 'rgba(14, 165, 233, 0.1)';
         ctx.fill();
         ctx.beginPath();
         ctx.ellipse(width/2, height/2 + 70, 70, 110, 0, 0, 2*Math.PI);
         ctx.fill();
         
         ctx.fillStyle = 'var(--text-3)';
         ctx.fillText(`Missing 360° asset: fallback rendered`, width / 2, height - 30);
         ctx.fillText(`[Row ${currRow}, Frame ${currentFrame}]`, width/2, height - 10);
      }
    }
  }, [currentFrame, currRow, images, loadedCount, modelPrefix]);

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
