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
                name: 'Sign In',
                component: SignIn
            },
            {
                path: 'signup',
                name: 'Sign Up',
                component: SignUp
            },
            {
                path: 'forgot-password',
                name: 'Forgot Password',
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

export default router;


