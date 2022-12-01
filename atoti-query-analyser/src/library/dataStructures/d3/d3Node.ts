import { ARetrieval } from "../json/retrieval";

export interface D3Node {
  id: number;
  name: string;
  isSelected: boolean;
  details: {
    elapsedTimes: number[];
    metadata: ARetrieval;
    startTime: number;
    elapsedTime: number;
    startTimes: number[]
  };
  clusterId: number;
  radius: number;
  yFixed: number;
  status: string | null;
}