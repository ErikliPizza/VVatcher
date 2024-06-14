<script setup>
import {onMounted, ref} from "vue";
import {useGenAi} from "../composables/useGenAi.js";

const key = ref();
const responseStatus = ref('');
const checking = ref(false);
const validKEY = ref(false);

onMounted(async () => {
  checking.value = true;
  const response = await chrome.runtime.sendMessage({type: 'CHECKKEY'})
  if (response.status === 'success') {
    key.value = response.key;
    responseStatus.value = 'Key found on local storage.';
  } else {
    responseStatus.value = 'Key NOT found on local storage.';
    key.value = '';
  }
  checking.value = false;
});
const addKey = () => {
  checkGenAi();
}
const removeKey = async () => {
  validKEY.value = false;
  const response = await chrome.runtime.sendMessage({type: 'REMOVEKEY'});
  if (response.status === 'success') {
    responseStatus.value = 'Key Removed';
    key.value = '';
  }
  //AIzaSyBtz1N_2HB1UQHLkdtxJtWFaIBTd1CeO8E
}
const checkGenAi = async () => {
  try {
    validKEY.value = false;
    checking.value = true;
    const modelType = 'gemini-1.5-pro-latest';
    const apiKey = key.value;
    const model = await useGenAi(modelType, apiKey);
    await model.generateContent('test');
    responseStatus.value = "Key is valid.";
    const response = await chrome.runtime.sendMessage({ type: 'STOREKEY', key: key.value });
    if (response.status === 'success') {
      responseStatus.value = "Key is valid and stored on your local storage";
    }
    validKEY.value = true;
  } catch (err) {
    validKEY.value = false;
    const response = await chrome.runtime.sendMessage({ type: 'REMOVEKEY'});
    if (response.status === 'success') {
      responseStatus.value = err;
      key.value = '';
    }
  } finally {
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
          :loading="checking"
          :disabled="checking || validKEY"
          v-model="key"
          density="compact"
          placeholder="Gemini API Key"
          prepend-inner-icon="mdi-key"
          :append-icon="validKEY ? 'mdi-shield-check' : 'mdi-shield-alert'"
          variant="outlined"
      ></v-text-field>

      <v-row justify="center">
        <v-col cols="12">
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
        </v-col>

        <v-col cols="12">
          <v-btn
              :disabled="key === '' || checking"
              color="blue"
              size="large"
              variant="tonal"
              block
              text="Check API Key"
              append-icon="mdi-shield-sync"
              @click="addKey"
          >
          </v-btn>
        </v-col>

        <v-col cols="12">
          <v-btn
              :disabled="checking || key === ''"
              color="blue"
              size="large"
              variant="tonal"
              block
              text="Remove API Key"
              append-icon="mdi-key-remove"
              @click="removeKey"
          >
          </v-btn>
        </v-col>
      </v-row>

    </v-container>
  </div>
  <p v-if="responseStatus" class="text-center">
    {{ responseStatus }}
  </p>
</template>