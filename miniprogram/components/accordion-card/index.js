/**
 * 手风琴卡片组件 — 风格选材向导品类折叠卡
 *
 * Props:
 *   title — 品类名称（如"瓷砖"）
 *   number — 步骤序号 1-7（对应 num-N.svg 图标）
 *   selectedLabel — 已选材料名称（completed 折叠时显示）
 *   expanded — 是否展开
 *   completed — 是否已完成选择
 *
 * Events:
 *   bind:toggle — 点击头部展开/收起（不用 tap，避免与原生 tap 双触发）
 *
 * Slot: 默认插槽 — 展开时显示的卡片内容
 */
Component({
  properties: {
    title: { type: String, value: '' },
    number: { type: Number, value: 1 },
    selectedLabel: { type: String, value: '' },
    expanded: { type: Boolean, value: false },
    completed: { type: Boolean, value: false },
  },

  methods: {
    onToggle() {
      this.triggerEvent('toggle');
    },
  },
});
