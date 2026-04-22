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
    // Priority loading sequence
    const loadImages = async () => {
      const newImages = new Map();
      let loaded = 0;
      
      const loadImg = (row, frame) => {
        return new Promise((resolve) => {
          const url = generateSpriteUrl(row, frame);
          const img = new Image();
          img.src = url;
          img.onload = () => {
            newImages.set(url, img);
            loaded++;
            setLoadedCount(loaded);
            resolve();
          };
          img.onerror = () => {
            // Provide a graceful fallback or empty image map entry if it fails
            newImages.set(url, null);
            loaded++;
            setLoadedCount(loaded);
            resolve();
          };
        });
      };

      // Priority 1: eye-level (row 0)
      const tasksEyeLevel = Array.from({ length: 36 }, (_, i) => loadImg(0, i + 1));
      await Promise.allSettled(tasksEyeLevel);
      setImages(new Map(newImages));

      // Priority 2: high-angle (row 1)
      const tasksHigh = Array.from({ length: 36 }, (_, i) => loadImg(1, i + 1));
      await Promise.allSettled(tasksHigh);
      setImages(new Map(newImages));

      // Priority 3: low-angle (row -1)
      const tasksLow = Array.from({ length: 36 }, (_, i) => loadImg(-1, i + 1));
      await Promise.allSettled(tasksLow);
      
      // Priority 4: top (row 2)
      await loadImg(2, 1);
      
      setImages(new Map(newImages));
    };

    // To simulate background worker, we just run the async promise
    loadImages();
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
      // Draw actual loaded image
      const cx = width / 2;
      const cy = height / 2;
      const w = img.width;
      const h = img.height;
      
      // fit drawing inside canvas depending on aspect ratio
      const scale = Math.min(width / w, height / h);
      const drawW = w * scale;
      const drawH = h * scale;
      ctx.drawImage(img, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
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
