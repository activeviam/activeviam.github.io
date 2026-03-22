import { D3Node } from "./d3Node";
import { ARetrieval } from "../json/retrieval";

export interface D3Link {
  source: D3Node;
  target: D3Node;
  id: string;
  criticalScore: number;
  hiddenMerger?: ARetrieval;
}
