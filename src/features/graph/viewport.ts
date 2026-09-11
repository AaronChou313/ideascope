import type { Viewport } from "@xyflow/react";
import { RESEARCH_NODE_SIZE, type PositionMap } from "./layout";

export const MIN_GRAPH_ZOOM = 0.28;
export const MAX_GRAPH_ZOOM = 1.7;

export function normalizeViewport(viewport: Viewport | null | undefined): Viewport | null {
  if (!viewport || !Number.isFinite(viewport.x) || !Number.isFinite(viewport.y) || !Number.isFinite(viewport.zoom)) return null;
  if (viewport.zoom < MIN_GRAPH_ZOOM || viewport.zoom > MAX_GRAPH_ZOOM) return null;
  return { x: viewport.x, y: viewport.y, zoom: viewport.zoom };
}

export function viewportShowsAnyNode(viewport: Viewport, positions: PositionMap, width: number, height: number) {
  if (width <= 0 || height <= 0 || positions.size === 0) return true;
  const margin = 24;
  for (const position of positions.values()) {
    const left = position.x * viewport.zoom + viewport.x;
    const top = position.y * viewport.zoom + viewport.y;
    const right = left + RESEARCH_NODE_SIZE.width * viewport.zoom;
    const bottom = top + RESEARCH_NODE_SIZE.height * viewport.zoom;
    if (right >= margin && bottom >= margin && left <= width - margin && top <= height - margin) return true;
  }
  return false;
}
