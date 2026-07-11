/**
 * 作品卡片组件 — 用于瀑布流/列表展示
 *
 * Props:
 *   work — { id, cover_url, title, area_text, budget_text, view_count, style_category_name }
 *   showMeta — 是否显示面积/预算/浏览量，默认 true
 *   showStyle — 是否显示风格标签，默认 false
 *
 * Events:
 *   bind:tap — 点击卡片，e.detail = { id }
 */
Component({
  properties: {
    work: {
      type: Object,
      value: {},
    },
    showMeta: {
      type: Boolean,
      value: true,
    },
    showStyle: {
      type: Boolean,
      value: false,
    },
  },

  data: {
    coverH: 320, // 默认最小高度，图片加载后动态更新
  },

  methods: {
    onTap() {
      this.triggerEvent('tap', { id: this.properties.work.id });
    },

    /** 图片加载完成 → 根据真实比例计算展示高度 */
    onCoverLoad(e) {
      var w = e.detail.width;
      var h = e.detail.height;
      if (!w || !h) return;

      // 列宽 ≈ 343rpx（750rpx屏 − 24*2页边距 − 16间距）/ 2
      var colW = 343;
      var naturalH = (h / w) * colW;
      var displayH = Math.max(320, Math.min(480, Math.round(naturalH)));
      this.setData({ coverH: displayH });
    },
  },
});
