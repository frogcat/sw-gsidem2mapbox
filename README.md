# sw-gsidem2mapbox

[地理院標高タイル(PNG)](https://maps.gsi.go.jp/development/demtile.html) を [Mapbox Terrain-RGB (png)](https://docs.mapbox.com/help/getting-started/mapbox-data/#mapbox-terrain-rgb) に変換して返す、ServiceWorker です。

主に mapbox-gl-js version 2.x の環境で、地理院標高タイルをソースとした terrain や hillshade を実現することを目的としています。

# Demo

[![sw-gsidem2mapbox
](https://repository-images.githubusercontent.com/158367018/b931db00-e0ca-11eb-9b06-c81922777634)](https://frogcat.github.io/sw-gsidem2mapbox/)

- <https://frogcat.github.io/sw-gsidem2mapbox/>

# Usage

1. mapbox access token を作成します
2. index.html と sw-gsidem2mapbox.js を同一のフォルダに配置します
3. index.html の中に `mapboxgl.accessToken="pk...";` のような記載があるので、1 で作成した access token で置き換えます
4. index.html をブラウザで開きます

- 自分自身の Mapbox Access Token が必要です。このレポジトリに含まれる AccessToken はこのレポジトリ専用に発行したもので、別のドメインでは動作しません。
- ServiceWorker と、それを登録する index.html は Same Origin になければなりません。たとえば https://frogcat.github.io/sw-gsidem2mapbox/sw-gsidem2mapbox.js を別のドメインから register すると動作しません。


# Note

## sw-gsidem2mapbox.js

Service Worker の実装です。

[FetchEvent](https://developer.mozilla.org/ja/docs/Web/API/FetchEvent) を監視することで `https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png` に合致する URL へのアクセスに介入します。

`{z}` の値に応じて以下の URL に対して PNG の取得を試みます。複数の URL がある場合には、先頭から成功するまで順次試行されます。

| zoom | url |
| ------------- | ------------- |
| 1〜8  | https://cyberjapandata.gsi.go.jp/xyz/demgm_png/{z}/{x}/{y}.png  |
| 9〜14 | https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png  |
| 15 | https://cyberjapandata.gsi.go.jp/xyz/dem5a_png/{z}/{x}/{y}.png https://cyberjapandata.gsi.go.jp/xyz/dem5b_png/{z}/{x}/{y}.png https://cyberjapandata.gsi.go.jp/xyz/dem5c_png/{z}/{x}/{y}.png  |

PNG が正常に取得された場合には Mapbox Terrain-RGB 形式への変換を行い、その結果をクライアントに返します。
そうでなければ最後の失敗レスポンス (多くの場合は 404 Not Found) をクライアントに返します。


## index.html

mapbox-gl-js version 2.x を使用して、地理院タイル（写真）と地理院標高タイルによる terrain 表現をするデモです。

### ServiceWorker の登録と地図の初期化

```js
    (async function() {
      await navigator.serviceWorker.register("./sw-gsidem2mapbox.js");
      if (!navigator.serviceWorker.controller) {
        location.reload();
      } else {
        const map = new mapboxgl.Map({
          container: "map",
          style: style,
          hash: true
        });
        map.addControl(new mapboxgl.FullscreenControl());
        map.addControl(new mapboxgl.NavigationControl());
        map.addControl(new mapboxgl.ScaleControl());
      }
    })();
```

1. `navigator.serviceWorker.register()` によって、ServiceWorker を登録します
2. 登録後、このページがまだ ServiceWorker のコントロール下に置かれていない場合はページをリロードします（ServiceWorker のコントロール下になることが期待される）
3. ページが ServiceWorker のコントロール下に置かれている場合には地図を表示します

### 地理院標高タイルを使用するためのスタイル定義


以下のようなスタイルを使用しています。


```style.json
{
  "version": 8,
  "sources": {
    "raster": {
      "type": "raster",
      "minzoom": 2,
      "maxzoom": 18,
      "tileSize": 256,
      "tiles": [
        "https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg"
      ],
      "attribution": "<a href='https://maps.gsi.go.jp/development/ichiran.html'>地理院タイル</a>"
    },
    "terrain": {
      "type": "raster-dem",
      "minzoom": 1,
      "maxzoom": 15,
      "tileSize": 256,
      "tiles": [
        "https://cyberjapandata.gsi.go.jp/xyz/dem_png/{z}/{x}/{y}.png"
      ],
      "attribution": "<a href='https://maps.gsi.go.jp/development/ichiran.html'>地理院タイル</a>"
    }
  },
  "terrain": {
    "source": "terrain",
    "exaggeration": 1
  },
  "layers": [{
    "id": "raster",
    "source": "raster",
    "type": "raster",
    "maxzoom": 24
  }],
  "zoom": 12,
  "center": [138.78267, 35.28505],
  "pitch": 70,
  "bearing": -30
}
```

sources.terrain.tiles に、地理院標高タイルへの URL Template がセットされています。
この URL Template は mapbox-gl-js によって使用され、
<https://cyberjapandata.gsi.go.jp/xyz/dem_png/10/906/404.png> のような URL への HTTP Request が発行されます。

ServiceWorker はこのパターンの URL への HTTP Request に対して介入することで、
タイルの取得先を変更し、また、Mapbox Terrain-RGB 形式への変換を行います。






