import { createRouter, createWebHistory } from "vue-router";
import DashboardView from "../views/DashboardView.vue";
import ApplicationsView from "../views/ApplicationsView.vue";
import RemindersView from "../views/RemindersView.vue";
import ApplyFromUrlView from "../views/ApplyFromUrlView.vue";
import ProfileView from "../views/ProfileView.vue";
import CompaniesView from "../views/CompaniesView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: DashboardView },
    { path: "/apply-url", component: ApplyFromUrlView },
    { path: "/applications", component: ApplicationsView },
    { path: "/reminders", component: RemindersView },
    { path: "/profile", component: ProfileView },
    { path: "/companies", component: CompaniesView },
  ],
});

export default router;
