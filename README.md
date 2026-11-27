# Kredi Kartı Takip

Poliçe tahsilatında kullanılan şahıs ve şirket kredi kartlarının işlemlerini kaydeden; kartları
kullanılabilir limit ve hesap kesim tarihine göre, müşterileri cari bakiyeye göre takip eden web uygulaması.

## Neler yapar

- **Kartlar:** limit, hesap kesim günü, son ödeme günü, asgari ödeme oranı. Kartın sadece ilk 4 ve son 4
  hanesi saklanır, tam numara ve CVV saklanmaz.
- **İşlem (çekim):** girildiği anda tutarın tamamı kart limitinden düşer. Taksitler hesap kesim gününe göre
  ekstrelere otomatik dağıtılır (kesim gününe eşit/önceki işlem o ayın ekstresine düşer, kuruş farkı ilk taksite eklenir).
  Bir çekim birden fazla poliçeye (farklı müşterilerin poliçeleri dahil) bölünebilir; her kalem kendi müşterisinin
  carisine borç yazılır. Çalışan için poliçe no zorunludur, yönetici poliçesiz (sadece müşteri seçerek) girebilir.
- **Döviz:** döviz seçilince TCMB efektif satış kuru getirilir, kullanıcı düzeltebilir. Tüm hesaplar TL karşılık üzerinden yürür.
- **İade:** asıl çekime bağlanır, kısmi olabilir. Limiti hemen açar, müşteri carilerinden poliçe paylarına göre düşer.
- **Kart ödemesi:** serbest tutar, ekstre borcunun tamamı veya asgari ödeme. Ödenen tutar limite geri eklenir.
- **Müşteri tahsilatı:** cari bakiyeden düşer; kart limitini etkilemez.
- **Açılış bakiyeleri:** kartın geçiş günündeki kullanılmış limiti, devam eden taksitler (limiti ikinci kez düşürmez)
  ve müşteri açılış bakiyesi.
- **Roller:** Yönetici her şeyi yapar. Çalışan günlük kayıtları girer; kart ve kullanıcı ayarlarını değiştiremez,
  sadece kendi girdiği kaydı aynı gün iptal edebilir.
- **Silme yok, iptal var:** iptal edilen kayıt hesaplara katılmaz ama kim, ne zaman, neden iptal etti görünür.
  Her ekleme/değişiklik/iptal değişiklik kaydına yazılır.

Ayrıntılı kurallar: [Veri yapısı ve yetkiler dokümanı](https://claude.ai/artifact/WcjrEdFB8G2LJHXjCPrmX7).

## Bulutta yayına alma (Neon + Vercel)

İkisinin de bu ölçek için ücretsiz planı yeterlidir. Toplam 15-20 dakika sürer.

1. **Veritabanı (Neon):** [neon.tech](https://neon.tech) üzerinde hesap açın, yeni proje oluşturun.
   Bölge olarak **Europe (Frankfurt)** seçin. Proje sayfasındaki bağlantı adresini (`postgresql://…`) kopyalayın.
2. **Uygulama (Vercel):** [vercel.com](https://vercel.com) üzerinde GitHub hesabınızla giriş yapın,
   "Add New → Project" ile bu depoyu seçin. "Environment Variables" bölümüne iki değer girin:
   - `DATABASE_URL`: Neon'dan kopyaladığınız adres
   - `SESSION_SECRET`: en az 32 karakterlik rastgele bir metin (ör. bir parola üreticisiyle)
   Bölge (Settings → Functions → Region) olarak da Frankfurt seçin, sonra **Deploy**'a basın.
   Yayına alma sırasında veritabanı tabloları otomatik oluşturulur.
3. Vercel'in verdiği adresi açın. İlk açılışta **İlk kurulum** sayfası gelir: yönetici hesabınızı oluşturun.
4. **Kullanıcılar** menüsünden çalışanları ekleyin, **Kartlar**'dan kartları girin, sonra **Açılış bakiyeleri**
   sayfasındaki üç adımı tamamlayın.

Sonraki her değişiklik `main` dalına birleştirildiğinde Vercel otomatik olarak yeniden yayına alır.

> Müşterilerin TCKN/VKN bilgisi kişisel veridir. Veritabanı ve uygulamanın AB bölgesinde (Frankfurt) olması ve
> GitHub deposunun **private** tutulması önerilir.

## Geliştirme

```bash
npm install
cp .env.example .env.local   # DATABASE_URL ve SESSION_SECRET'ı doldurun
npm run db:migrate           # tabloları oluşturur
npm run dev                  # http://localhost:3000
npm test                     # hesap ve kayıt kuralları testleri (gerçek veritabanı gerekmez)
```

Şema değişikliğinde `src/db/schema.ts` düzenlenir, `npm run db:generate` ile `drizzle/` altına yeni SQL dosyası üretilir.

Teknik: Next.js (App Router, server actions), PostgreSQL, Drizzle ORM. Tutarlar veritabanında kuruş cinsinden tam sayı tutulur.
