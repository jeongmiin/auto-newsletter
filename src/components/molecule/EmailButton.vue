<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    text?: string
    url?: string
    backgroundColor?: string
    textColor?: string
    borderRadius?: string
    fontSize?: string
    fontWeight?: string
    padding?: string
  }>(),
  {
    text: '버튼 텍스트',
    url: '#',
    backgroundColor: '#111111',
    textColor: '#ffffff',
    borderRadius: '5px',
    fontSize: '15px',
    fontWeight: '700',
    padding: '15px 0px',
  },
)
</script>

<template>
  <tr v-if="props.text && props.url">
    <td align="center" style="padding: 20px; box-sizing: border-box">
      <a
        :href="props.url"
        :style="{
          width: '100%',
          textDecoration: 'none',
          display: 'block',
          padding: props.padding,
          boxSizing: 'border-box',
          backgroundColor: props.backgroundColor,
          bgcolor: props.backgroundColor,
          borderRadius: props.borderRadius,
          textAlign: 'center',
          fontFamily: 'AppleSDGothic, malgun gothic, nanum gothic, Noto Sans KR, sans-serif',
          color: props.textColor,
          fontSize: props.fontSize,
          fontWeight: props.fontWeight,
        }"
        target="_blank"
      >
        {{ props.text }}
      </a>
    </td>
  </tr>
</template>
