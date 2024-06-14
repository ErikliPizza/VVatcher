import { createRouter, createWebHashHistory } from 'vue-router';
import MainLayout from '../components/MainLayout.vue';
import Home from '../views/Home.vue'; // example view component
import SignIn from "../views/SignIn.vue";
import SignUp from "../views/SignUp.vue";
import ForgotPassword from "../views/ForgotPassword.vue";
import Targets from "../views/Targets.vue";
import Shows from "../views/Shows.vue";
import Settings from "../views/Settings.vue";

const routes = [
    {
        path: '/',
        component: MainLayout,
        children: [
            {
                path: '',
                name: 'Home',
                component: Home
            },
            {
                path: 'signin',
                name: 'SignIn',
                component: SignIn
            },
            {
                path: 'signup',
                name: 'SignUp',
                component: SignUp
            },
            {
                path: 'forgot-password',
                name: 'ForgotPassword',
                component: ForgotPassword
            },
            {
                path: 'targets',
                name: 'Targets',
                component: Targets
            },
            {
                path: 'shows',
                name: 'Shows',
                component: Shows
            },
            {
                path: 'settings',
                name: 'Settings',
                component: Settings
            }
        ]
    }
];

const router = createRouter({
    history: createWebHashHistory(),
    routes
});

// Middleware function to check with Chrome extension
function checkKey() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'CHECKKEY' }, (response) => {
            if (response.status === 'success') {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}

// Global beforeEach guard
router.beforeEach(async (to, from, next) => {
    // List of public routes that do not require the check
    const publicRoutes = ['SignIn', 'SignUp', 'ForgotPassword', 'Settings'];

    // If the route requires the check
    if (!publicRoutes.includes(to.name)) {
        const isValid = await checkKey();
        if (!isValid) {
            next({ name: 'Settings' });
        } else {
            next();
        }
    } else {
        next();
    }
});

export default router;
