import { createRouter, createWebHashHistory } from "vue-router";
import { workspaceSectionIds, type WorkspaceSectionId } from "../types/workspace";

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", name: "index", component: { template: "<span />" } },
    { path: "/home", name: "home", component: { template: "<span />" } },
    {
      path: "/workspace/:sectionId",
      name: "workspace",
      component: { template: "<span />" },
      beforeEnter: (to) =>
        workspaceSectionIds.includes(to.params.sectionId as WorkspaceSectionId)
          ? true
          : { name: "home" },
    },
    { path: "/:pathMatch(.*)*", redirect: { name: "home" } },
  ],
});
