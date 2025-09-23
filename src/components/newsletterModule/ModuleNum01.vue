<script setup lang="ts">
type ModuleTwoItem = {
  redtitle: string
  desc: string
}

const props = withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    items?: ModuleTwoItem[]
  }>(),
  {
    title: '',
    subtitle: '',
    items: () => [] as ModuleTwoItem[],
  },
)
</script>

<template>
  <table
    border="0"
    cellpadding="0"
    cellspacing="0"
    style="width: 100%; max-width: 680px; border-top: 2px solid #333333; margin: 0 auto"
    width="100%"
  >
    <tbody>
      <tr>
        <td
          style="
            padding: 15px 20px;
            text-align: center;
            font-size: 22px;
            font-weight: 700;
            color: #111111;
            word-break: keep-all;
            font-family:
              AppleSDGothic,
              malgun gothic,
              nanum gothic,
              Noto Sans KR,
              sans-serif;
          "
        >
          {{ props.title }}
        </td>
      </tr>
    </tbody>
  </table>

  <table
    align="center"
    border="0"
    cellpadding="0"
    cellspacing="0"
    style="max-width: 680px; width: 100%; border-collapse: collapse"
    width="100%"
  >
    <tbody>
      <tr>
        <td
          align="center"
          style="
            padding: 20px;
            font-size: 14px;
            font-weight: 400;
            color: #333333;
            word-break: keep-all;
            letter-spacing: -0.03em;
            line-height: 1.7em;
            font-family:
              AppleSDGothic,
              malgun gothic,
              nanum gothic,
              Noto Sans KR,
              sans-serif;
          "
        >
          {{ props.subtitle }}
        </td>
      </tr>
      <tr>
        <td style="padding: 0px 20px">
          <table
            align="center"
            border="0"
            cellpadding="0"
            cellspacing="0"
            style="
              max-width: 680px;
              width: 100%;
              border-collapse: collapse;
              background: #f5f5f5;
              bgcolor: #f5f5f5;
            "
          >
            <tbody>
              <tr>
                <td
                  style="
                    font-size: 14px;
                    color: #333333;
                    word-break: keep-all;
                    padding: 15px 20px 5px 20px;
                    letter-spacing: -0.03em;
                    line-height: 1.7em;
                    font-family:
                      AppleSDGothic,
                      malgun gothic,
                      nanum gothic,
                      Noto Sans KR,
                      sans-serif;
                  "
                >
                  <template v-if="props.items.length">
                    <div
                      v-for="(item, index) in props.items"
                      :key="index"
                      style="margin-bottom: 12px"
                    >
                      <span style="color: #eb2a25; font-weight: 700">
                        {{ item.redtitle || `아이템 ${index + 1}` }}
                      </span>
                      <br />
                      {{ item.desc || `설명 ${index + 1}` }}
                    </div>
                  </template>
                  <template v-else>
                    <div style="margin-bottom: 12px">
                      <span style="color: #eb2a25; font-weight: 700">Highlight title example</span>
                      <br />
                      Example body copy for this highlight item.
                    </div>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
      <tr>
        <td height="40px;"></td>
      </tr>
    </tbody>
  </table>
</template>
