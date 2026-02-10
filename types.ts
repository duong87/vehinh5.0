
// Definition of supported model types and generation parameters
export type ModelType = 
  | 'gemini-3-flash-preview'
  | 'gemini-3-pro-preview'
  | 'gemini-2.5-flash-image'
  | 'gemini-3-pro-image-preview';

export interface GenerationParams {
  prompt: string;
  baseImage?: string;
  aspectRatio?: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
  imageSize?: "1K" | "2K" | "4K";
  model: ModelType;
}

export interface Point {
  id: string;
  label: string;
  x: number;
  y: number;
  labelOffsetX?: number; // Manual horizontal offset for label
  labelOffsetY?: number; // Manual vertical offset for label
}

export interface Line {
  id: string;
  p1: string; // Point ID
  p2: string; // Point ID
  style: 'solid';
  isRay?: boolean;
}

export interface Circle {
  id: string;
  centerId: string;
  radius?: number; // Logical radius
  pointOnCircleId?: string; // Point on circumference
}

export interface AngleSymbol {
  id: string;
  p1: string;
  vertex: string;
  p2: string;
  isRight: boolean;
  isEqual?: boolean;
}

export interface EqualSegment {
  id: string;
  p1: string;
  p2: string;
  count: number; // Number of ticks (1, 2, or 3)
}

export interface HatchedAreaSegment {
  p1: string;
  p2: string;
  type: 'line' | 'arc';
  centerId?: string; // Only for arc
  isLargeArc?: boolean; // For arc rendering (SVG A command)
  isClockwise?: boolean; // For arc rendering (SVG A command sweep-flag)
}

export interface HatchedArea {
  id: string;
  pointIds: string[]; // Keep for compatibility/labeling
  segments?: HatchedAreaSegment[]; // New detail for mixed boundaries (lines/arcs)
  label?: string;     // Description of the area
  isSpecial?: boolean; // Highlighted or special area
}

export interface DrawingStep {
  description: string;
  isConfirmed: boolean;
}

export interface GeometryData {
  points: Point[];
  lines: Line[];
  circles: Circle[];
  angles: AngleSymbol[];
  equalSegments: EqualSegment[];
  hatchedAreas?: HatchedArea[];
}

export enum AppStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  EDITING_CODE = 'EDITING_CODE',
  IDENTIFYING_AREA = 'IDENTIFYING_AREA',
  DRAWING = 'DRAWING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}
