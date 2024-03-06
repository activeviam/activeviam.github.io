import { D3Node } from "./d3Node";

export interface D3Link {
  source: D3Node;
  target: D3Node;
  id: string;
  criticalScore: number;
}
