export type StorePlatform = "GOOGLE_PLAY" | "APPLE";

export interface StoreDateRange {
  from: string;
  to: string;
}

export interface StorePlatformSummary {
  platform: StorePlatform;
  dataThrough?: string;
  metrics: { metricKey: string; total?: number }[];
}

export interface StoreSummary extends StoreDateRange {
  platforms: StorePlatformSummary[];
}

export interface StoreTimeseries {
  platform: StorePlatform;
  metric: string;
  dataThrough?: string;
  points: { metricDate: string; value?: number }[];
}

export interface StoreQuality {
  platform: StorePlatform;
  dataThrough?: string;
  latestRating?: number;
  latestRatingDate?: string;
  crashTotal?: number;
}

export interface StoreImport {
  platform: StorePlatform;
  sourceType?: string;
  processingDate?: string;
  status?: "SUCCEEDED" | "FAILED" | "QUARANTINED";
  rowCount?: number;
  errorCode?: string;
  importedAt?: string;
}

export interface StoreImportStatus {
  // The backend has not specified the platform-status shape yet.
  platforms?: unknown[];
  imports: StoreImport[];
}
