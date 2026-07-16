import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import "@fontsource/barlow-condensed/latin-500.css";
import "@fontsource/barlow-condensed/latin-600.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "@fontsource/ibm-plex-mono/latin-600.css";
import "@fontsource/tektur/latin-500.css";
import "./styles/main.css";

createApp(App).use(router).mount("#app");
