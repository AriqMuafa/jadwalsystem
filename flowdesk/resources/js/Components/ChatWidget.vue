<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { router, usePage } from '@inertiajs/vue3';
import { useTaskStore } from '../Stores/useTaskStore';

const page = usePage();
const store = useTaskStore();

const comments = computed(() => page.props.globalComments || []);
const currentUser = computed(() => page.props.currentUser || null);

const isOpen = ref(false);
const newMessage = ref('');
const unreadCount = ref(0);
const rootEl = ref(null);
const messagesContainer = ref(null);
const lastKnownCommentId = ref(comments.value.at(-1)?.id || 0);

const isOwnMessage = (msg) => {
  if (typeof msg.is_own === 'boolean') return msg.is_own;
  if (currentUser.value?.id && msg.user_id) return msg.user_id === currentUser.value.id;
  return msg.user === 'Anda';
};

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

const openChat = () => {
  isOpen.value = true;
  unreadCount.value = 0;
  lastKnownCommentId.value = comments.value.at(-1)?.id || lastKnownCommentId.value;
  scrollToBottom();
};

const closeChat = () => {
  isOpen.value = false;
};

const toggleChat = () => {
  if (isOpen.value) {
    closeChat();
  } else {
    openChat();
  }
};

const handleOutsidePointer = (event) => {
  if (!isOpen.value || rootEl.value?.contains(event.target)) return;
  closeChat();
};

watch(comments, (newComments) => {
  const latestId = newComments.at(-1)?.id || 0;
  const unseenMessages = newComments.filter((msg) => msg.id > lastKnownCommentId.value);

  if (isOpen.value) {
    unreadCount.value = 0;
    lastKnownCommentId.value = latestId;
    scrollToBottom();
    return;
  }

  const incomingCount = unseenMessages.filter((msg) => !isOwnMessage(msg)).length;
  if (incomingCount > 0) {
    unreadCount.value += incomingCount;
  }

  lastKnownCommentId.value = latestId;
}, { deep: true });

const sendComment = () => {
  const bodyText = newMessage.value.trim();
  if (!bodyText) return;

  newMessage.value = '';

  router.post('/comments/global', {
    body: bodyText,
  }, {
    preserveScroll: true,
    preserveState: true,
    onSuccess: () => {
      unreadCount.value = 0;
      scrollToBottom();
    },
    onError: (errors) => {
      console.error('Gagal mengirim pesan:', errors);
      alert('Gagal mengirim pesan. Silakan coba lagi.');
      newMessage.value = bodyText;
    },
  });
};

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsidePointer);
});

onUnmounted(() => {
  document.removeEventListener('pointerdown', handleOutsidePointer);
});
</script>

<template>
  <div
    ref="rootEl"
    class="fixed right-6 z-[99] transition-[bottom] duration-300"
    :class="store.selectedTasks.length > 0 ? 'bottom-56 md:bottom-6' : 'bottom-44 md:bottom-6'"
  >
    <div
      class="absolute bottom-16 right-0 w-[22rem] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-sand-200 flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right"
      :class="isOpen ? 'scale-100 opacity-100' : 'scale-75 opacity-0 pointer-events-none'"
      style="height: 430px;"
    >
      <div class="bg-ink text-sand-50 px-4 py-3 flex items-center justify-between shadow-sm z-10">
        <div class="min-w-0">
          <h3 class="text-sm font-semibold truncate">Grup Tim</h3>
          <p class="text-[10px] text-sand-300">{{ comments.length }} pesan proyek</p>
        </div>
        <button
          type="button"
          class="w-8 h-8 rounded-full flex items-center justify-center text-sand-300 hover:text-sand-50 hover:bg-sand-800/40 transition-colors"
          title="Tutup chat"
          @click="closeChat"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div ref="messagesContainer" class="flex-1 p-4 bg-sand-50/50 overflow-y-auto space-y-4">
        <div v-if="comments.length === 0" class="h-full flex items-center justify-center text-center text-sm text-ink-muted">
          Belum ada percakapan.
        </div>

        <div
          v-for="msg in comments"
          v-else
          :key="msg.id"
          class="flex flex-col max-w-[85%]"
          :class="isOwnMessage(msg) ? 'ml-auto items-end' : 'items-start'"
        >
          <span class="text-[10px] text-ink-muted mb-1 px-1">{{ isOwnMessage(msg) ? 'Anda' : msg.user }}</span>
          <div
            class="px-3 py-2 rounded-xl text-[13px] leading-relaxed shadow-sm break-words"
            :class="isOwnMessage(msg) ? 'bg-ink text-sand-50 rounded-tr-none' : 'bg-white border border-sand-200 text-ink rounded-tl-none'"
          >
            {{ msg.body }}
          </div>
          <span class="text-[9px] text-sand-400 mt-1 px-1">{{ msg.time }}</span>
        </div>
      </div>

      <form @submit.prevent="sendComment" class="p-3 bg-white border-t border-sand-100 flex items-end gap-2">
        <textarea
          v-model="newMessage"
          rows="1"
          placeholder="Ketik pesan..."
          class="flex-1 bg-sand-50 border border-sand-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ink/30 resize-none max-h-24"
          @keydown.enter.prevent="sendComment"
        ></textarea>
        <button
          type="submit"
          class="bg-ink text-sand-50 w-10 h-10 rounded-full flex items-center justify-center shrink-0 hover:bg-ink-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="!newMessage.trim()"
          title="Kirim"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </form>
    </div>

    <button
      type="button"
      @click="toggleChat"
      class="w-14 h-14 bg-ink text-sand-50 rounded-full shadow-lg flex items-center justify-center hover:bg-ink-light transition-transform hover:scale-105 active:scale-95 relative"
      title="Buka Grup Obrolan"
    >
      <svg v-if="!isOpen" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
      <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>

      <span
        v-if="unreadCount > 0 && !isOpen"
        class="absolute -top-1 -right-1 min-w-5 h-5 px-1 flex items-center justify-center rounded-full bg-rose text-[10px] font-bold text-white shadow-sm border-2 border-sand-50"
      >
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>
    </button>
  </div>
</template>
