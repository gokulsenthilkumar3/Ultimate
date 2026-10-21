import React from "react";
import ChamberCanvas from "./ChamberCanvas";

/**
 * Legacy compatibility wrapper.
 *
 * The older Body3D stack has been retired in favor of the canonical
 * ChamberCanvas + morphEngine pipeline. Keep this component around so any
 * older imports still render the modern humanoid scene.
 */
export default function Body3D() {
  return (
    <div className="fade-in stagger-container" style={{ width: "100%", height: "100%" }}>
      <ChamberCanvas />
    </div>
  );
}
