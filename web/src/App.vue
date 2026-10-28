<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api, type SysConf } from './api';
import Login from './views/Login.vue';
import FileManager from './views/FileManager.vue';

const conf = ref<SysConf | null>(null);
const authed = ref(false);
const loading = ref(true);
const username = ref('');

async function bootstrap() {
  loading.value = true;
  const [confRes, meRes] = await Promise.all([api.sysConf(), api.me()]);
  conf.value = confRes.result;
  document.title = confRes.result.title;
  if (!confRes.result.login) {
    authed.value = true; // 开放模式，无需登录
  } else if (meRes.result) {
    authed.value = true;
    username.value = meRes.result.username;
  }
  loading.value = false;
}

function onLogged(u: string) {
  username.value = u;
  authed.value = true;
}

function onLogout() {
  authed.value = false;
  username.value = '';
}

onMounted(bootstrap);
</script>

<template>
  <div v-if="loading" class="login-wrap"><p style="color:var(--muted)">加载中…</p></div>
  <Login v-else-if="!authed" :title="conf?.title ?? ''" @logged="onLogged" />
  <FileManager
    v-else
    :conf="conf!"
    :username="username"
    @need-logout="onLogout"
  />
</template>
