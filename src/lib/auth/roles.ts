// Role + permission model — the single source of truth for "who can do what".
// Mirrors the RLS policies in supabase/migrations/0001. UI gating calls can();
// RLS is the real enforcement on the server.

export type Role = "master" | "coach" | "player";

export const ROLE_LABEL: Record<Role, string> = {
  master: "Master",
  coach: "Coach",
  player: "Player",
};

export type Permission =
  | "author:open"            // see/enter the lesson author at all
  | "lesson:createCustom"    // make new custom lessons
  | "lesson:editOwnCustom"   // edit/delete your own custom lessons
  | "lesson:editBuiltin"     // edit built-in/program lessons (fork+publish)
  | "lesson:editAnyCustom"   // edit/delete anyone's custom lessons
  | "course:edit"            // modify the course structure / program
  | "lesson:publish"         // publish a lesson into the shared program
  | "roles:manage"           // change other users' roles
  | "play:matchSetup"        // configure format/role/difficulty/opponent
  | "play:zoneRules"         // draw zone-rule boxes in Play Match
  | "play:savePresets";      // save custom Play-Match presets

const MATRIX: Record<Role, Permission[]> = {
  master: [
    "author:open", "lesson:createCustom", "lesson:editOwnCustom",
    "lesson:editBuiltin", "lesson:editAnyCustom", "course:edit",
    "lesson:publish", "roles:manage",
    "play:matchSetup", "play:zoneRules", "play:savePresets",
  ],
  // In the Play Match module everyone configures their own game freely —
  // format/position/opponent/difficulty/length, zone rules, and saved presets are
  // open to all roles. (Authoring/course perms remain master/coach only.)
  coach: [
    "author:open", "lesson:createCustom", "lesson:editOwnCustom",
    "play:matchSetup", "play:zoneRules", "play:savePresets",
  ],
  player: [
    "play:matchSetup", "play:zoneRules", "play:savePresets",
  ],
};

export function can(role: Role | null | undefined, perm: Permission): boolean {
  if (!role) return false;
  return MATRIX[role].includes(perm);
}
