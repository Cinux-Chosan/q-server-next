<script setup lang="ts">
import { ref } from 'vue';
import { api } from '../api';

defineProps<{ title: string }>();
const emit = defineEmits<{ (e: 'logged', username: string): void }>();

const username = ref('');
const password = ref('');
const error = ref('');
const busy = ref(false);

async function submit() {
  error.value = '';
  busy.value = true;
  const res = await api.login(username.value.trim(), password.value);
  busy.value = false;
  if (res.success) emit('logged', username.value.trim());
  else error.value = res.message;
}
</script>

<template>
  <div class="login-wrap">
    <form class="login-card" @submit.prevent="submit">
      <h1>{{ title }}</h1>
      <p>请登录后访问文件服务</p>
      <div class="row">
        <label>用户名</label>
        <input v-model="username" autocomplete="username" autofocus />
      </div>
      <div class="row">
        <label>密码</label>
        <input v-model="password" type="password" autocomplete="current-password" />
      </div>
      <div class="error">{{ error }}</div>
      <button class="primary" type="submit" :disabled="busy">{{ busy ? '登录中…' : '登 录' }}</button>
    </form>
  </div>
</template>
