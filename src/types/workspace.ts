export const workspaceWindowIds = ["projects", "lab", "logs", "contact"] as const;

export type WorkspaceWindowId = (typeof workspaceWindowIds)[number];

export const workspaceLabels: Record<WorkspaceWindowId, string> = {
  projects: "DIR.PROJECTS",
  lab: "DIR.LAB",
  logs: "DIR.LOGS",
  contact: "COMM.CONTACT",
};
