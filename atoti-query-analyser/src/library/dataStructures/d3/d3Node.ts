import { ARetrieval } from "../json/retrieval";

export interface D3NodeDetails {
  elapsedTimes: number[];
  metadata: ARetrieval;
  startTime: number;
  elapsedTime: number;
  startTimes: number[];
}

export interface D3Node {
  id: number;
  name: string;
  isSelected: boolean;
  details: D3NodeDetails;
  clusterId: number;
  radius: number;
  yFixed: number;
  status: string | null;
}
