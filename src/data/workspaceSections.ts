import { marked } from "marked";
import labMarkdown from "../content/workspace/lab.md?raw";
import logsMarkdown from "../content/workspace/logs.md?raw";
import projectsMarkdown from "../content/workspace/projects.md?raw";
import monologueMarkdown from "../content/workspace/monologue.md?raw";
import type { WorkspaceSectionId } from "../types/workspace";
import { workspaceLabels } from "../types/workspace";

export type WorkspaceSectionDefinition = {
  label: string;
  code: string;
  title: string;
  content: string;
};

// WHY: 内容只来自随构建发布的本地 Markdown，不接收运行时输入，页面才能安全复用同一渲染边界。
const parseWorkspaceContent = (source: string) =>
  marked.parse(source, { async: false, gfm: true }) as string;

export const workspaceSections: Record<WorkspaceSectionId, WorkspaceSectionDefinition> = {
  projects: {
    label: workspaceLabels.projects,
    code: "SEC.01",
    title: "PROJECT INDEX",
    content: parseWorkspaceContent(projectsMarkdown),
  },
  lab: {
    label: workspaceLabels.lab,
    code: "SEC.02",
    title: "ACTIVE EXPERIMENTS",
    content: parseWorkspaceContent(labMarkdown),
  },
  logs: {
    label: workspaceLabels.logs,
    code: "SEC.03",
    title: "PUBLIC LOG",
    content: parseWorkspaceContent(logsMarkdown),
  },
  monologue: {
    label: workspaceLabels.monologue,
    code: "SEC.04",
    title: "OPERATOR MONOLOGUE",
    content: parseWorkspaceContent(monologueMarkdown),
  },
};
