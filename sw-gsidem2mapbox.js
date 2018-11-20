self.importScripts('pngjs.js');

const decode = function(buffer) {
  return new Promise(resolve => {
    new png.PNG().parse(buffer, (error, data) => {
      if (error) resolve(null);
      else resolve(data);
    });
  });
};

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

  var url = event.request.url;
  if (url.indexOf("https://cyberjapandata.gsi.go.jp/xyz/dem_png/") !== 0) return;
  var zoom = parseInt(url.split("/")[5]);
  if (zoom === 15) url = url.replace("/dem_png/", "/dem5a_png/");
  else if (zoom <= 8) url = url.replace("/dem_png/", "/demgm_png/");

  var promise =
    fetch(url)
    .then(a => a.ok ? a.arrayBuffer() : null)
    .then(src => decode(src))
    .then(data => {
      if (!data) return Response.error();
      gsidem2mapbox(data.data);
      return new Response(png.PNG.sync.write(data), {
        type: "image/png"
      });
    });

  event.respondWith(promise);

});
