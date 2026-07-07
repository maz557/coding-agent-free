# Coding Agent Free

<p align="center">
  <img src="https://img.shields.io/github/stars/maz557/coding-agent-free?style=for-the-badge&logo=github" alt="Yıldızlar"/>
  <img src="https://img.shields.io/github/license/maz557/coding-agent-free?style=for-the-badge" alt="Lisans"/>
  <img src="https://img.shields.io/github/last-commit/maz557/coding-agent-free?style=for-the-badge&logo=git" alt="Son Taahhüt"/>
  <img src="https://img.shields.io/badge/TypeScript-6.x-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/github/actions/workflow/status/maz557/coding-agent-free/ci.yml?branch=main&style=for-the-badge&logo=githubactions" alt="CI"/>
  <br/>
  <a href="#-neden-bu-ajan"><strong>Neden Bu Ajan?</strong></a> •
  <a href="#hızlı-başlangıç"><strong>Hızlı Başlangıç</strong></a> •
  <a href="#cli-arayüzü"><strong>CLI</strong></a> •
  <a href="#web-arayüzü"><strong>Web</strong></a> •
  <a href="#örnek-etkileşimler"><strong>Örnekler</strong></a>
</p>

<p align="center">
  🌐
  <a href="README.tr.md"><strong>Türkçe</strong></a> •
  <a href="README.md">English</a> •
  <a href="README.fa.md">فارسی</a> •
  <a href="README.ar.md">العربية</a> •
  <a href="README.es.md">Español</a> •
  <a href="README.fr.md">Français</a> •
  <a href="README.ur.md">اردو</a>
</p>

Terminalinizde **veya web tarayıcınızda** çalışan, **ücretsiz** bulut API'leri (OpenRouter, Groq, Google, DeepSeek, Mistral) ve **yerel** modeller (Ollama, LM Studio, Llama.cpp) ile desteklenen, etkileşimli bir yapay zeka kodlama asistanı. Dosyaları okur, yazar, arar, kopyalar, taşır ve siler; ayrıca shell komutlarını çalıştırır — tümü doğal dil araç çağrılarıyla.

> 💡 **Çevrimdışı hazır**: Yerel bir sunucu ile ajan tamamen çevrimdışı çalışır — internet gerekmez, hiçbir veri makinenizden çıkmaz.

## 🧠 Neden Bu Ajan?

| Sorun | Bu Ajan Nasıl Çözer |
|---------|--------------------------|
| Kodlama asistanları ayda 20$ (ChatGPT+, Claude Pro) | **%100 ücretsiz** — ücretsiz katman OpenRouter, Groq, Google, DeepSeek, Mistral + yerel modeller kullanır |
| Bir sağlayıcı çöker / hız sınırına takılır | **8 sağlayıcı** — 429'da otomatik geçiş + manuel `/model <n>` |
| İnternet erişimi yok / kısıtlı bölge | **Yerel modeller** (Ollama, LM Studio, Llama.cpp) — tamamen çevrimdışı |
| Bulut API'leri ile gizlilik endişeleri | **Sadece yerel modelleri** çalıştırın — makinenizden sıfır veri çıkışı |
| Kurulum çok karmaşık | **`npm run setup`** — interaktif sihirbaz, manuel `.env` düzenlemesi yok |
| Yapay zeka tehlikeli komutlar çalıştırır | **Güvenli mod** (`/safe`) — yalnızca beyaz listedeki shell komutları |
| Ajan döngülere takılır | **Akıllı tespit** — 3× aynı araç çağrısından sonra durdurur |
| Sağlayıcı hız sınırına takılır | **Otomatik geçiş** — 429'da sağlayıcıyı otomatik değiştirir |
| Uzun araç sonuçları token israfı | **Token sıkıştırma** — baş+kuyruk kırpma + yineleme temizleme |
| IDE'nizi ücretsiz modellerle kullanmak istiyorsunuz | **OpenAI-uyumlu API** — `npm run setup-ide` ile Cline, Continue.dev, Cursor bağlantısı |

## Hızlı Başlangıç

```bash
git clone https://github.com/maz557/coding-agent-free.git
cd coding-agent-free
npm install
```

İnteraktif kurulum sihirbazını çalıştırın (önerilir):
```bash
npm run setup
```

Veya `.env` dosyasını manuel oluşturun (en az bir sağlayıcı seçin):
```bash
# OpenRouter (en kolayı — 18+ ücretsiz araç çağrı modeli için tek anahtar)
echo "OPENROUTER_API_KEY=sk-or-v1-..." >> .env

# İsteğe bağlı sağlayıcılar:
echo "GROQ_API_KEY=gsk_..." >> .env      # Ultra hızlı çıkarım
echo "GOOGLE_API_KEY=AIza..." >> .env     # Gemini modelleri
echo "DEEPSEEK_API_KEY=sk-..." >> .env    # DeepSeek
echo "MISTRAL_API_KEY=..." >> .env        # Mistral modelleri
```

**Tamamen çevrimdışı (API anahtarı gerekmez):**
```bash
# 1. Kopyalama ve kurulum (yalnızca bir kez internet gerekir)
git clone https://github.com/maz557/coding-agent-free.git
cd coding-agent-free
npm install

# 2. Yerel model sunucunuzu başlatın (birini seçin):
#    ollama run qwen3:14b           # Ollama
#    # veya LM Studio / llama-server çalıştırın

# 3. Ajanı başlatın:
npm start

# 4. Ajan içinde, yerel modelinizi ekleyin:
#    Siz: /add 6 ollama:auto
#    Siz: /model 6
```

## CLI Arayüzü

```bash
npm start
```

> Windows'ta `run-cli.bat` dosyasına çift tıklayın.
> 📝 **RTL dilleri (Farsça, Arapça, Urduca, İbranice vb.):** Terminaliniz sağdan sola metni yanlış görüntülüyorsa, bunun yerine `run-cli-rtl.bat` kullanın — [WezTerm](https://wezfurlong.org/wezterm/) ile uygun BiDi desteğiyle başlatır.

## Web Arayüzü

```bash
npm run web
# Tarayıcınızda http://localhost:3000 adresini açın
```

> Windows'ta `run-web.bat` dosyasına çift tıklayın.

Web arayüzü, terminal ile aynı özellikleri destekler — akış yanıtları, araç çağrıları, model değiştirme (8 sağlayıcı + kullanıcı ön ayarları), güvenli mod geçişi, izin yolu ve konuşma sıfırlama. Bağımsız oturumlarla birden çok tarayıcı sekmesi desteklenir. CLI ve Web aynı model yapılandırmasını (`src/config/models.ts`) ve araç motorunu (`fileManager.ts`) paylaşır.

**v1.10'da yeni — Web arayüzü iyileştirmeleri:**
- **Diff Görüntüleyici** — dosya yazma, değiştirme veya ekleme işlemlerinde satır satır farklar (yeşil + / kırmızı -) gösterilir.
- **Oturum Yöneticisi** — oturum oluşturma, değiştirme; ilk mesajdan otomatik başlık, model ve mesaj sayısı gösterimi.
- **Eğik Çizgi Komutları** — `/active`, `/model 2`, `/safe`, `/allow`, `/reset`, `/models`, `/exit` web girişinde.
- **Yardım Modalı** — `?` butonu ile kullanım kılavuzu, model değiştirme, komut referansı ve diff görüntüleyici açıklaması.
- **SSE akışı** — `fetch` + `ReadableStream` kullanımı (`EventSource` bağımlılığı yok).

Web sunucusu ayrıca `http://localhost:3000/v1/chat/completions` adresinde bir **OpenAI-uyumlu API** sunar; böylece herhangi bir OpenAI-uyumlu istemci (Cline, Continue.dev, Cursor vb.), otomatik geçiş desteğiyle tek bir uç nokta üzerinden yapılandırdığınız sağlayıcıları kullanabilir.

IDE'nizi otomatik yapılandırın:
```bash
npm run setup-ide
```

Bu, **Cline**, **Continue.dev** ve **Cursor**'u, `.env` sağlayıcı anahtarlarınızı aynı yönlendirme üzerinden kullanarak yerel API proxy'sine yönlendirecek şekilde yapılandırır.

**Örnek oturum:**

```
┌──────────────────────────────────────────────────────────┐
│  💬 Coding Agent                       [🔒 Safe] [🌐 P] │
│  ──────────────────────────────────────────────────────── │
│                                                          │
│  Siz: create a hello.py that prints "Hello from Web UI"  │
│                                                          │
│  ⏳ Düşünüyor... [Model: openrouter/free]                 │
│                                                          │
│  🛠  write_file(path="hello.py", content="...")          │
│  ✔  Dosya yazıldı (25 bayt)                              │
│                                                          │
│  🛠  run_command(command="python hello.py")              │
│  ✔  Hello from Web UI                                    │
│                                                          │
│  Tamam! hello.py oluşturuldu ve çıktısı doğrulandı:      │
│  Hello from Web UI                                       │
│  ──────────────────────────────────────────────────────── │
│  [Mesaj girişi...                         ] [Gönder]     │
└──────────────────────────────────────────────────────────┘
```

> Model açılır menüsü, oturum ortasında 8 sağlayıcı ve kayıtlı ön ayarlarınız arasında geçiş yapmanızı sağlar. Akış yanıtları gerçek zamanlı olarak token token görünür.
> Başlıktaki **`?`** düğmesine tıklayarak kullanım kılavuzu, model değiştirme talimatları ve CLI komut eşdeğerlerini içeren bir yardım penceresi açabilirsiniz.

## Örnek Etkileşimler

**"Fibonacci sayılarını yazdıran bir Python betiği oluştur"**

Ajan dosyayı oluşturacak, kodu yazacak ve ardından doğrulamak için çalıştıracaktır:

```
Siz: write a fibonacci.py that prints first 20 numbers
⏳ Düşünüyor...
  🔧 write_file({"path":"fibonacci.py","content":"..."})
  🔧 run_command({"command":"python fibonacci.py"})
Ajan: Tamam! fibonacci.py oluşturuldu ve çıktı doğrulandı: 0, 1, 1, 2, 3, 5...
```

**"fetch() çağıran tüm TypeScript dosyalarını bul ve axios ile değiştir"**

```
Siz: find all .ts files with fetch() calls and change them to axios
  🔧 search_content({"pattern":"fetch(","filePattern":"*.ts"})
  🔧 read_file({"path":"src/api.ts"})
  🔧 replace_in_file({"path":"src/api.ts","old_str":"fetch(","new_str":"axios."})
Ajan: 3 dosya güncellendi (api.ts, users.ts, auth.ts).
```

**"Şu hatayı ayıkla: Cannot read property 'map' of undefined"**

Ajan ilgili dosyayı okur, kodu analiz eder, bir düzeltme önerir ve uygular.

## Özellikler

- **8 sağlayıcı** — OpenRouter, Groq, Google, DeepSeek, Mistral + Ollama, LM Studio, Llama.cpp
- **5 yerleşik ön ayar** — `openrouter/free` ile başlayın (çalışan ücretsiz modelleri otomatik keşfeder)
- **Kullanıcı ön ayarları** — `/save`, `/add`, `/remove` ile kendi modellerinizi kaydedin/ekleyin/kaldırın
- **Geri dönüş zinciri** — hız sınırında (429) sağlayıcılar arasında otomatik geçiş + model düzeyinde geri dönüşler
- **13 araç** — read, write, list (detaylı), create_folder, delete_file, delete_folder (özyinelemeli), append_file, copy_file, move_file, file_info, search_content, replace_in_file ve run_command
- **Token sıkıştırma** — uzun araç sonuçlarının baş+kuyruk kırpılması + otomatik yineleme temizleme
- **Kayan pencere bağlamı** — varsayılan olarak son 20 alışverişi tutar, token sınırı hatalarını önlemek için otomatik kırpar (`MAX_EXCHANGES` / `MAX_TOOL_RESULT_LENGTH` ile yapılandırılabilir)
- **Akıllı döngü tespiti** — bir araç 3+ kez aynı şekilde veya 5+ kez art arda çağrılırsa durdurur
- **Güvenli mod** (`--safe` / `/safe`) — yalnızca beyaz listedeki shell komutları
- **Kurulum sihirbazı** — `npm run setup` ile .env interaktif olarak yapılandırılır
- **Otomatik yeniden deneme** — üstel geri bildirim + 120s zaman aşımı (yerel modeller için 300s)
- **Zod doğrulama** — her araç girdi ve çıktısının çalışma zamanı tip kontrolü
- **CLI ve Web birleşik** — her iki arayüzde paylaşılan model yapılandırması, sistem istemi, araç motoru, sağlayıcı tanımları ve kullanıcı ön ayarları
- **opencode.json** — kapsamlı izin kuralları (100+ güvenli komut deseni otomatik izinli) ve daha temiz istemler için kırpılmış araç çıktısı
- **Araç çıktısı kırpma** — tüm araç sonuçları bağlamı temiz tutmak için 5000 karakterle sınırlandırılır (`MAX_TOOL_RESULT_LENGTH`)
- **Konuşma kalıcılığı** — oturumları yeniden başlatmalar arasında otomatik kaydetme/geri yükleme
- **Yapılandırılmış günlük kaydı** — `pino` ile (stderr, UI'ya müdahale etmez)

## Kullanılabilir Araçlar

| Araç | Açıklama |
|------|-------------|
| `read_file` | Bir dosyanın içeriğini okur |
| `write_file` | Bir dosyaya içerik yazar (oluşturur/üzerine yazar) |
| `list_files` | Dizin içeriğini listeler. Boyut + zaman damgaları için `details:true` kullanın |
| `create_folder` | Yeni bir klasör oluşturur |
| `delete_file` | Tek bir dosyayı siler |
| `delete_folder` | Bir klasörü siler. Boş olmayan klasörler için `recursive:true` ayarlayın |
| `append_file` | Varolan bir dosyaya içerik ekler |
| `copy_file` | Bir dosyayı kaynaktan hedefe kopyalar |
| `move_file` | Bir dosyayı taşır veya yeniden adlandırır |
| `file_info` | Ayrıntılı meta verileri alır (boyut, izinler, zaman damgaları) |
| `search_content` | Dosyalarda tam metin arar. `filePattern` (örn. `*.ts`) ve `maxResults` (varsayılan 50) destekler. 1MB'den büyük dosyaları atlar |
| `replace_in_file` | Tam metnin ilk geçtiği yeri değiştirir (büyük/küçük harf duyarlı) |
| `run_command` | Çalışma alanında bir shell komutu çalıştırır |

## Komutlar

| Komut | Açıklama |
|---------|-------------|
| `/model <n>` | n ön ayarına geç |
| `/save <n>` | Geçerli modeli n ön ayarı olarak kaydet |
| `/add <n> <m>` | m modelini n ön ayarı olarak ekle (`provider:model` veya sadece `model`) |
| `/remove <n>` | Bir kullanıcı ön ayarını kaldır |
| `/allow <p>` | Modelin çalışma alanı dışındaki bir yola erişmesine izin ver |
| `/safe` | Güvenli modu aç/kapat (yalnızca beyaz listedeki shell komutları) |
| `/models` | Tüm ön ayarları göster |
| `/active` | Geçerli aktif modeli göster |
| `/reset` | Konuşma geçmişini temizle (yeniden başlat) |
| `/list-providers` | Geçerli anahtarlara sahip sağlayıcıları göster (ve yerel sağlayıcılar) |
| `/exit` | Çıkış |

## Çoklu Sağlayıcı Kullanımı

Her ön ayar bir sağlayıcıya bağlıdır. `/model <n>` ile ön ayar değiştirmek API istemcisini otomatik olarak yeniden oluşturur:

```
Siz: /add 6 groq:openai/gpt-oss-120b
✅ 6. ön ayar eklendi: [Groq] openai/gpt-oss-120b

Siz: /model 6
✅ 6. ön ayara geçildi: [Groq] openai/gpt-oss-120b
   (şimdi Groq'un API'sini gpt-oss-120b ile kullanıyor)

Siz: /model 1
✅ 1. ön ayara geçildi: [OpenRouter] openrouter/free
   (OpenRouter'a geri dönüldü)
```

### Diğer sağlayıcılardan model ekleme

```
/add <n> <provider>:<model-id>
```

Örnekler:
```
/add 10 groq:llama-3.3-70b-versatile
/add 11 google:gemini-2.0-flash-exp
/add 12 deepseek:deepseek-chat
/add 13 mistral:codestral-latest
```

Sağlayıcıyı atlarsanız (örn. `/add 10 llama-3.3-70b-versatile`), geçerli ön ayarın sağlayıcısını varsayılan alır.

## Yerel Modeller (Ollama, LM Studio, Llama.cpp)

Ajan, sıfır yapılandırmayla OpenAI-uyumlu herhangi bir yerel sunucuyu destekler:

### Hızlı başlangıç

Yerel sunucunuzun çalıştığından emin olun, ardından:

```
Siz: /add 6 ollama:auto
✅ Otomatik algılanan model: llama3.2:latest
✅ 6. ön ayar eklendi: [Ollama] llama3.2:latest

Siz: /model 6
✅ 6. ön ayara geçildi: [Ollama] llama3.2:latest
```

Veya LM Studio için:

```
Siz: /add 7 lmstudio:auto
✅ 7. ön ayar eklendi: [LM Studio] qwen2.5-coder-7b-instruct
```

`:auto` anahtar kelimesi, ajana yerel sunucuya bağlanmasını ve yüklenen modeli otomatik olarak algılamasını söyler.

### Hızlı başlangıç — belirli yerel model

```bash
# Ollama — araç çağrı modeli çek ve sun
ollama pull llama3.2
ollama serve                  # 11434 portunda başlar

# Llama.cpp — bir GGUF modelini doğrudan sun
llama-server -m qwen2.5-coder-1.5b-instruct-q4_k_m.gguf --port 8080

# LM Studio — yerleşik lms CLI'ı kullanır
lms get llama-3.2-3b-instruct   # bir model indir
lms load llama-3.2-3b-instruct  # belleğe yükle
lms server start --port 1234    # API sunucusunu başlat
```

Ardından yerel modeli ajana ekleyin:
```
/add 6 ollama:auto
/add 7 lmstudio:auto
/add 8 llamacpp:auto
```

### Özel portlar

`.env` dosyasında belirtin:
```bash
OLLAMA_HOST=http://localhost:11434/v1
LMSTUDIO_HOST=http://localhost:1234/v1
LLAMACPP_HOST=http://localhost:8080/v1
```

### Gereksinimler

- **Ollama**: [İndir](https://ollama.ai) → `ollama pull llama3.2` → `ollama serve`
- **LM Studio**: [İndir](https://lmstudio.ai) → `lms get llama-3.2-3b-instruct` → `lms server start --port 1234`
- **Llama.cpp**: [İndir](https://github.com/ggerganov/llama.cpp) → Derleyin veya bir ikili dosya alın → `llama-server -m model.gguf --port 8080`
- Model, tam ajan işlevselliği için **araç çağrısını** (function calling) desteklemelidir.
- API anahtarı gerekmez — yerel sağlayıcılar başlangıç anahtar doğrulaması sırasında atlanır.
- Tüm yerel sağlayıcılar OpenAI-uyumlu API kullanır, bu nedenle ek paket gerekmez.

## Çalışma Alanı ve İzinler

Varsayılan olarak ajan yalnızca `./workspace` içindeki dosyalara erişebilir. Diğer yollara erişmek için:

### Seçenek 1: Varsayılan çalışma alanını değiştirin (kalıcı)

`.env` içinde `ALLOWED_DIR` ayarlayın:
```
ALLOWED_DIR=.          # proje kökü — her şeye erişim
ALLOWED_DIR=C:\path    # herhangi bir mutlak yol
```

### Seçenek 2: Yolları talep üzerine izin verin (oturum başına)

Model çalışma alanı dışındaki bir yola erişmeye çalıştığında:
```
❌ Araç Hatası: Erişim reddedildi: "C:\path" izin verilen dizinin dışında.
   Komutu kullanın: /allow "C:\path"
```

Şu şekilde erişim verin:
```
Siz: /allow "C:\path"
✅ İzin verildi: C:\path
```

İzinler yalnızca geçerli oturum için geçerlidir.

## Yerleşik Ön Ayarlar

| # | Model | Sağlayıcı | Hız | Notlar |
|---|-------|----------|-------|-------|
| 1 | `openrouter/free` | OpenRouter | değişir | Kullanılabilir ücretsiz modellere otomatik yönlendirme |
| 2 | Qwen 3 Next 80B | OpenRouter | orta | İyi genel amaçlı |
| 3 | Nemotron 3 Super 120B | OpenRouter | orta | 1M bağlam |
| 4 | OpenAI GPT-OSS 120B | OpenRouter | hızlı | Güçlü muhakeme |
| 5 | Nemotron 3 Ultra 550B | OpenRouter | yavaş | Araçlarla en büyük ücretsiz model |

## Sağlayıcıya Göre Önerilen Ücretsiz Kodlama Modelleri

### OpenRouter
`openrouter/free` yönlendiricisini kullanın veya `/add <n> <model>:free` ile belirli modelleri sabitleyin.

### Groq (en hızlı — LPU donanımı)
```
/add 6 groq:openai/gpt-oss-120b       # 120B, 500 t/s
/add 7 groq:llama-3.3-70b-versatile   # 70B, 280 t/s
/add 8 groq:qwen/qwen3-32b            # 32B, 400 t/s
/add 9 groq:meta-llama/llama-4-scout-17b-16e-instruct  # 750 t/s
```
Hız limitleri: 30 RPM, ~1K RPD. Tüm modeller araç çağrısını destekler.

### Mistral (AB'de barındırılan)
```
/add 10 mistral:codestral-latest       # Özel kodlama modeli
/add 11 mistral:mistral-large-latest   # En iyi kalite
/add 12 mistral:mistral-small-latest   # Hafif ve hızlı
/add 13 mistral:open-mistral-nemo      # 128K bağlam, açık ağırlık
```
Ücretsiz katman: ~1 istek/s, ayda 1B token.

### Google AI Studio
```
/add 14 google:gemini-2.0-flash-exp    # Hızlı, iyi kodlama
```
Ücretsiz katman: 5-15 RPM, 100-1K RPD.

### DeepSeek
```
/add 15 deepseek:deepseek-chat         # Genel amaçlı
/add 16 deepseek:deepseek-reasoner     # Güçlü muhakeme
```
Ücretsiz katman: ~500 RPM, günde 500M token.

## Örnek Oturum

```
Siz: /model 4
✅ 4. ön ayara geçildi: openai/gpt-oss-120b:free

Siz: create a folder named demo and write a hello.py
⏳ Düşünüyor...
  [Model: openai/gpt-oss-120b:free]
  🔧 create_folder({"path":"demo"})
  🔧 write_file({"path":"demo/hello.py","content":"print('Hello, world!')\n"})
Ajan: Tamam! demo/hello.py oluşturuldu ve Hello World betiği yazıldı.

Siz: run the file
⏳ Düşünüyor...
  [Model: openai/gpt-oss-120b:free]
  🔧 run_command({"command":"python demo/hello.py"})
Ajan: Hello, world! — betik doğru çalışıyor.

Siz: /model 6
✅ 6. ön ayara geçildi: [Groq] openai/gpt-oss-120b
   (şimdi Groq kullanılıyor — aynı model, 500 t/s)

Siz: list files
⏳ Düşünüyor...
  [Model: openai/gpt-oss-120b]
  🔧 run_command({"command":"ls -la"})
Ajan: demo/hello.py  ...
```

## Sorun Giderme

| Hata | Olası Neden | Çözüm |
|-------|-------------|------|
| `403 Forbidden` | API anahtarı eksik veya geçersiz | `.env` dosyasında o sağlayıcı için doğru anahtarın olduğunu kontrol edin |
| `403 Forbidden` | İnternet kısıtlamaları API sunucusunu engelliyor | VPN/proxy etkinleştirin, `HTTPS_PROXY` ayarlayın veya yerel modelleri kullanın: `/add 6 ollama:auto` |
| `429 Rate limit exceeded` | Ücretsiz katman günlük limiti aşıldı | Bekleyin veya **otomatik geçişin** sağlayıcıyı değiştirmesine izin verin. Manuel: `/model <n>` |
| `Agent stopped: stuck detected` | Aynı araç 3×+ art arda çağrıldı | Kurtarma mesajı otomatik enjekte edilir — isteğinizi yeniden ifade edin |
| `All 3 attempts failed` | Modele ulaşılamıyor veya çok yavaş | Daha küçük bir model deneyin, yerel modelleri kullanın veya `/model <n>` ile sağlayıcı değiştirin |
| `tool_calls` boş argümanlarla | Model araç çağrısını desteklemiyor | Farklı bir model kullanın |
| `ENOTFOUND` / `ECONNREFUSED` | İnternet kısıtlamaları veya proxy gerekli | VPN/proxy etkinleştirin, `HTTPS_PROXY` ayarlayın veya yerel modelleri kullanın |

### Hızlı kontroller
- `/list-providers` — hangi API anahtarlarının yapılandırıldığını gösterir
- `/safe` — güvenli mod durumunu aç/kapat
- `npm run setup` — kurulum sihirbazını yeniden çalıştırın
- `npm start` — herhangi bir kod güncellemesinden sonra yeniden başlatın

## Proje Yapısı

```
coding-agent-free/
├── src/
│   ├── agent.ts                # CLI giriş noktası
│   ├── CodingAgent.ts          # Ajan döngüsü, araç yürütme, takılma tespiti
│   ├── ConversationState.ts    # Kayan pencere, bağlam kırpma, mesaj yönetimi
│   ├── commands.ts             # Ön ayar biçimlendirme, showModels
│   ├── detectLocalModel.ts     # Yerel sağlayıcılarda modelleri otomatik algılama
│   ├── persistence.ts          # Konuşma ve ön ayarları kaydet/yükle (Zod doğrulaması ile)
│   ├── tokenEstimator.ts       # Token tahmini (uzunluk/4)
│   ├── types.ts                # Paylaşılan tip tanımları (ChatMessage, ToolCall vb.)
│   ├── validation.ts           # Araç girdi/çıktısı için Zod şemaları
│   ├── server.ts               # Express web sunucusu (SSE akışı)
│   ├── config/
│   │   └── models.ts           # Sağlayıcı tanımları, ön ayarlar, sistem istemi
│   ├── tools/
│   │   └── fileManager.ts      # 13 araç + güvenli mod + çalışma alanı kısıtlamaları
│   └── __tests__/              # Birim testleri
│       ├── ConversationState.test.ts  # 9 test: kırp, sonAsistanAdımınıKaldır vb.
│       ├── comprehensive.test.ts      # 30 test: tüm modüller + entegrasyon
│       ├── CodingAgent.test.ts        # 11 test: yürütme, takılma, yeniden deneme, hatalar
│       ├── loadProjectContext.test.ts  # 7 test: dosya arama, gezinme, uç durumlar
│       ├── fileManager.test.ts        # 26 test: 13 aracın tümü + güvenli mod
│       ├── agent.test.ts              # 24 test: CLI komutları, regex ayrıştırma, createClient
│       └── server.test.ts             # 21 test: API uç noktaları, oturum, güvenli mod, proxy
├── .github/
│   └── workflows/
│       └── ci.yml              # CI: push/PR'de tip kontrolü + testler
├── scripts/
│   ├── check_models.js         # Araç desteği olan ücretsiz OpenRouter modellerini listele
│   ├── cleanup.js              # 3000 portundaki eski süreçleri öldür
│   ├── comprehensive-test.js   # 35 entegrasyon testi (npm test)
│   ├── provider-integration-test.ts  # 26 sağlayıcı entegrasyon testi (npm run test:integration)
│   ├── setup.js                # İnteraktif kurulum sihirbazı (npm run setup)
│   ├── setup-ide.js            # IDE'leri yerel API proxy'sini kullanacak şekilde yapılandır
│   ├── test.js                 # Etkileşimsiz CLI duman testi
│   ├── test-improvements.js
│   ├── tool-integration-test.ts
│   └── wezterm-launcher.cmd    # run-cli-rtl.bat yardımcısı
├── local/                      # Yerel araçlar (gitignore)
│   ├── backup/src/             # Hızlı geri alma için src/ yedeklemesi
│   └── restore.ps1             # src/ dosyasını yedekten geri yükle
├── workspace/                  # Varsayılan çalışma dizini
├── .env                        # API anahtarları (gitignore)
├── presets.json                # Kullanıcı ön ayarları (gitignore)
├── tsconfig.json
├── run-cli.bat                 # CLI başlatıcı (Windows)
├── run-cli-rtl.bat             # RTL desteği ile CLI başlatıcı (WezTerm)
└── run-web.bat                 # Web arayüzü başlatıcı (Windows)
```

> 📝 Testleri çalıştırın: `npm run test:unit` (137 birim testi) — `npm run test:integration` (26 sağlayıcı entegrasyon testi) — `npm test` (35 entegrasyon testi)

## Ortam Değişkenleri

| Değişken | Gerekli mi? | Açıklama |
|----------|-----------|-------------|
| `OPENROUTER_API_KEY` | Hayır* | OpenRouter API anahtarı — https://openrouter.ai/keys |
| `GROQ_API_KEY` | Hayır* | Groq API anahtarı — https://console.groq.com/keys |
| `GOOGLE_API_KEY` | Hayır* | Google AI Studio anahtarı — https://aistudio.google.com/apikey |
| `DEEPSEEK_API_KEY` | Hayır* | DeepSeek API anahtarı — https://platform.deepseek.com |
| `MISTRAL_API_KEY` | Hayır* | Mistral API anahtarı — https://console.mistral.ai |
| `OLLAMA_HOST` | Hayır | Ollama sunucu URL'si (varsayılan: `http://localhost:11434/v1`) |
| `LMSTUDIO_HOST` | Hayır | LM Studio sunucu URL'si (varsayılan: `http://localhost:1234/v1`) |
| `LLAMACPP_HOST` | Hayır | Llama.cpp sunucu URL'si (varsayılan: `http://localhost:8080/v1`) |
| `ALLOWED_DIR` | Hayır | Dosya işlemleri için dizin (varsayılan: `./workspace`) |
| `LOCAL_TIMEOUT` | Hayır | Yerel model istekleri için zaman aşımı (ms) (varsayılan: 300000) |
| `LOG_LEVEL` | Hayır | Günlük seviyesi: `debug`, `info`, `warn`, `error` (varsayılan: `info`) |
| `MAX_EXCHANGES` | Hayır | Kayan pencerede tutulan max kullanıcı ↔ asistan alışverişi (varsayılan: `20`) |
| `MAX_TOOL_RESULT_LENGTH` | Hayır | Araç sonuçlarının kırpılmadan önceki max karakter sayısı (varsayılan: `5000`) |

\* En az bir API anahtarı gereklidir (yerel sağlayıcılar için gerekli değildir).

## Büyük Projeler

Orta ve büyük projeler için varsayılan kayan pencere (20 alışveriş) eski bağlamı düşürebilir. `.env` dosyasında şu değerleri artırın:

```env
# 50 kullanıcı-asistan alışverişine kadar tut
MAX_EXCHANGES=50

# Araç sonuçlarının 20.000 karaktere kadar olmasına izin ver
MAX_TOOL_RESULT_LENGTH=20000
```

Ayrıca, model eski bağlamdan dolayı kafası karışırsa oturum ortasında `/reset` ile konuşmayı sıfırlayabilirsiniz.

## Sınırlamalar

- **Sistem istemine uyum**: Bazı ücretsiz modeller (örn. Nvidia Nemotron 550B) sistem talimatlarını göz ardı edebilir veya kısmen takip edebilir. Bunu fark ederseniz farklı bir modele geçin.
- **Hız limitleri**: Ücretsiz katman API anahtarlarının günlük hız limitleri vardır (HTTP 429). Ajan üstel geri bildirimle yeniden dener (max 3 deneme), ancak kalıcı limitler sağlayıcı değiştirmeyi veya beklemeyi gerektirir.
- **Token penceresi**: 128K bağlam modeli ve 20 alışverişlik kayan pencere ile büyük kod tabanları bağlam sınırlarına takılabilir. Daha büyük projeler için `.env` içinde `MAX_EXCHANGES` ve `MAX_TOOL_RESULT_LENGTH` değerlerini artırın.
- **Takılma tespiti**: Ajan, 3× aynı araç çağrısı veya 5× art arda aynı adlı çağrıdan sonra durur, bir kurtarma sistem mesajı enjekte eder ve son araç sonuçlarını kaldırır. Devam etmek için isteğinizi yeniden ifade etmeniz yeterlidir.
- **Windows shell**: PowerShell boru hattı operatörleri (`|`, `&&`), katı opencode.json kuralları altında ayrıntılı izin istemlerini tetikleyebilir. Basit komutlar istemsiz çalışır.
- **Göreceli ve mutlak yollar**: Modeller yolları tutarsız şekilde işler — bazıları göreceli, bazıları mutlak yol kullanır. Ajan yolları `ALLOWED_DIR` içinde normalleştirir.

## Güvenlik

- Tüm dosya işlemleri `ALLOWED_DIR` ile sınırlıdır — `sanitizePath` travers saldırılarını önler
- Shell komutları çalışma alanı dizini içinde çalıştırılır
- API anahtarları `.env` dosyasında saklanır (`.gitignore` içinde listelenir, asla taahhüt edilmez)
- Güvenli mod (`/safe`) komutları bir beyaz listeyle kısıtlar
- Tehlikeli shell komutları kara liste ile engellenir (rm -rf, dd, mkfs, wget vb.)
- Yedekleme/geri yükleme için `local/` betiklerini kullanın

## Katkıda Bulunma

Katkılarınızı bekliyoruz! Bir [sorun](https://github.com/maz557/coding-agent-free/issues) açmaktan veya bir çekme isteği göndermekten çekinmeyin. Faydalı bulursanız depoyu yıldızlamayı unutmayın — başkalarının keşfetmesine yardımcı olur.

## Lisans

MIT
