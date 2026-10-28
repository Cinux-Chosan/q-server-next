<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { api, formatSize, type FileItem, type SysConf } from '../api';

const props = defineProps<{ conf: SysConf; username: string }>();
const emit = defineEmits<{ (e: 'need-logout'): void }>();

const files = ref<FileItem[]>([]);
const cwd = ref('.'); // 当前所处相对路径，'.' 表示根
const selected = ref<Set<string>>(new Set()); // 选中的相对路径
const loading = ref(false);
const drag = ref(false);
const uploadPct = ref(-1); // -1 表示未在上传

/** 从 URL 读取初始目录（支持深链分享：?dir=foo/bar） */
function readInitialDir(): string {
  const q = new URLSearchParams(window.location.search).get('dir');
  if (!q) return '.';
  const d = q.replace(/^\.\//, '').replace(/\/+$/, '');
  return d || '.';
}

// 初始加载不往历史里再压一条；之后每次进目录都 push，支持浏览器返回/前进
let skipNextPush = true;

/** 把当前目录同步到地址栏；进入新目录时压入浏览器历史 */
function syncUrl(): void {
  const url = new URL(window.location.href);
  if (cwd.value === '.') url.searchParams.delete('dir');
  else url.searchParams.set('dir', cwd.value);
  if (skipNextPush) {
    skipNextPush = false;
    window.history.replaceState(null, '', url.toString());
  } else {
    window.history.pushState(null, '', url.toString());
  }
}

/** 浏览器返回/前进时，按 URL 里的 dir 回退目录 */
function onPopState(): void {
  const q = new URLSearchParams(window.location.search).get('dir');
  const dir = q ? q.replace(/\/+$/, '') || '.' : '.';
  if (dir !== cwd.value) {
    cwd.value = dir;
    void load(dir);
  }
}

// 面包屑：把 cwd 拆成分段
const crumbs = computed(() => {
  if (cwd.value === '.') return [{ label: '根目录', path: '.' }];
  const parts = cwd.value.split('/');
  const arr = [{ label: '根目录', path: '.' }];
  let acc = '';
  for (const p of parts) {
    acc = acc ? `${acc}/${p}` : p;
    arr.push({ label: p, path: acc });
  }
  return arr;
});

async function load(dir = cwd.value) {
  loading.value = true;
  const res = await api.list(dir);
  files.value = res.result ?? [];
  selected.value = new Set();
  loading.value = false;
}

function open(item: FileItem) {
  if (!item.isDir) return;
  cwd.value = item.path;
  syncUrl();
  void load(item.path);
}

function go(path: string) {
  cwd.value = path;
  syncUrl();
  void load(path);
}

function toggleSelect(item: FileItem) {
  const key = item.path;
  if (selected.value.has(key)) selected.value.delete(key);
  else selected.value.add(key);
}

async function downloadSelected() {
  if (selected.value.size === 0) return;
  await api.download([...selected.value]);
}

async function downloadOne(item: FileItem) {
  await api.download([item.path]);
}

function onPickFiles(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files?.length) void uploadFiles(Array.from(input.files));
  input.value = '';
}

async function uploadFiles(list: File[]) {
  uploadPct.value = 0;
  for (const f of list) {
    try {
      await api.upload(f, cwd.value, (pct) => (uploadPct.value = pct));
    } catch (err) {
      alert(`上传失败：${(err as Error).message}`);
    }
  }
  uploadPct.value = -1;
  await load();
}

function onDrop(e: DragEvent) {
  drag.value = false;
  if (!props.conf.uploadable) return;
  const list = Array.from(e.dataTransfer?.files ?? []);
  if (list.length) void uploadFiles(list);
}

async function logout() {
  await api.logout();
  emit('need-logout');
}

function iconOf(item: FileItem) {
  if (item.isDir) return '📁';
  const img = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
  if (img.includes(item.ext)) return '🖼️';
  if (item.ext === '.zip' || item.ext === '.rar' || item.ext === '.7z') return '🗜️';
  if (['.mp4', '.mkv', '.avi'].includes(item.ext)) return '🎬';
  if (['.mp3', '.wav', '.flac'].includes(item.ext)) return '🎵';
  if (['.pdf'].includes(item.ext)) return '📄';
  return '📄';
}

onMounted(() => {
  const initial = readInitialDir();
  cwd.value = initial;
  syncUrl();
  void load(initial);
  window.addEventListener('popstate', onPopState);
});
</script>

<template>
  <div class="shell">
    <div class="topbar">
      <div class="brand">{{ conf.title }}</div>
      <div>
        <span v-if="username" class="who">{{ username }} · </span>
        <button v-if="conf.login" @click="logout">退出</button>
      </div>
    </div>

    <div class="breadcrumb">
      <template v-for="(c, i) in crumbs" :key="c.path">
        <a v-if="i < crumbs.length - 1" @click="go(c.path)">{{ c.label }}</a>
        <span v-else class="current">{{ c.label }}</span>
        <span v-if="i < crumbs.length - 1" class="sep">/</span>
      </template>
    </div>

    <div v-if="conf.uploadable"
         class="dropzone"
         :class="{ drag }"
         @dragover.prevent="drag = true"
         @dragleave.prevent="drag = false"
         @drop.prevent="onDrop">
      把文件拖到这里上传到当前目录
      <div v-if="uploadPct >= 0" class="progress"><i :style="{ width: uploadPct + '%' }"></i></div>
    </div>

    <div class="toolbar">
      <button class="primary" :disabled="selected.size === 0" @click="downloadSelected">
        下载选中 ({{ selected.size }})
      </button>
      <label v-if="conf.uploadable" class="badge ok" style="cursor:pointer">
        选择文件上传
        <input type="file" multiple hidden @change="onPickFiles" />
      </label>
      <span class="spacer"></span>
      <span class="badge">上限 {{ formatSize(conf.limit) }}</span>
      <span v-if="loading" class="badge">加载中…</span>
    </div>

    <table>
      <thead>
        <tr>
          <th class="check" v-if="conf.uploadable || true"></th>
          <th>名称</th>
          <th class="size">大小</th>
          <th class="mtime">修改时间</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="cwd !== '.'">
          <td></td>
          <td><span class="fname" style="color:var(--muted)" @click="go(cwd.split('/').slice(0,-1).join('/') || '.')">⬆ 上级目录</span></td>
          <td class="size"></td><td class="mtime"></td>
        </tr>
        <tr v-for="f in files" :key="f.path" @click="open(f)">
          <td class="check" @click.stop>
            <input type="checkbox" :checked="selected.has(f.path)" @change="toggleSelect(f)" />
          </td>
          <td>
            <span class="fname">
              <span class="icon">{{ iconOf(f) }}</span>
              <span>{{ f.name }}</span>
            </span>
          </td>
          <td class="size">{{ f.isDir ? '—' : formatSize(f.size) }}</td>
          <td class="mtime">{{ new Date(f.modifiedAt).toLocaleString() }}</td>
        </tr>
        <tr v-if="!loading && files.length === 0">
          <td colspan="4" class="empty">空目录</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
