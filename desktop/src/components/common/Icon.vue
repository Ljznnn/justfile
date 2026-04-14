<script setup lang="ts">
defineProps<{
  name: string
  size?: string | number
  color?: string
}>()
</script>

<template>
  <i
    :class="`ri-${name}`"
    :style="{
      fontSize: size ? (typeof size === 'number' ? `${size}px` : size) : 'inherit',
      color: color || 'inherit'
    }"
  />
</template>