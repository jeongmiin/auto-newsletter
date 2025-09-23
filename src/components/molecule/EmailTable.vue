<script setup lang="ts">
interface TableRow {
  header: string
  content: string
}

const props = withDefaults(
  defineProps<{
    rows?: TableRow[]
  }>(),
  {
    rows: () => [] as TableRow[],
  },
)
</script>

<template>
  <tr v-if="props.rows.length > 0">
    <td style="padding: 0px 20px; box-sizing: border-box">
      <table
        align="center"
        width="100%"
        border="0"
        cellspacing="0"
        cellpadding="3"
        style="border-top: 2px #333333 solid"
      >
        <tbody>
          <tr v-for="(row, index) in props.rows" :key="index">
            <th
              scope="row"
              style="
                font-size: 14px;
                font-weight: 400;
                border-bottom: 1px #a7a7a7 solid;
                background: #f6f6f6;
                bgcolor: #f6f6f6;
                text-align: center;
                color: #333333;
                letter-spacing: -0.03em;
                line-height: 2em;
                font-family:
                  AppleSDGothic,
                  malgun gothic,
                  nanum gothic,
                  Noto Sans KR,
                  sans-serif;
                word-break: keep-all;
              "
              width="20%"
            >
              <strong>{{ row.header }}</strong>
            </th>
            <td
              style="
                font-size: 14px;
                font-weight: 400;
                border-bottom: 1px #a7a7a7 solid;
                background: #ffffff;
                bgcolor: #ffffff;
                text-align: left;
                word-break: keep-all;
                color: #333333;
                padding-left: 10px;
                letter-spacing: -0.03em;
                line-height: 2em;
                font-family:
                  AppleSDGothic,
                  malgun gothic,
                  nanum gothic,
                  Noto Sans KR,
                  sans-serif;
                box-sizing: border-box;
              "
              width="80%"
            >
              <span v-html="row.content.replace(/\n/g, '<br>')"></span>
            </td>
          </tr>
        </tbody>
      </table>
    </td>
  </tr>
</template>
