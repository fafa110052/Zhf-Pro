/**
 * 图标字体 zhficon 码位表（Lucide 线性，替代 emoji）
 *
 * 用法：
 *   - WXML 静态图标：<text class="X-icon zhficon">&#xf103;</text>（十六进制字符实体，f103=search）
 *   - 数据驱动/组件：引入本表取字符，如 IC.search，绑定 {{IC.xxx}}
 *   字体在 app.wxss 内以 base64 内嵌，.zhficon 类提供 font-family；颜色/大小由使用处原类继承。
 */
const IC = {
  search: '\uf103',
  alert: '\uf11a',
  user: '\uf102',
  image: '\uf10d',
  eye: '\uf115',
  inbox: '\uf10c',
  flame: '\uf113',
  house: '\uf10e',
  clipboard: '\uf116',
  package: '\uf108',
  party: '\uf106',
  palette: '\uf107',
  hammer: '\uf111',
  checkCircle: '\uf117',
  ruler: '\uf104',
  file: '\uf114',
  chart: '\uf118',
  leaf: '\uf10b',
  bulb: '\uf119',
  hardhat: '\uf10f',
  phone: '\uf105',
  login: '\uf10a',
  wrench: '\uf101',
  folder: '\uf112',
  logout: '\uf109',
  hand: '\uf110',
  pencil: '\uf11b',
  calendar: '\uf11c',
  message: '\uf11d',
  camera: '\uf11e',
  save: '\uf11f',
  info: '\uf120',
  upload: '\uf121',
  circleX: '\uf122',
  hourglass: '\uf123',
  trophy: '\uf124',
  refresh: '\uf125',
  droplet: '\uf126',
};

module.exports = { IC };
