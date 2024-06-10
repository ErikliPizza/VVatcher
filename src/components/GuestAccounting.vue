<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

defineEmits(['submit']);

const visible = ref(false)
const email = defineModel('email')
const password = defineModel('password')

const router = useRouter()
const isSignInRoute = ref(false)
if (router.currentRoute.value.name === 'Sign In') {
  isSignInRoute.value = true
}
const goTo = (path) => {
  router.push(path);
}

const rules = {
  required: value => !!value || 'Required.',
  email: value => {
    const pattern = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    return pattern.test(value) || 'Invalid e-mail.'
  },
}
</script>

<template>
  <div>
    <v-form @submit.prevent="$emit('submit')">

      <v-container
          class="mx-auto pa-8 pb-4"
          max-width="448"
          rounded="lg"
      >
        <div class="text-subtitle-1 text-medium-emphasis">Account</div>

        <v-text-field
            clearable
            :rules="[rules.required, rules.email]"
            type="email"
            v-model="email"
            density="compact"
            placeholder="Email address"
            prepend-inner-icon="mdi-email-outline"
            :variant="!isSignInRoute ? 'outlined' : 'solo-filled'"
        ></v-text-field>

        <div class="text-subtitle-1 text-medium-emphasis d-flex align-center justify-space-between">
          Password

          <v-btn class="my-1" density="compact" @click="goTo('forgot-password')" variant="plain">
            Forgot password?</v-btn>
        </div>

        <v-text-field
            :rules="[rules.required]"
            v-model="password"
            :append-inner-icon="visible ? 'mdi-eye-off' : 'mdi-eye'"
            :type="visible ? 'text' : 'password'"
            density="compact"
            placeholder="Enter your password"
            prepend-inner-icon="mdi-lock-outline"
            :variant="!isSignInRoute ? 'outlined' : 'solo-filled'"
            @click:append-inner="visible = !visible"
        ></v-text-field>

        <v-card
            class="mb-8"
            color="surface-variant"
            variant="tonal"
        >

        </v-card>

        <v-btn
            type="submit"
            color="blue"
            size="large"
            variant="tonal"
            block
            :text="isSignInRoute ? 'Sign In' : 'Sign Up'"
        >
        </v-btn>
      </v-container>
    </v-form>
  </div>
</template>