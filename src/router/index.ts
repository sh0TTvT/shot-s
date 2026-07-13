import { createRouter, createWebHashHistory } from "vue-router";
import { workspaceWindowIds, type WorkspaceWindowId } from "../types/workspace";

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", name: "index", component: { template: "<span />" } },
    { path: "/home", name: "home", component: { template: "<span />" } },
    {
      path: "/workspace/:windowId",
      name: "workspace",
      component: { template: "<span />" },
      beforeEnter: (to) =>
        workspaceWindowIds.includes(to.params.windowId as WorkspaceWindowId)
          ? true
          : { name: "home" },
    },
    { path: "/:pathMatch(.*)*", redirect: { name: "home" } },
  ],
});
