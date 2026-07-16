/**
 * 步骤进度条组件 — 风格选材向导 7 步进度
 *
 * Props:
 *   steps — [{ label: '瓷砖' }, ...]
 *   current — 当前步骤（1-based）
 *
 * 状态图标：已完成 step-done / 当前 step-active / 未开始 step-pending
 */
Component({
  properties: {
    steps: { type: Array, value: [] },
    current: { type: Number, value: 1 },
  },
});
