import type { NavItem } from "./types";

export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "House", href: "/dashboard" },
  { id: "chat", label: "Chat", icon: "MessageSquare", href: "/chat" },
  { id: "schedule", label: "Schedule", icon: "Calendar", href: "/schedule" },
  { id: "workspace", label: "Workspace", icon: "BookOpen", href: "/workspace" },
  { id: "documents", label: "Documents", icon: "FileText", href: "/documents" },
  { id: "habits", label: "Habits", icon: "Target", href: "/habits" },
  { id: "architecture", label: "Architecture", icon: "Dna", href: "/architecture" },
  { id: "analytics", label: "Analytics", icon: "BarChart3", href: "/analytics" },
];

export const DEMO_USER = {
  id: "demo-user-001",
  name: "Madhav",
};

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
export const DEMO_LATENCY = 800;
