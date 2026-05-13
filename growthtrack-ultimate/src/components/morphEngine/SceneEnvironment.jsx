/**
 * SceneEnvironment.jsx
 * NOTE: drei Environment preset creates a CubeCamera for PMREM baking.
 * In three.js 0.184.0, CubeCamera.update has a breaking API change that
 * crashes the canvas. Disabled until drei is updated.
 * Scene is lit by StudioLighting (directional + ambient + hemisphere).
 */
import React from "react";

export default function SceneEnvironment() {
  return null;
}
