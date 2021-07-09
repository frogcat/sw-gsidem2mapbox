const gsidem2mapbox = function(data) {
  var length = data.length;
  for (var i = 0; i < length; i += 4) {
    var rgb = (data[i] << 16) + (data[i + 1] << 8) + (data[i + 2]);
    var h = 0;
    if (rgb < 0x800000) h = rgb * 0.01;
    else if (rgb > 0x800000) h = (rgb - Math.pow(2, 24)) * 0.01;
    var rgb = Math.floor((h + 10000) / 0.1);
    data[i + 0] = (rgb & 0xff0000) >> 16;
    data[i + 1] = (rgb & 0x00ff00) >> 8;
    data[i + 2] = (rgb & 0x0000ff);
  }
};

self.addEventListener('fetch', (event) => {

  if (!event.request.url.match(/^https\:\/\/cyberjapandata\.gsi\.go\.jp\/xyz\/dem_png\/([0-9]+)\/([0-9]+)\/([0-9]+)\.png$/)) return;

  const z = parseInt(RegExp.$1);
  const x = parseInt(RegExp.$2);
  const y = parseInt(RegExp.$3);

  const urls = [];

  switch (z) {
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
    case 6:
    case 7:
    case 8:
      urls.push(`https://cyberjapandata.gsi.go.jp/xyz/demgm_png/${z}/${x}/${y}.png`);
      break;
    case 9:
    case 10:
    case 11:
    case 12:
    case 13:
    case 14:
      urls.push(`https://cyberjapandata.gsi.go.jp/xyz/dem_png/${z}/${x}/${y}.png`);
      break;
    case 15:
      urls.push(`https://cyberjapandata.gsi.go.jp/xyz/dem5a_png/${z}/${x}/${y}.png`);
      urls.push(`https://cyberjapandata.gsi.go.jp/xyz/dem5b_png/${z}/${x}/${y}.png`);
      urls.push(`https://cyberjapandata.gsi.go.jp/xyz/dem5c_png/${z}/${x}/${y}.png`);
      break;
    default:
      return;
  }

  event.respondWith(async function() {
    try {
      let res = await fetch(urls.shift());
      while (!res.ok && urls.length > 0)
        res = await fetch(urls.shift());

      if (!res.ok) {
        //console.info("not ok", res);
        return res;
      } else {
        //console.info("ok", res);
        const imageBitmap = await self.createImageBitmap(await res.blob());
        const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
        const context = canvas.getContext("2d");
        context.drawImage(imageBitmap, 0, 0);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        gsidem2mapbox(imageData.data);
        context.putImageData(imageData, 0, 0);
        return new Response(await canvas.convertToBlob(), {
          type: "image/png"
        });
      }
    } catch (e) {
      console.info("reject", e);
      throw e;
    };
  }());
});
