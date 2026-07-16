# G20 → G80 M3 | 3D Configurator

BMW G20 330i şasisi tek ve sabit taban model olarak sahnede durur; sağdaki panelden
G80 M3'ün gerçek parçalarını (ön tampon, arka tampon, kaput, farlar, karbon spoiler)
tek tek G20 üzerinden söküp G80'den takabilirsiniz. Three.js (r160) ile yazılmıştır,
build aracı gerektirmez.

## Nasıl çalıştırılır

Model dosyaları büyük olduğu için (`.glb`) tarayıcılar bunları `file://` üzerinden
doğrudan açmaya izin vermez (CORS kısıtlaması). Klasörü yerel bir sunucu ile açın:

```bash
cd bmw-configurator
python3 -m http.server 8080
```
Sonra tarayıcıda **http://localhost:8080** adresini açın.

## Parça değişimi nasıl çalışıyor?

1. G20 330i sahneye yüklenip sabit taban olarak durur.
2. Bir parça (örn. "Ön Tampon & Izgara") işaretlendiğinde:
   - G80 M3 modeli (henüz yüklenmediyse) arka planda indirilir — sadece **parça kaynağı**
     olarak kullanılır, kendisi hiçbir zaman doğrudan sahneye eklenmez.
   - G20'nin o parçasına ait gerçek mesh'lerin dünya-uzayı boyutu/konumu hesaplanır.
   - G80'in karşılık gelen gerçek mesh'leri klonlanıp bu ölçü/konuma otomatik olarak
     ölçeklenip taşınır (bounding-sphere hizalama).
   - G20'nin orijinal parçası gizlenir, yerine G80'den gelen parça gösterilir.
3. Parçayı kaldırırsanız G20'nin orijinal parçası geri görünür.

Bu hizalama **otomatik ve geometriye dayalıdır** (uydurma/simülasyon değildir) — iki
farklı kaynaktan gelen gerçek mesh'ler kullanılır. Ancak iki model bağımsız sanatçılar
tarafından farklı ölçeklerde üretildiği için hizalama **yaklaşık**tır; vida deliği
hassasiyetinde bir CAD birleşimi değildir. Gerekirse `main.js` içindeki her parçanın
ölçek/konum hesaplamasına küçük bir ince-ayar (offset) eklenebilir.

## Gerçek parça değişimi olan alanlar

- **Ön Tampon & Izgara** — G20'nin ön tamponu/ızgarası ↔ G80 M3'ün competition tamponu/CSL ızgarası
- **Arka Tampon & Bagaj** — G20'nin arka tamponu/bagaj kapağı ↔ G80'in arka tamponu/bagaj paneli
- **Kaput** — G20'nin kaputu ↔ G80'in çift çentikli agresif kaputu
- **Farlar** — G20'nin farları ↔ G80/M4 2024 LED far grubu (aç/kapa emisif efektiyle)
- **Karbon Arka Spoiler** — G20'de karşılığı yok; G80'den doğrudan eklenir (bagaj üstüne otomatik yerleştirilir)

## Renk özelleştirme (gerçek boya/jant mesh'leri üzerinde çalışır)

- **Gövde Rengi** — G20'nin kendi boya mesh'leri (kapılar, kaput, bagaj, vb.) + takılıysa
  G80'den gelen parçaların boya yüzeyleri aynı anda renklenir
- **Jant Rengi** — G20'nin jant göbeği (hub) mesh'leri üzerinde çalışır

> Not: Bu sürümde jant/lastik **geometrisi** değiştirilmiyor (yalnızca rengi), çünkü
> G20 modelinde tekerlekler tek bir iskelete (skin/bone) bağlı ve 4 tekerlek de aynı
> jenerik mesh adını paylaşıyor — köşeleri güvenilir şekilde ayırt edip G80'in jant
> geometrisiyle değiştirmek bu haliyle mümkün değil. Kaliper rengi de aynı sebeple
> (G20'de ayrı bir kaliper mesh'i bulunmadığından) bu sürümde yok.

## Bire bir (tam) oturtma: Kalibrasyon Modu

Otomatik hizalama (bounding-sphere) iyi bir başlangıç noktası verir ama iki farklı
sanatçının modelini birleştirdiğimiz için bazen tam oturmayabilir. Bunu elle
düzeltmek için panelde **"Kalibrasyon Modu"** var:

1. Önce ilgili parçayı (örn. "Ön Tampon & Izgara") normal şekilde takın.
2. **Kalibrasyon Modunu Aç**'ı işaretleyin — sahnede parçanın üzerinde bir
   taşıma/döndürme/ölçekleme gizmosu belirir.
3. Açılır menüden ayarlamak istediğiniz parçayı seçin.
4. **Taşı / Döndür / Ölçek** butonlarıyla gizmo modunu değiştirip, fareyle
   sürükleyerek parçayı G20'nin gövdesine tam oturana kadar ayarlayın.
5. Beğendiğinizde **"Değerleri Kopyala"** butonuna basın — panoya (ve konsola)
   şuna benzer bir satır kopyalanır:
   ```js
   frontBumper: { position:[0.02,-0.01,0.15], rotation:[0,0.03,0], scale:[1.04,1.04,1.04] },
   ```
6. Bu satırı `main.js` dosyasının başındaki `CALIBRATION` nesnesine yapıştırın
   (ilgili `null` değerinin yerine). Sayfayı yenileyip parçayı tekrar taktığınızda
   artık **her zaman** bu tam ayarlanmış konumla gelir — otomatik hizalama bir
   daha devreye girmez.
7. Bir ayardan memnun kalmazsanız **"Otomatik Hizalamaya Dön"** ile parçayı
   otomatik hesaplanan başlangıç konumuna sıfırlayabilirsiniz.

Bu şekilde her parçayı bir kez elle "vida deliği hizasına" getirip `main.js`
içine sabitleyerek, uygulamanın her açılışında bire bir doğru oturan, kalıcı
bir konfigürasyon elde edersiniz.


## Klasör yapısı

```
bmw-configurator/
├── index.html
├── style.css
├── main.js
├── models/
│   ├── g20_330i.glb   → sabit taban (BMW G20 330i, Sketchfab)
│   └── g80_m3.glb     → parça kaynağı (BMW M3 G80 2025, Sketchfab)
└── README.md
```

## Model kaynakları & lisans

- `models/g20_330i.glb` — Sketchfab, **KOElkast1007**, "BMW G20 330i"
  (Sketchfab Standard Lisansı): https://sketchfab.com/3d-models/bmw-g20-330i-87c972d41e9e4717b2d2db206bf315ae
- `models/g80_m3.glb` — Sketchfab, **Drifter Models✨ (Golden-Models)**, "BMW M3 G80 2025"
  (CC-BY-4.0 — atıf gerektirir): https://sketchfab.com/3d-models/bmw-m3-g80-2025-bb30c32dc0624ca89bd865aed5214ca3

Bu dosyaları yeniden dağıtırken ilgili lisans şartlarına uyun.
