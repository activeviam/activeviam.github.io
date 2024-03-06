import { UUID } from "../../utilities/uuid";

export type VertexSelection = Set<UUID>;
export type EdgeSelection = Set<{ source: UUID; target: UUID }>;
