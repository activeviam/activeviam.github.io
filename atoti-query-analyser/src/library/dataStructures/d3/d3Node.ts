import { ARetrieval } from "../json/retrieval";
import { SimulationNodeDatum } from "d3-force";

export interface D3NodeDetails {
  elapsedTimes: number[];
  metadata: ARetrieval;
  startTime: number;
  elapsedTime: number;
  startTimes: number[];
}

export interface D3Node extends SimulationNodeDatum {
  id: number;
  name: string;
  details: D3NodeDetails;
  clusterId: number;
  radius: number;
  yFixed: number;
  status: string | null;
}
