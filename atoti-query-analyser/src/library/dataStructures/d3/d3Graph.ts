import { D3Link } from "./d3Link";
import { D3Node } from "./d3Node";

export interface D3Graph {
  nodes: D3Node[];
  links: D3Link[];
}
