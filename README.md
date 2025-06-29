# WebRTC Görüntülü Arama Uygulaması

Bu proje, WebRTC ve WebSocket protokolü kullanılarak geliştirilmiş bir görüntülü arama uygulamasıdır. Hem masaüstü hem de web tabanlı erişim imkanı sunmaktadır.

## Özellikler

- **Gerçek Zamanlı Video ve Ses İletişimi**: WebRTC teknolojisi ile düşük gecikmeli iletişim
- **Web ve Masaüstü Desteği**: Hem tarayıcı hem de masaüstü uygulaması olarak kullanılabilme
- **Güvenli Bağlantı**: WebSocket Secure (WSS) ile şifreli iletişim
- **Otomatik NAT/Firewall Geçişi**: Ngrok tünel servisi entegrasyonu

## Nasıl Kullanılır

### Sunucuyu Başlatma

1. Node.js paketlerini yükleyin:
```bash
npm install
```

2. Sunucuyu başlatın:
```bash
node server.js
```

3. Ngrok tünel servisini başlatın (opsiyonel):
```bash
ngrok http 3000
```

### Bağlantı Kurma

1. Web tarayıcısından veya masaüstü uygulamasından erişin
2. Şifre ile kimlik doğrulama yapın (varsayılan: 1234)
3. Karşı tarafın bağlantı kurmasını bekleyin

## Teknoloji Yığını

- **Backend**: Node.js + WebSocket Server
- **Frontend**: HTML5, CSS3, JavaScript + WebSocket Client
- **Gerçek Zamanlı İletişim**: WebRTC + WebSocket
- **Tünel Servisi**: Ngrok
- **IDE Entegrasyonu**: Visual Studio

## Çalışma Prensibi

1. WebSocket bağlantısı kurulur (signaling için)
2. WebRTC Offer/Answer değişimi WebSocket üzerinden yapılır
3. ICE Candidates bilgileri paylaşılır
4. Peer-to-Peer direkt bağlantı kurulur
5. Video ve ses akışı direkt olarak peer'lar arasında gerçekleşir

## Güvenlik Özellikleri

- WebSocket Secure (WSS) ile şifreli bağlantı
- Şifre kontrolü ile kimlik doğrulama
- WebSocket session yönetimi
- Signaling mesaj doğrulama

## Performans Optimizasyonları

- WebSocket bağlantı havuzu
- Mesaj kuyruklama sistemi
- Bant genişliği yönetimi
- Otomatik hata kurtarma mekanizmaları

---
Geliştirici: Aydın Şaşik
