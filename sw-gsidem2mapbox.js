importScripts("https://unpkg.com/geojson-vt@3.2.0/geojson-vt.js");
importScripts("https://frogcat.github.io/vt-pbf/vtpbf.bundle.js");

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

  if (url.match(/^https:\/\/cyberjapandata\.gsi\.go\.jp\/xyz\/[^/]+\/([0-9]+)\/([0-9]+)\/([0-9]+)\.geojson$/)) {
    var z = parseInt(RegExp.$1);
    var x = parseInt(RegExp.$2);
    var y = parseInt(RegExp.$3);

    var promise =
      fetch(url)
      .then(a => a.ok ? a.json() : {
        "type": "FeatureCollection",
        "features": []
      })
      .then(json => {
        var tileIndex = geojsonvt(json, {
          indexMaxZoom: z,
          maxZoom: z
        });
        var tile = tileIndex.getTile(z, x, y);
        if (tile) {
          return new Response(vtpbf.fromGeojsonVt({
            'geojsonLayer': tile
          }), {
            type: "application/vnd.mapbox-vector-tile"
          });
        } else {
          return new Response(null, {
            status: 404,
            statusText: "404 Not Found"
          });
        }
      });

    event.respondWith(promise);
    return;
  }

  if (url.indexOf("https://cyberjapandata.gsi.go.jp/xyz/dem_png/") !== 0) return;
  var zoom = parseInt(url.split("/")[5]);
  if (zoom === 15) url = url.replace("/dem_png/", "/dem5a_png/");
  else if (zoom <= 8) url = url.replace("/dem_png/", "/demgm_png/");

  var promise =
    fetch(url)
    .then(a => a.ok ? a.blob() : null)
    .then(blob => blob ? self.createImageBitmap(blob) : null)
    .then(image => {
      var canvas = new OffscreenCanvas(256, 256);
      var context = canvas.getContext("2d");
      if (image) {
        context.drawImage(image, 0, 0);
      } else {
        context.fillStyle = "#000000";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      gsidem2mapbox(imageData.data);
      context.putImageData(imageData, 0, 0);
      return canvas.convertToBlob();
    }).then(blob => {
      return new Response(blob, {
        type: "image/png"
      });
    });

  event.respondWith(promise);

});
