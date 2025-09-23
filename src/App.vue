<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <!-- <header>
    <div class="wrapper">
      <nav>
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/about">About</RouterLink>
      </nav>
    </div>
  </header> -->
  <main class="wrap">
    <RouterView />
  </main>
</template>
<style scoped>
.wrap {
  font-family: 'Pretendard Variable', sans-serif;
  position: relative;
  width: 100%;
}
</style>
