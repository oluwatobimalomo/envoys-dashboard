import {
  Home, Users, UserPlus, Phone, RefreshCw, BarChart2, MessageSquare, Flag, QrCode,
  Heart, MapPin, Clipboard, Star, TrendingUp, Activity, Shield, UserCheck, FileText,
  MessageCircle, Award, Trophy, Moon, AlertCircle, BookUser, type LucideIcon,
} from "lucide-react"

export type Tone = "brand" | "gold" | "soul" | "research" | "info" | "warning" | "danger" | "muted"

export const ROLE_META: Record<string, { label: string; tone: Tone }> = {
  admin: { label: "Admin", tone: "gold" },
  dofficer: { label: "Data Officer", tone: "brand" },
  expteam: { label: "Experience Team", tone: "brand" },
  pasteam: { label: "Pastoral Team", tone: "gold" },
  soulcare: { label: "Soul Care", tone: "soul" },
  research: { label: "Research Team", tone: "research" },
  experienceadmin: { label: "Exp. Admin", tone: "info" },
  soulcareadmin: { label: "Soul Care Admin", tone: "soul" },
  testimonyteam: { label: "Testimony Team", tone: "gold" },
  trainingteam: { label: "Training Team", tone: "gold" },
  connectcentre: { label: "Connect Centre", tone: "soul" },
}

export const NAV_ICONS: Record<string, LucideIcon> = {
  admin_overview: Home, admin_users: Users, admin_adduser: UserPlus,
  firsttimers: Users, addmember: UserPlus, report: BarChart2,
  allfeedback: MessageSquare, flagged: Flag, qrcode: QrCode,
  callqueue: Phone, callbacks: RefreshCw, mycalls: Phone,
  research_feedback: FileText, general_feedback: MessageSquare,
  assign_calls: UserCheck, experience_dashboard: BarChart2,
  completed_pipelines: FileText, feedback_qr: QrCode, testimony_qr: QrCode,
  testimony_bank: Star, members_care: Heart, vip_contact: MessageCircle,
  envoys_visitors: Users, nc_assign: UserCheck, nc_mine: Clipboard, nc_qr: QrCode,
  nc_registry: BookUser, nc_report: TrendingUp, soulcare_dashboard: BarChart2,
  steward_care: Shield, care_priority_list: AlertCircle, sc_assign_calls: UserCheck,
  sc_call_queue: Phone, sc_calls_analytics: Activity, available_for_visitation: MapPin,
  sc_my_calls: Phone, connect_centre_prospects: MapPin, vip_journey_dashboard: TrendingUp,
  nom_registry: Moon, nom_qr: QrCode, steward_appraisal_results: Trophy,
  appraisal_qr: QrCode, training_module: Award,
}

export type NavItem = { id: string; label: string }

export const NAV: Record<string, NavItem[]> = {
  admin: [
    { id: "admin_overview", label: "Overview" },
    { id: "admin_users", label: "Users" },
    { id: "admin_adduser", label: "Add User" },
    { id: "firsttimers", label: "First-Timers" },
    { id: "vip_contact", label: "VIP Contact" },
    { id: "assign_calls", label: "Assign Calls" },
    { id: "completed_pipelines", label: "Completed Pipelines" },
    { id: "envoys_visitors", label: "Envoys Visitors" },
    { id: "callqueue", label: "Call Queue" },
    { id: "experience_dashboard", label: "Analytics Dashboard" },
    { id: "vip_journey_dashboard", label: "VIP Journey Dashboard" },
    { id: "nc_registry", label: "Registry" },
    { id: "nc_qr", label: "QR Code" },
    { id: "nc_assign", label: "Assign Calls" },
    { id: "nc_mine", label: "Call Queue" },
    { id: "nc_report", label: "New Converts Retention" },
    { id: "training_module", label: "Training Module" },
    { id: "steward_care", label: "Stewards Care" },
    { id: "members_care", label: "Members Care" },
    { id: "care_priority_list", label: "Care Priority List" },
    { id: "sc_assign_calls", label: "Assign Calls" },
    { id: "sc_call_queue", label: "Call Queue" },
    { id: "flagged", label: "Flagged" },
    { id: "research_feedback", label: "VIPs Feedback" },
    { id: "general_feedback", label: "General Feedback" },
    { id: "feedback_qr", label: "Feedback QR" },
    { id: "testimony_qr", label: "Testimony QR" },
    { id: "qrcode", label: "VIPs QR Code" },
    { id: "testimony_bank", label: "Testimony Bank" },
    { id: "soulcare_dashboard", label: "Retention Dashboard" },
    { id: "sc_calls_analytics", label: "Calls Analytics" },
    { id: "available_for_visitation", label: "Available for Visitation" },
    { id: "nom_registry", label: "Night of Mercy" },
    { id: "nom_qr", label: "NOM QR Code" },
    { id: "appraisal_qr", label: "Appraisal QR" },
    { id: "steward_appraisal_results", label: "Stewards Appraisal" },
  ],
  dofficer: [
    { id: "firsttimers", label: "First-Timers" },
    { id: "vip_contact", label: "VIP Contact" },
    { id: "addmember", label: "Add Record" },
    { id: "qrcode", label: "QR Code" },
    { id: "nc_registry", label: "Registry" },
    { id: "nc_qr", label: "QR Code" },
    { id: "nom_registry", label: "Night of Mercy" },
    { id: "nom_qr", label: "NOM QR Code" },
  ],
  expteam: [
    { id: "mycalls", label: "My Calls" },
    { id: "callqueue", label: "Call Queue" },
    { id: "callbacks", label: "Call Backs" },
    { id: "allfeedback", label: "All Feedback" },
    { id: "flagged", label: "Flagged" },
    { id: "experience_dashboard", label: "Analytics Dashboard" },
  ],
  pasteam: [
    { id: "report", label: "Report" },
    { id: "allfeedback", label: "All Feedback" },
    { id: "flagged", label: "Flagged" },
    { id: "nc_report", label: "New Converts Retention" },
    { id: "soulcare_dashboard", label: "Retention Dashboard" },
    { id: "sc_calls_analytics", label: "Calls Analytics" },
    { id: "vip_journey_dashboard", label: "VIP Journey Dashboard" },
    { id: "appraisal_qr", label: "Appraisal QR" },
    { id: "steward_appraisal_results", label: "Stewards Appraisal" },
  ],
  soulcare: [
    { id: "envoys_visitors", label: "Envoys Visitors" },
    { id: "steward_care", label: "Stewards Care" },
    { id: "members_care", label: "Members Care" },
    { id: "care_priority_list", label: "Care Priority List" },
    { id: "sc_my_calls", label: "My Assigned Calls" },
    { id: "nc_mine", label: "Call Queue" },
    { id: "nc_report", label: "New Converts Retention" },
  ],
  soulcareadmin: [
    { id: "envoys_visitors", label: "Envoys Visitors" },
    { id: "steward_care", label: "Stewards Care" },
    { id: "members_care", label: "Members Care" },
    { id: "care_priority_list", label: "Care Priority List" },
    { id: "sc_assign_calls", label: "Assign Calls" },
    { id: "sc_call_queue", label: "Call Queue" },
    { id: "completed_pipelines", label: "Completed Pipelines" },
    { id: "nc_registry", label: "Registry" },
    { id: "nc_qr", label: "QR Code" },
    { id: "nc_assign", label: "Assign Calls" },
    { id: "nc_mine", label: "Call Queue" },
    { id: "nc_report", label: "New Converts Retention" },
    { id: "soulcare_dashboard", label: "Retention Dashboard" },
    { id: "sc_calls_analytics", label: "Calls Analytics" },
    { id: "available_for_visitation", label: "Available for Visitation" },
    { id: "vip_journey_dashboard", label: "VIP Journey Dashboard" },
  ],
  research: [
    { id: "research_feedback", label: "Service Feedback" },
    { id: "feedback_qr", label: "Feedback QR" },
    { id: "general_feedback", label: "General Feedback" },
  ],
  testimonyteam: [
    { id: "testimony_bank", label: "Testimony Bank" },
    { id: "testimony_qr", label: "Testimony QR" },
  ],
  trainingteam: [{ id: "training_module", label: "Training Module" }],
  experienceadmin: [
    { id: "assign_calls", label: "Assign Calls" },
    { id: "completed_pipelines", label: "Completed Pipelines" },
    { id: "envoys_visitors", label: "Envoys Visitors" },
    { id: "callqueue", label: "Call Queue" },
    { id: "allfeedback", label: "All Feedback" },
    { id: "flagged", label: "Flagged" },
    { id: "experience_dashboard", label: "Analytics Dashboard" },
    { id: "vip_journey_dashboard", label: "VIP Journey Dashboard" },
  ],
  connectcentre: [{ id: "connect_centre_prospects", label: "Prospective Members" }],
}

export const NAV_GROUPS: Record<string, { title: string; ids: string[] }[]> = {
  dofficer: [
    { title: "First-Timers", ids: ["firsttimers", "vip_contact", "addmember", "qrcode"] },
    { title: "New Converts", ids: ["nc_registry", "nc_qr"] },
    { title: "Night of Mercy", ids: ["nom_registry", "nom_qr"] },
  ],
  admin: [
    { title: "Administration", ids: ["admin_overview", "admin_users", "admin_adduser"] },
    { title: "First-Timers", ids: ["firsttimers", "vip_contact", "qrcode"] },
    { title: "Experience Team", ids: ["assign_calls", "callqueue", "experience_dashboard"] },
    { title: "VIP Retention Funnel", ids: ["completed_pipelines", "envoys_visitors", "vip_journey_dashboard"] },
    { title: "New Converts", ids: ["nc_qr", "nc_registry", "nc_assign", "nc_mine", "nc_report", "training_module"] },
    { title: "Care Channels", ids: ["members_care", "steward_care", "care_priority_list", "sc_assign_calls", "sc_call_queue", "soulcare_dashboard", "sc_calls_analytics", "available_for_visitation"] },
    { title: "Pastoral", ids: ["report", "allfeedback", "flagged"] },
    { title: "Research", ids: ["research_feedback", "general_feedback", "feedback_qr"] },
    { title: "Testimonies", ids: ["testimony_bank", "testimony_qr"] },
    { title: "Connect Centre", ids: ["connect_centre_prospects"] },
    { title: "Night of Mercy", ids: ["nom_registry", "nom_qr"] },
    { title: "Stewards Appraisal", ids: ["appraisal_qr", "steward_appraisal_results"] },
  ],
  soulcareadmin: [
    { title: "VIP Retention Funnel", ids: ["completed_pipelines", "envoys_visitors", "vip_journey_dashboard"] },
    { title: "New Converts", ids: ["nc_qr", "nc_registry", "nc_assign", "nc_mine", "nc_report"] },
    { title: "Care Channels", ids: ["members_care", "steward_care", "care_priority_list", "sc_assign_calls", "sc_call_queue", "soulcare_dashboard", "sc_calls_analytics", "available_for_visitation"] },
    { title: "Oversight", ids: ["completed_pipelines", "soulcare_dashboard"] },
  ],
  soulcare: [
    { title: "VIP Retention Funnel", ids: ["envoys_visitors"] },
    { title: "New Converts", ids: ["nc_mine", "nc_report"] },
    { title: "Care Channels", ids: ["members_care", "steward_care", "care_priority_list", "sc_my_calls"] },
  ],
  experienceadmin: [
    { title: "Calls", ids: ["assign_calls", "callqueue", "completed_pipelines", "envoys_visitors", "experience_dashboard", "vip_journey_dashboard"] },
    { title: "Feedback", ids: ["allfeedback", "flagged"] },
  ],
}

export type NavSection = { title: string | null; items: NavItem[] }

export function buildNavSections(role: string): NavSection[] {
  const items = NAV[role] || []
  const groups = NAV_GROUPS[role]
  if (!groups) return [{ title: null, items }]
  const byId: Record<string, NavItem> = {}
  items.forEach((i) => (byId[i.id] = i))
  const used = new Set<string>()
  const sections = groups
    .map((g) => ({ title: g.title, items: g.ids.map((id) => byId[id]).filter(Boolean) }))
    .filter((s) => s.items.length > 0)
  sections.forEach((s) => s.items.forEach((i) => used.add(i.id)))
  const leftovers = items.filter((i) => !used.has(i.id))
  if (leftovers.length) sections.push({ title: "Other", items: leftovers })
  return sections
}

// URL slugs: "members_care" → "/members-care"
export const pathFor = (id: string) => `/${id.replace(/_/g, "-")}`
export const idFromSlug = (slug: string) => slug.replace(/-/g, "_")

export function canAccess(role: string, id: string) {
  if (id === "myprofile") return true
  return (NAV[role] || []).some((n) => n.id === id)
}

export function homeFor(role: string) {
  return pathFor(NAV[role]?.[0]?.id || "myprofile")
}

export function labelFor(role: string, id: string) {
  if (id === "myprofile") return "My Profile"
  return NAV[role]?.find((n) => n.id === id)?.label || "Dashboard"
}

export function groupFor(role: string, id: string) {
  return buildNavSections(role).find((s) => s.items.some((i) => i.id === id))?.title || null
}
