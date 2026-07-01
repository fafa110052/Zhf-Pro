Component({
  properties: {
    banners: { type: Array, value: [] },
    height: { type: Number, value: 340 },
    autoplay: { type: Boolean, value: true },
    interval: { type: Number, value: 4000 },
    dots: { type: Boolean, value: true },
    slogan: { type: String, value: '' },
    subtitle: { type: String, value: '' },
  },
  methods: {
    onSwiperChange(e) {},
    onBannerTap(e) {
      var index = e.currentTarget.dataset.index;
      var banner = this.properties.banners[index] || {};
      this.triggerEvent('tap', { id: banner.id, link: banner.link, index: index });
    },
  },
});
