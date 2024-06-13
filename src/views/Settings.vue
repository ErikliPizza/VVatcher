<script setup>

import {ref} from "vue";
import {useGenAi} from "../composables/useGenAi.js";

const key = ref();
const responseStatus = ref('');
const checking = ref(false);
const addKey = () => {
  checkGenAi();
}
const checkGenAi = async () => {
  try {
    checking.value = true;
    const modelType = 'gemini-1.5-pro-latest';
    const apiKey = key.value;
    const model = await useGenAi(modelType, apiKey);
    await model.generateContent('test');
    responseStatus.value = "success";
  } catch (err) {
    responseStatus.value = "error";
    checking.value = false;
  }
};
</script>

<template>
  <div>
    <v-container
        class="mx-auto pa-8 pb-4"
        max-width="448"
        rounded="lg"
    >
      <v-text-field
          :disabled="responseStatus === 'success'"
          v-model="key"
          density="compact"
          placeholder="Gemini API Key"
          prepend-inner-icon="mdi-key"
          variant="outlined"
      ></v-text-field>

      <v-btn
          :disabled="checking"
          color="blue"
          size="large"
          variant="tonal"
          block
          text="Save API Key"
          append-icon="mdi-key-arrow-right"
          @click="addKey"
      >
      </v-btn>
    </v-container>
  </div>
  <p v-if="responseStatus === 'success'">Success: Valid Response Received</p>
  <p v-if="responseStatus === 'error'">Error: No Valid Response</p>


</template>