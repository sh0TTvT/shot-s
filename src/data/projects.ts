import gameModManagerImage from "../assets/projects/game-mod-manager.jpg";
import myFriendImage from "../assets/projects/my-friend.jpg";
import texasWebImage from "../assets/projects/texas-web.jpg";
import tourismImage from "../assets/projects/tourism.jpg";

export type ProjectItem = {
  id: string;
  title: string;
  description: string;
  tags: readonly string[];
  image: string;
  imageAlt: string;
  githubUrl: string;
};

// WHY: 项目信息以公开仓库的 README 与清单为准，避免作品页出现无法验证的能力描述。
export const projects = [
  {
    id: "tourism",
    title: "TOURISM QA",
    description:
      "结合大语言模型、Neo4j 知识图谱与实时天气服务的旅游问答及路线规划平台，包含用户端和管理端。",
    tags: ["SPRING BOOT", "VUE 3", "NEO4J", "OLLAMA"],
    image: tourismImage,
    imageAlt: "GitHub 上 sh0TTvT/tourism 仓库的页面截图",
    githubUrl: "https://github.com/sh0TTvT/tourism",
  },
  {
    id: "my-friend",
    title: "MY FRIEND",
    description:
      "基于 Electron、Vue 3 与 Three.js 的 AI 桌宠助手，以桌面应用形式打造有性格的个人伙伴。",
    tags: ["ELECTRON", "VUE 3", "THREE.JS", "TYPESCRIPT"],
    image: myFriendImage,
    imageAlt: "GitHub 上 sh0TTvT/my-friend 仓库的页面截图",
    githubUrl: "https://github.com/sh0TTvT/my-friend",
  },
  {
    id: "game-mod-manager",
    title: "GAME MOD MANAGER",
    description:
      "基于 Electron 与 React 的跨平台游戏模组管理应用，覆盖模组安装、启停、配置方案与插件扩展。",
    tags: ["ELECTRON", "REACT", "TYPESCRIPT", "TAILWIND"],
    image: gameModManagerImage,
    imageAlt: "GitHub 上 sh0TTvT/gameModMannager 仓库的页面截图",
    githubUrl: "https://github.com/sh0TTvT/gameModMannager",
  },
  {
    id: "texas-web",
    title: "TEXAS WEB",
    description:
      "基于 Vue 3 与 Go 的在线德州扑克项目，通过 WebSocket 支持多人实时对战，并提供房间和用户系统。",
    tags: ["VUE 3", "GO", "WEBSOCKET", "REDIS"],
    image: texasWebImage,
    imageAlt: "GitHub 上 sh0TTvT/Texas-web 仓库的页面截图",
    githubUrl: "https://github.com/sh0TTvT/Texas-web",
  },
] satisfies readonly ProjectItem[];
