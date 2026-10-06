export interface ApiResponse<T = any> {
  timestamp: string;
  status: number;
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

export interface WorkflowAdvanceDTO {
  userId: string;
  role: string;
  orgId?: string;
  stepId?: number;
  remarks?: string;
}

export interface ExternalClearanceDTO {
  userId: string;
  role: string;
  orgId: string;
  clearedByOvcsas: boolean;
  clearedByChancellor: boolean;
  referenceNumber?: string;
  notes?: string;
}

export interface RevisionRequestDTO {
  userId: string;
  role: string;
  reason: string;
  stageId?: number;
}

export interface DeferDTO {
  userId: string;
  role: string;
  reason: string;
  stageId?: number;
}

export interface ResubmitDTO {
  userId: string;
  role: string;
  notes?: string;
}
