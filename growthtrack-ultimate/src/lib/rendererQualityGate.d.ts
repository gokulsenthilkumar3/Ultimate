export const QUALITY_GATE_STATUS: {
  readonly PASS: 'pass';
  readonly WARN: 'warn';
  readonly FAIL: 'fail';
  readonly PENDING: 'pending';
};

export interface QualityGateResult {
  status: typeof QUALITY_GATE_STATUS[keyof typeof QUALITY_GATE_STATUS];
  releaseReady: boolean;
  checks: Array<{
    id: string;
    label: string;
    status: string;
    detail: string;
    blocking: boolean;
  }>;
  passed: number;
  total: number;
}

export function buildRendererQualityGate(options?: {
  diagnostics?: any;
  telemetry?: any;
  renderMode?: string;
  cinematicState?: any;
  gpuTier?: string;
  settingsPersisted?: boolean;
}): QualityGateResult;
