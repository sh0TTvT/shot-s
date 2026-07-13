import { marked } from "marked";
import contactMarkdown from "../content/workspace/contact.md?raw";
import labMarkdown from "../content/workspace/lab.md?raw";
import logsMarkdown from "../content/workspace/logs.md?raw";
import projectsMarkdown from "../content/workspace/projects.md?raw";
import type { WorkspaceWindowId } from "../types/workspace";
import { workspaceLabels } from "../types/workspace";

export type WorkspaceWindowDefinition = {
  label: string;
  code: string;
  title: string;
  content: string;
};

// WHY: 内容只来自随构建发布的本地 Markdown，不接收运行时输入，窗口才能安全复用同一渲染边界。
const parseWorkspaceContent = (source: string) =>
  marked.parse(source, { async: false, gfm: true }) as string;

export const workspaceWindows: Record<WorkspaceWindowId, WorkspaceWindowDefinition> = {
  projects: {
    label: workspaceLabels.projects,
    code: "WND.01",
    title: "PROJECT INDEX",
    content: parseWorkspaceContent(projectsMarkdown),
  },
  lab: {
    label: workspaceLabels.lab,
    code: "WND.02",
    title: "ACTIVE EXPERIMENTS",
    content: parseWorkspaceContent(labMarkdown),
  },
  logs: {
    label: workspaceLabels.logs,
    code: "WND.03",
    title: "PUBLIC LOG",
    content: parseWorkspaceContent(logsMarkdown),
  },
  contact: {
    label: workspaceLabels.contact,
    code: "WND.04",
    title: "CONTACT CHANNELS",
    content: parseWorkspaceContent(contactMarkdown),
  },
};
