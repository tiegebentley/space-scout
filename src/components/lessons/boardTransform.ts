// Coordinate transform for rendering the lab's landscape scenarios on a PORTRAIT
// board that matches space-scout's live game (your team attacks UP).
//
// The lab authored everything in a 1000x620 landscape space where "home" attacks
// toward +x (right). We keep ALL data + grader math in those lab coordinates
// (so nothing has to be rewritten and the directional relation rules stay valid)
// and only rotate at the render / pointer-input boundary:
//
//   lab +x (home's attacking direction, "ahead")  ->  screen UP
//   lab  y (across the field, flank to flank)      ->  screen left/right
//
// Concretely, with a portrait viewBox of VW x VH = 620 x 1000:
//   screenX = labY
//   screenY = PW - labX      (so larger labX = higher up = smaller screenY)
// and the inverse for turning a pointer position back into lab coords.
import { LAB_PITCH } from "@/types/lessons";

const PW = LAB_PITCH.w; // 1000 (lab length / attacking axis)
const PH = LAB_PITCH.h; // 620  (lab width / flank axis)

// Portrait viewBox dimensions.
export const VIEW_W = PH; // 620
export const VIEW_H = PW; // 1000

export function labToScreen(x: number, y: number): { sx: number; sy: number } {
  return { sx: y, sy: PW - x };
}

export function screenToLab(sx: number, sy: number): { x: number; y: number } {
  return { x: PW - sy, y: sx };
}
