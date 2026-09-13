/**
 * Connection module — resilient RPC transport.
 *
 * @module
 */

export type {
  EndpointConfig,
  RetryConfig,
  HealthCheckConfig,
  ConnectionManagerConfig,
  EndpointHealth,
  ConnectionManagerStats,
} from "./types.js";

export { ConnectionError, AllEndpointsUnhealthyError } from "./errors.js";

export {
  isRetryableError,
  isConnectionLevelError,
  isWriteMethod,
  computeBackoff,
  deriveCoalesceKey,
} from "./retry.js";

export { ConnectionManager } from "./manager.js";
export {
  estimatePriorityFee,
  calculatePercentile,
  createComputeBudgetInstructions,
  DEFAULT_PRIORITY_FEE_CONFIG,
  type PriorityFeeConfig,
} from "./priority-fee.js";
