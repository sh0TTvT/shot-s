export const workspaceSectionIds = ["projects", "lab", "logs", "monologue"] as const;

export type WorkspaceSectionId = (typeof workspaceSectionIds)[number];

export const workspaceLabels: Record<WorkspaceSectionId, string> = {
  projects: "DIR.PROJECTS",
  lab: "DIR.LAB",
  logs: "DIR.LOGS",
  monologue: "DIR.MONOLOGUE",
};
