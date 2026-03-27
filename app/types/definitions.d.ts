type ContainerTypes = "paper" | "glass" | "mixed";

export type ContainerType = {
  id?: number;
  code: string;
  type: ContainerTypes;
  lat: number | null;
  lng: number | null;
  isFull: number; // 0 or 1
};

export type ReportType = {
  id: number;
  container_code: string;
  created_at: string;
  status: StatusType;
};

export type StatusType = "empty" | "full";

export type UserType = {
  id: number;
  name: string | null;
  device_id: string;
  reports_count: number;
  last_reported_at: string | null;
  created_at: string;
};
