import { D3Node } from "./d3Node";
import { Point2D } from "../../graphProcessors/graphLayout";

export interface D3Link {
  source: D3Node;
  target: D3Node;
  id: string;
  critical: boolean;
  anchors?: Point2D[];
}
