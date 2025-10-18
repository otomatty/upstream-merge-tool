// Conflict marker information
export interface ConflictMarker {
  startLine: number; // Line of "<<<<<<< "
  markerLine: number; // Line of "======="
  endLine: number; // Line of ">>>>>>>"
  oursStart: number; // Start line of our content
  oursEnd: number; // End line of our content (before =======)
  theirsStart: number; // Start line of their content
  theirsEnd: number; // End line of their content
  ours: string; // Our version of the content
  theirs: string; // Their version of the content
}
