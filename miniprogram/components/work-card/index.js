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

  methods: {
    onTap() {
      this.triggerEvent('tap', { id: this.properties.work.id });
    },
  },
});
