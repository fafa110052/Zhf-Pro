Component({
  properties: {
    banners: { type: Array, value: [] },
    height: { type: Number, value: 340 },
    autoplay: { type: Boolean, value: true },
    interval: { type: Number, value: 4000 },
    slogan: { type: String, value: '' },
    subtitle: { type: String, value: '' },
  },
  data: {
    currentSwiperIndex: 0,
  },
  methods: {
    onSwiperChange(e) {
      this.setData({ currentSwiperIndex: e.detail.current });
    },
    onBannerTap(e) {
      var index = e.currentTarget.dataset.index;
      var banner = this.properties.banners[index] || {};
      this.triggerEvent('tap', { id: banner.id, link: banner.link, index: index });
    },
  },
});
