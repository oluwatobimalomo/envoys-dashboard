"use client"

import dynamic from "next/dynamic"
import { SkeletonReport } from "@/components/app/kit"

const L = () => <SkeletonReport />
const d = (loader: () => Promise<any>) => dynamic(loader, { loading: L })

// Each nav id maps to one screen. Screens own any sub-views (edit forms, logging, profiles).
const SCREENS: Record<string, React.ComponentType<any>> = {
  admin_overview: d(() => import("@/modules/admin").then((m) => m.AdminOverview)),
  admin_users: d(() => import("@/modules/admin").then((m) => m.AdminUsersScreen)),
  admin_adduser: d(() => import("@/modules/admin").then((m) => m.AdminAddUserScreen)),
  myprofile: d(() => import("@/modules/admin").then((m) => m.MyProfilePage)),

  firsttimers: d(() => import("@/modules/first-timers").then((m) => m.FirstTimersScreen)),
  addmember: d(() => import("@/modules/registry-extras").then((m) => m.AddRecordScreen)),
  qrcode: d(() => import("@/modules/first-timers").then((m) => m.FirstTimersQR)),
  vip_contact: d(() => import("@/modules/vip-contact").then((m) => m.VipContactView)),

  assign_calls: d(() => import("@/modules/calls").then((m) => m.AssignCallsView)),
  callqueue: d(() => import("@/modules/calls").then((m) => m.CallQueueScreen)),
  callbacks: d(() => import("@/modules/calls").then((m) => m.CallBacksScreen)),
  mycalls: d(() => import("@/modules/calls").then((m) => m.MyCallsScreen)),
  experience_dashboard: d(() => import("@/modules/pastoral").then((m) => m.ExperienceAnalyticsDashboard)),

  completed_pipelines: d(() => import("@/modules/funnel").then((m) => m.CompletedPipelines)),
  envoys_visitors: d(() => import("@/modules/funnel").then((m) => m.EnvoysVisitors)),
  vip_journey_dashboard: d(() => import("@/modules/funnel").then((m) => m.VipJourneyDashboard)),

  nc_registry: d(() => import("@/modules/new-converts").then((m) => m.NewConvertsRegistry)),
  nc_qr: d(() => import("@/modules/new-converts").then((m) => m.NewConvertQR)),
  nc_assign: d(() => import("@/modules/new-converts").then((m) => m.NewConvertsAssignView)),
  nc_mine: d(() => import("@/modules/new-converts").then((m) => m.NewConvertsQueueScreen)),
  nc_report: d(() => import("@/modules/new-converts").then((m) => m.NewConvertsRetentionReport)),
  training_module: d(() => import("@/modules/new-converts").then((m) => m.TrainingModule)),

  members_care: d(() => import("@/modules/care").then((m) => m.MembersCareScreen)),
  steward_care: d(() => import("@/modules/care").then((m) => m.StewardsCareScreen)),
  care_priority_list: d(() => import("@/modules/care").then((m) => m.CarePriorityScreen)),
  sc_assign_calls: d(() => import("@/modules/soul-calls").then((m) => m.AssignSoulCallsScreen)),
  sc_call_queue: d(() => import("@/modules/soul-calls").then((m) => m.SoulCallQueueScreen)),
  sc_my_calls: d(() => import("@/modules/soul-calls").then((m) => m.SoulCallQueueScreen)),
  soulcare_dashboard: d(() => import("@/modules/soul-calls").then((m) => m.SoulCareReportingDashboard)),
  sc_calls_analytics: d(() => import("@/modules/soul-calls").then((m) => m.SoulCallsAnalyticsDashboard)),
  available_for_visitation: d(() => import("@/modules/soul-calls").then((m) => m.AvailableForVisitation)),

  report: d(() => import("@/modules/pastoral").then((m) => m.Report)),
  allfeedback: d(() => import("@/modules/pastoral").then((m) => m.AllFeedback)),
  flagged: d(() => import("@/modules/pastoral").then((m) => m.FlaggedRecords)),

  research_feedback: d(() => import("@/modules/research").then((m) => m.ResearchFeedback)),
  general_feedback: d(() => import("@/modules/research").then((m) => m.GeneralFeedback)),
  feedback_qr: d(() => import("@/modules/research").then((m) => m.FeedbackQR)),

  testimony_bank: d(() => import("@/modules/testimonies").then((m) => m.TestimonyBank)),
  testimony_qr: d(() => import("@/modules/testimonies").then((m) => m.TestimonyQR)),

  connect_centre_prospects: d(() => import("@/modules/connect-centre").then((m) => m.ConnectCentreProspects)),

  nom_registry: d(() => import("@/modules/nom-appraisal").then((m) => m.NOMFirstTimersList)),
  nom_qr: d(() => import("@/modules/nom-appraisal").then((m) => m.NOMQR)),
  appraisal_qr: d(() => import("@/modules/nom-appraisal").then((m) => m.AppraisalQR)),
  steward_appraisal_results: d(() => import("@/modules/nom-appraisal").then((m) => m.StewardAppraisalDashboard)),
}

export function ModuleOutlet({ id }: { id: string }) {
  const Screen = SCREENS[id]
  if (!Screen) return <p className="text-muted-foreground">This page isn&apos;t available.</p>
  return <Screen />
}
