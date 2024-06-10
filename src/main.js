import { createApp } from 'vue'
import App from './App.vue'
import { VueFire, VueFireAuth } from 'vuefire'
import { firebaseApp } from './firebaseconfig';
import "./style.css";
// Vuetify
import vuetify from "./Plugins/vuetify.js";
import router from "./router/index.js";

const app = createApp(App);

app.use(vuetify)
    .use(VueFire, {
        firebaseApp,
        modules: [
            VueFireAuth()
        ]
    })
    .use(router)
    .mount('#app');
