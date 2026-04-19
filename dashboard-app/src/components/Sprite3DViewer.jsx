import React, { useState, useEffect, useRef, useCallback } from "react";

/**
 * ─────────────────────────────────────────────────────────────────
 * HIGH-END SPRITE 3D VIEWER (MEGA FEATURE - PHASE 1)
 * ─────────────────────────────────────────────────────────────────
 * Handles hemispherical image sequences (Rows × Cols).
 * Enables photorealistic 360 spins without 3D WebGL overhead.
 */
export default function Sprite3DViewer({ 
  basePath = "/360_assets/desired", 
  rowCount = 3,         // 3 Rows: High, Eye-Level, Low
  framesPerRow = 36,    // 36 frames = 10deg increments
  fallbackImage = "/target_blueprint.png" // Fallback if assets don't exist yet
}) {
  const containerRef = useRef(null);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  
  // Coordinate Matrix States
  const [activeRow, setActiveRow] = useState(1); // Default to Eye-Level (middle row)
  const [activeFrame, setActiveFrame] = useState(0); // Front view
  
  // Internal Refs for smooth dragging
  const dragRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    startFrame: 0,
    startRow: 1,
  });

  // Pre-load all images into browser cache
  useEffect(() => {
    let imagesLoaded = 0;
    const totalImages = rowCount * framesPerRow;
    const cache = [];

    // Simulate preloading structure
    // If the actual files don't exist yet, it will fail silently via onerror
    // and we map back to the fallbackImage just to show the logic works.
    for (let r = 0; r < rowCount; r++) {
      for (let f = 0; f < framesPerRow; f++) {
        const img = new Image();
        const src = `${basePath}/row_${r}_frame_${f.toString().padStart(3, '0')}.webp`;
        
        img.onload = () => {
          imagesLoaded++;
          setLoadProgress(Math.floor((imagesLoaded / totalImages) * 100));
          if (imagesLoaded === totalImages) {
            setIsLoaded(true);
          }
        };
        
        img.onerror = () => {
          // Fallback logic so the app doesn't break if files are missing
          imagesLoaded++;
          setLoadProgress(Math.floor((imagesLoaded / totalImages) * 100));
          if (imagesLoaded === totalImages) {
            setIsLoaded(true);
          }
        };
        
        img.src = src;
        cache.push(img);
      }
    }
    
    // Clean up cache (optional)
    return () => {
      // Memory cleanup if needed
    };
  }, [basePath, rowCount, framesPerRow]);

  // Mouse / Touch Event Handlers
  const handleDown = (clientX, clientY) => {
    dragRef.current.isDragging = true;
    dragRef.current.startX = clientX;
    dragRef.current.startY = clientY;
    dragRef.current.startFrame = activeFrame;
    dragRef.current.startRow = activeRow;
  };

  const handleMove = useCallback((clientX, clientY) => {
    if (!dragRef.current.isDragging) return;
    
    const sensitivityX = 5; // pixels per frame jump
    const sensitivityY = 40; // pixels per row jump
    
    const dx = clientX - dragRef.current.startX;
    const dy = clientY - dragRef.current.startY;
    
    // Calculate new frame (Horizontal Spin)
    // Going Right decreases the frame (spins left), Going Left increases frame
    let frameShift = Math.floor(dx / sensitivityX);
    let newFrame = (dragRef.current.startFrame - frameShift) % framesPerRow;
    if (newFrame < 0) newFrame += framesPerRow; // handle negative modulo
    
    // Calculate new row (Vertical Tilt)
    // Pulling down shifts to a higher perspective (row--), Pushing up shifts lower (row++)
    let rowShift = Math.floor(dy / sensitivityY);
    let newRow = dragRef.current.startRow + rowShift;
    newRow = Math.max(0, Math.min(rowCount - 1, newRow)); // clamp to bounds

    // Batch update state via requestAnimationFrame to guarantee screen-refresh sync
    requestAnimationFrame(() => {
      setActiveFrame(newFrame);
      setActiveRow(newRow);
    });
  }, [framesPerRow, rowCount, activeRow, activeFrame]);

  const handleUp = () => {
    dragRef.current.isDragging = false;
  };

  // Attach global event listeners so dragging works seamlessly even if mouse leaves the container
  useEffect(() => {
    const onMouseMove = (e) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e) => handleMove(e.touches[0].clientX, e.touches[0].clientY);
    const onMouseUp = () => handleUp();

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onMouseUp);
    };
  }, [handleMove]);

  // Fallback rendering state (When actual 109 images exist, this uses the real basePath dynamically)
  // For the moment, since the actual 109 sequence hasn't been generated manually, we map to the fallback.
  // const currentSrc = `${basePath}/row_${activeRow}_frame_${activeFrame.toString().padStart(3, '0')}.webp`;
  const currentSrc = fallbackImage; 

  return (
    <div 
      className="glass-card"
      style={{
        position: "relative",
        width: "100%",
        height: 450,
        overflow: "hidden",
        cursor: dragRef.current.isDragging ? "grabbing" : "grab",
        userSelect: "none"
      }}
      ref={containerRef}
      onMouseDown={(e) => handleDown(e.clientX, e.clientY)}
      onTouchStart={(e) => handleDown(e.touches[0].clientX, e.touches[0].clientY)}
    >
      {/* Simulation Info */}
      <div style={{ position: "absolute", top: 10, left: 14, zIndex: 10 }}>
        <div style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700, letterSpacing: 1 }}>HEMISPHERICAL ENGINE (V1)</div>
        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
          Target Row: {activeRow} (Tilt) | Frame: {activeFrame} (Y-Axis)
        </div>
      </div>

      {/* Main Image Viewport */}
      {/* We use a static fallback for demo until Task 1.1 / 1.2 generate all 109 files */}
      <img 
        src={currentSrc} 
        alt="360 Photoreal Turnaround"
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          opacity: 0.9,
          pointerEvents: "none" // Prevent native image dragging
        }}
      />

      {/* Loading Overlay */}
      {!isLoaded && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(10,15,30,0.8)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 12 }}>Caching Phase 1 Arrays...</div>
          <div style={{ width: 200, height: 4, background: "var(--bg)", borderRadius: 10, overflow: "hidden" }}>
             <div style={{ width: `${loadProgress}%`, height: "100%", background: "var(--accent)", transition: "width 0.15s ease" }} />
          </div>
        </div>
      )}
      
      {/* Instructions */}
      <div style={{ position: "absolute", bottom: 15, width: "100%", textAlign: "center", pointerEvents: "none" }}>
        <span style={{ fontSize: 12, background: "rgba(0,0,0,0.6)", padding: "4px 14px", borderRadius: 999, color: "var(--text-2)", border: "1px solid rgba(255,255,255,0.05)" }}>
          👆 Drag left/right to spin | Drag up/down to tilt
        </span>
      </div>
    </div>
  );
}
