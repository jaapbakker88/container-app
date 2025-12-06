type ContainerTypes = "paper" | "glass" | "mixed";

export type ContainerType = {
  id?: number;
  code: string;
  type: ContainerTypes;
  lat: number | null;
  lng: number | null;
  isFull: number; // 0 or 1
};
