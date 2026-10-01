export type Role =
  | "admin" | "dofficer" | "expteam" | "pasteam" | "soulcare" | "research"
  | "experienceadmin" | "soulcareadmin" | "testimonyteam" | "trainingteam" | "connectcentre"

export type Session = { role: Role | string; user: string; username: string | null }
