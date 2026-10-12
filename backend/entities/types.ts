/**
 * Backend Data Transfer Objects and Entity Types
 * Mirrored Spring Boot / Express REST API Contracts
 */

export interface ApiResponse<T = any> {
  timestamp: string;
  status: number;
  success: boolean;
  message: string;
  data?: T;
}

export interface WorkflowAdvanceDTO {
  userId: string;
  stepId?: number;
  remarks?: string;
}

export interface ExternalClearanceDTO {
  userId: string;
}

export interface RevisionRequestDTO {
  userId: string;
  reason: string;
  stageId?: number;
}
