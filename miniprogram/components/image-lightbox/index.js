/**
 * 图片放大 lightbox 组件 — 全屏预览 + 左右滑切换 + 放大态选中
 *
 * Props:
 *   images — [{ id, url, name?, title?, model?, specs?, lines?: [{label, value}] }]
 *     title — 主标题（优先于 name）
 *     lines — 动态信息行数组，每项 { label, value }；无 lines 时回退 model/specs
 *   currentIndex — 初始展示的图片下标
 *   visible — 是否显示
 *   selectedId — 已选中材料 id（当前图片命中时按钮显示"已选中"）
 *
 * Events:
 *   bind:close — 关闭（点击遮罩/关闭按钮）
 *   bind:select — 选中当前图片，detail = { index }
 */
Component({
  properties: {
    images: { type: Array, value: [] },
    currentIndex: { type: Number, value: 0 },
    visible: { type: Boolean, value: false },
    selectedId: { type: null, value: null },
  },

  data: {
    current: 0,
  },

  observers: {
    'visible, currentIndex': function (visible, currentIndex) {
      if (visible) this.setData({ current: currentIndex || 0 });
    },
  },

  methods: {
    onSwiperChange(e) {
      this.setData({ current: e.detail.current });
    },

    onClose() {
      this.triggerEvent('close');
    },

    onSelect() {
      this.triggerEvent('select', { index: this.data.current });
    },

    // catchtap/catchtouchmove 占位：阻止事件冒泡与滚动穿透
    noop() {},
  },
});
