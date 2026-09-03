<script setup lang="ts">
/**
 * '같은 이름의 파일이 이미 있어요' 확인 — 모달판.
 *
 * 처음 올릴 때는 업로드 자리(점선 상자)에 같은 안내가 인라인으로 뜬다(ImageUploadField).
 * 다듬기 모달에서 '적용하기'를 눌렀을 때는 그 모달을 닫지 않고 **위에** 이걸 띄운다.
 * 되돌아가는 길은 헤더의 X 하나다(전체 삭제 확인창과 같은 모양) — 버튼은 올리는 두 가지뿐이라
 * 어느 쪽을 눌러도 이미지는 올라가고, 먼저 올린 파일을 남기느냐(새 이름) 대체하느냐만 갈린다.
 */
defineProps<{
  visible: boolean
  /** 올리려는 이름 — 안내에 보여 준다 */
  fileName?: string
}>()

const emit = defineEmits<{
  /** X 로 닫기 — 자르던 화면으로 돌아간다 */
  cancel: []
  /** 'img(1).png'처럼 번호를 붙여 올린다 — 먼저 올린 파일은 그대로 남는다 */
  newName: []
  /** 같은 이름으로 덮어쓴다 */
  overwrite: []
}>()
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    header="같은 이름의 파일이 이미 있어요"
    :draggable="false"
    class="sn-dialog"
    :style="{ width: 'min(440px, 92vw)' }"
    @update:visible="(v: boolean) => !v && emit('cancel')"
  >
    <p class="sn-text">
      기존 파일을 덮어쓸까요?<br />
      새 이름으로 저장하면 먼저 올린 파일은 그대로 남아요.
    </p>
    <p v-if="fileName" class="sn-name" :title="fileName">{{ fileName }}</p>

    <template #footer>
      <div class="sn-actions">
        <button type="button" class="sn-btn" @click="emit('newName')">새 이름으로 저장</button>
        <button type="button" class="sn-btn sn-btn--primary" @click="emit('overwrite')">덮어쓰기</button>
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.sn-text {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: var(--gray-700);
}
.sn-name {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--gray-500);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sn-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  width: 100%;
}
.sn-btn {
  height: 40px;
  padding: 0 16px;
  white-space: nowrap;
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  background: var(--white);
  font-size: 14px;
  font-weight: 600;
  color: var(--gray-600);
  cursor: pointer;
}
.sn-btn:hover {
  background: var(--gray-50);
}
.sn-btn--primary {
  border-color: var(--blue-400);
  background: var(--blue-400);
  color: var(--white);
}
.sn-btn--primary:hover {
  background: var(--blue-500);
}
</style>
