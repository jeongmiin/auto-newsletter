<script setup lang="ts">
import EmailTable from '@/components/molecule/EmailTable.vue'
import EmailButton from '@/components/molecule/EmailButton.vue'

interface TableRow {
  header: string
  content: string
}

const props = withDefaults(
  defineProps<{
    title?: string
    imageUrl?: string
    imageAlt?: string
    mainTitle?: string
    description?: string
    tableRows?: TableRow[]
    buttonText?: string
    buttonUrl?: string
    showTable?: boolean
    showButton?: boolean
  }>(),
  {
    title: '모듈02 타이틀 영역',
    imageUrl: 'https://design.messeesang.com/e-dm/newsletter/images/img-1column.png',
    imageAlt: '이미지',
    mainTitle:
      '2022 대한민국 기계설비전시회 사전등록 혜택 3가지!\n대한민국 기계설비전시회 홈페이지에서 사전등록 하시면 무료입장 가능',
    description:
      '기후변화와 탄소중립 2050 정책에 부응하여 기계설비기술을 선도하는 LH가 2022 기계설비전시회 에서 탄소중립 특별관을 운영합니다. 도시 및 주택의 제로에너지 정책 방향, 기존 주택 그린 리모델링, 저에너지 및 친환경 미래주택 기술을 선보일 예정이니 많은 관심 바랍니다.',
    tableRows: () =>
      [
        { header: '관람시간', content: '10:00 – 18:00 (입장마감 17:30)' },
        { header: '입장료', content: '일반 12,000원 / 단체(10인 이상) 사무국 별도 문의' },
        {
          header: '무료 입장 대상',
          content: '· 공공기관 및 공무원(공무원증 및 명함 지참)\n· 초청장 소지자, 사전등록자',
        },
      ] as TableRow[],
    buttonText: '버튼 명 →',
    buttonUrl: '#',
    showTable: false,
    showButton: false,
  },
)
</script>

<template>
  <!-- 섹션 타이틀 -->
  <table
    border="0"
    cellpadding="0"
    cellspacing="0"
    style="width: 100%; max-width: 680px; border-top: 2px solid #333333"
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
            box-sizing: border-box;
          "
        >
          {{ props.title }}
        </td>
      </tr>
    </tbody>
  </table>

  <!-- 콘텐츠 -->
  <table
    align="center"
    border="0"
    cellpadding="0"
    cellspacing="0"
    style="max-width: 680px; width: 100%; border-collapse: collapse"
    width="100%"
  >
    <tbody>
      <!-- 이미지 -->
      <tr>
        <td align="center" style="width: 100%; padding: 20px; box-sizing: border-box">
          <img :src="props.imageUrl" :alt="props.imageAlt" style="display: block; width: 100%" />
        </td>
      </tr>

      <!-- 메인 타이틀 -->
      <tr>
        <td
          style="
            padding: 0px 20px 15px;
            box-sizing: border-box;
            font-size: 18px;
            font-weight: 700;
            color: #333333;
            word-break: keep-all;
            letter-spacing: -0.03em;
            line-height: 1.5em;
            font-family:
              AppleSDGothic,
              malgun gothic,
              nanum gothic,
              Noto Sans KR,
              sans-serif;
          "
        >
          <span v-html="props.mainTitle.replace(/\n/g, '<br>')"></span>
        </td>
      </tr>

      <!-- 설명 -->
      <tr>
        <td
          style="
            padding: 0px 20px 20px;
            box-sizing: border-box;
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
          {{ props.description }}
        </td>
      </tr>

      <!-- 테이블 컴포넌트 -->
      <EmailTable
        v-if="props.showTable && props.tableRows && props.tableRows.length > 0"
        :rows="props.tableRows"
      />

      <!-- 버튼 컴포넌트 -->
      <EmailButton
        v-if="props.showButton && props.buttonText && props.buttonUrl"
        :text="props.buttonText"
        :url="props.buttonUrl"
      />

      <tr>
        <td height="20px"></td>
      </tr>
    </tbody>
  </table>
</template>
