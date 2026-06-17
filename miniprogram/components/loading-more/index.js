/**
 * 加载更多指示器组件
 *
 * Props:
 *   loading — 是否加载中
 *   hasMore — 是否还有更多
 *   count   — 当前已加载条数（用于显示 "已加载 N 条"）
 *
 * 三种状态：
 *   loading=true           → "加载中..."
 *   loading=false, hasMore=false, count>0 → "— 已加载全部 —"
 *   loading=false, hasMore=false, count=0 → 不显示（由 empty-state 处理）
 */
Component({
  properties: {
    loading: {
      type: Boolean,
      value: false,
    },
    hasMore: {
      type: Boolean,
      value: true,
    },
    count: {
      type: Number,
      value: 0,
    },
  },
});
