# Coding Agent Free

<p align="center">
  <img src="https://img.shields.io/github/stars/maz557/coding-agent-free?style=for-the-badge&logo=github" alt="Stars"/>
  <img src="https://img.shields.io/github/license/maz557/coding-agent-free?style=for-the-badge" alt="License"/>
  <img src="https://img.shields.io/github/last-commit/maz557/coding-agent-free?style=for-the-badge&logo=git" alt="Last Commit"/>
  <img src="https://img.shields.io/badge/TypeScript-6.x-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/github/actions/workflow/status/maz557/coding-agent-free/ci.yml?branch=main&style=for-the-badge&logo=githubactions" alt="CI"/>
  <br/>
  <a href="#-یہ-ایجنٹ-کیوں"><strong>یہ ایجنٹ کیوں؟</strong></a> •
  <a href="#فوری-شروع"><strong>فوری شروع</strong></a> •
  <a href="#کمانڈ-لائن-انٹرفیس"><strong>CLI</strong></a> •
  <a href="#ویب-انٹرفیس"><strong>ویب</strong></a> •
  <a href="#مثالی-تعاملات"><strong>مثالیں</strong></a>
</p>

<p align="center">
  🌐
  <a href="README.ur.md"><strong>اردو</strong></a> •
  <a href="README.md">English</a> •
  <a href="README.fa.md">فارسی</a> •
  <a href="README.ar.md">العربية</a> •
  <a href="README.tr.md">Türkçe</a> •
  <a href="README.es.md">Español</a> •
  <a href="README.fr.md">Français</a>
</p>

ایک انٹرایکٹو AI کوڈنگ اسسٹنٹ جو آپ کے **ٹرمینل** یا **ویب براؤزر** میں چلتا ہے — جو **مفت** کلاؤڈ APIs (OpenRouter, Groq, Google, DeepSeek, Mistral) اور **مقامی** ماڈلز (Ollama, LM Studio, Llama.cpp) سے چلتا ہے۔ یہ فائلیں پڑھتا، لکھتا، تلاش کرتا، کاپی کرتا، منتقل کرتا اور حذف کرتا ہے، اور شیل کمانڈز چلاتا ہے — یہ سب قدرتی زبان کے ٹول کالنگ کے ذریعے۔

> 💡 **آف لائن کے لیے تیار**: مقامی سرور کے ساتھ، ایجنٹ مکمل طور پر آف لائن کام کرتا ہے — کسی انٹرنیٹ کی ضرورت نہیں، کوئی ڈیٹا آپ کی مشین سے باہر نہیں جاتا۔

## 🧠 یہ ایجنٹ کیوں؟

| مسئلہ | یہ ایجنٹ کیسے حل کرتا ہے |
|---------|--------------------------|
| کوڈنگ اسسٹنٹس کی قیمت $20/ماہ (ChatGPT+, Claude Pro) | **100% مفت** — مفت-tier OpenRouter, Groq, Google, DeepSeek, Mistral + مقامی ماڈلز استعمال کرتا ہے |
| کوئی فراہم کنندہ ڈاؤن / ریٹ-لمٹڈ ہو جائے | **8 فراہم کنندگان** — 429 پر خودکار فالبیک + دستی `/model <n>` |
| انٹرنیٹ تک رسائی نہ ہو / محدود علاقہ | **مقامی ماڈلز** (Ollama, LM Studio, Llama.cpp) — مکمل طور پر آف لائن |
| کلاؤڈ APIs کے ساتھ پرائیویسی کے خدشات | صرف **مقامی ماڈلز** چلائیں — صفر ڈیٹا آپ کی مشین سے باہر جاتا ہے |
| سیٹ اپ بہت پیچیدہ ہے | **`npm run setup`** — انٹرایکٹو وزرڈ، کوئی دستی `.env` ایڈیٹنگ نہیں |
| AI خطرناک کمانڈز چلاتا ہے | **سیف موڈ** (`/safe`) — صرف وائٹ لسٹ والی شیل کمانڈز |
| ایجنٹ لوپس میں پھنس جاتا ہے | **اسمارٹ ڈیٹیکشن** — 3× ایک جیسے ٹول کال کے بعد روک دیتا ہے |
| فراہم کنندہ ریٹ-لمٹڈ ہو | **خودکار فالبیک** — 429 پر خود بخود فراہم کنندہ تبدیل کرتا ہے |
| لمبے ٹول نتائج ٹوکن ضائع کرتے ہیں | **ٹوکن کمپریشن** — ہیڈ+ٹیل ٹرنکیشن + ڈپلیکیٹ ہٹانا |
| اپنا IDE مفت ماڈلز کے ساتھ استعمال کرنا چاہتے ہیں | **OpenAI-مطابق API** — `npm run setup-ide` Cline, Continue.dev, Cursor کو کنیکٹ کرتا ہے |

## فوری شروع

```bash
git clone https://github.com/maz557/coding-agent-free.git
cd coding-agent-free
npm install
```

انٹرایکٹو سیٹ اپ وزرڈ چلائیں (تجویز کردہ):
```bash
npm run setup
```

یا دستی طور پر `.env` بنائیں (کم از کم ایک فراہم کنندہ منتخب کریں):
```bash
# OpenRouter (سب سے آسان — 18+ مفت ٹول-کالنگ ماڈلز کے لیے ایک کلید)
echo "OPENROUTER_API_KEY=sk-or-v1-..." >> .env

# اختیاری فراہم کنندگان:
echo "GROQ_API_KEY=gsk_..." >> .env      # انتہائی تیز انفرنس
echo "GOOGLE_API_KEY=AIza..." >> .env     # Gemini ماڈلز
echo "DEEPSEEK_API_KEY=sk-..." >> .env    # DeepSeek
echo "MISTRAL_API_KEY=..." >> .env        # Mistral ماڈلز
```

**مکمل طور پر آف لائن (کوئی API کلید درکار نہیں):**
```bash
# 1. کلون اور انسٹال کریں (ایک بار انٹرنیٹ درکار)
git clone https://github.com/maz557/coding-agent-free.git
cd coding-agent-free
npm install

# 2. اپنا مقامی ماڈل سرور شروع کریں (ایک منتخب کریں):
#    ollama run qwen3:14b           # Ollama
#    # یا LM Studio / llama-server چلائیں

# 3. ایجنٹ لانچ کریں:
npm start

# 4. ایجنٹ کے اندر، اپنا مقامی ماڈل شامل کریں:
#    آپ: /add 6 ollama:auto
#    آپ: /model 6
```

## کمانڈ لائن انٹرفیس

```bash
npm start
```

> Windows پر، `run-cli.bat` پر ڈبل کلک کریں۔
> 📝 **RTL زبانیں (فارسی، عربی، اردو، عبرانی، وغیرہ):** اگر آپ کا ٹرمینل دائیں سے بائیں متن غلط دکھاتا ہے تو اس کی بجائے `run-cli-rtl.bat` استعمال کریں — یہ [WezTerm](https://wezfurlong.org/wezterm/) کے ذریعے صحیح BiDi سپورٹ کے ساتھ لانچ ہوتا ہے۔
> 📝 **اردو RTL سپورٹ:** اردو صارفین کے لیے، `run-cli-rtl.bat` بہترین تجربہ فراہم کرتا ہے۔ یہ WezTerm ٹرمینل میں درست دائیں سے بائیں متن کی نمائش، لگچر کی صحیح تشکیل، اور اردو حروف کی مناسب رینڈرنگ کو یقینی بناتا ہے۔

## ویب انٹرفیس

```bash
npm run web
# اپنے براؤزر میں http://localhost:3000 کھولیں
```

> Windows پر، `run-web.bat` پر ڈبل کلک کریں۔

ویب UI وہی فیچرز سپورٹ کرتا ہے جو ٹرمینل — اسٹریمنگ رسپانسز، ٹول کالز، ماڈل سوئچنگ (تمام 8 فراہم کنندگان + یوزر پری سیٹس)، سیف موڈ ٹوگل، الاؤ پاتھ، اور کنورسیشن ری سیٹ۔ ایک سے زیادہ براؤزر ٹیبز سپورٹ ہیں جن کے آزاد سیشن ہوتے ہیں۔ CLI اور ویب ایک ہی ماڈل کنفیگریشن (`src/config/models.ts`) اور ٹول انجن (`fileManager.ts`) شیئر کرتے ہیں۔

ویب سرور ایک **OpenAI-مطابق API** بھی `http://localhost:3000/v1/chat/completions` پر پیش کرتا ہے، تاکہ کوئی بھی OpenAI-مطابق کلائنٹ (Cline, Continue.dev, Cursor, وغیرہ) آپ کے کنفیگرڈ فراہم کنندگان کو ایک ہی اینڈپوائنٹ کے ذریعے خودکار فالبیک سپورٹ کے ساتھ استعمال کر سکے۔

اپنا IDE خودکار طور پر کنفیگر کریں:
```bash
npm run setup-ide
```

یہ **Cline**، **Continue.dev**، اور **Cursor** کو مقامی API پراکسی کی طرف پوائنٹ کرنے کے لیے کنفیگر کرے گا، جو آپ کے `.env` فراہم کنندہ کلیدوں کو ایک ہی روٹنگ کے ذریعے استعمال کرے گا۔

**مثال سیشن:**

```
┌──────────────────────────────────────────────────────────┐
│  💬 Coding Agent                       [🔒 Safe] [🌐 P] │
│  ──────────────────────────────────────────────────────── │
│                                                          │
│  آپ: ایک hello.py بنائیں جو "Hello from Web UI" پرنٹ کرے  │
│                                                          │
│  ⏳ سوچ رہا ہے... [Model: openrouter/free]                │
│                                                          │
│  🛠  write_file(path="hello.py", content="...")          │
│  ✔  فائل لکھ دی گئی (25 بائٹس)                           │
│                                                          │
│  🛠  run_command(command="python hello.py")              │
│  ✔  Hello from Web UI                                    │
│                                                          │
│  ہو گیا! hello.py بنایا گیا اور تصدیق ہو گئی کہ یہ پرنٹ کرتا ہے:│
│  Hello from Web UI                                       │
│  ──────────────────────────────────────────────────────── │
│  [پیغام لکھیں...                           ] [بھیجیں]    │
└──────────────────────────────────────────────────────────┘
```

> ماڈل ڈراپ ڈاؤن آپ کو سیشن کے درمیان تمام 8 فراہم کنندگان اور آپ کے محفوظ کردہ پری سیٹس کے درمیان سوئچ کرنے دیتا ہے۔ اسٹریمنگ رسپانسز ٹوکن بہ ٹوکن ریئل ٹائم میں ظاہر ہوتے ہیں۔
> ہیڈر میں موجود **`?`** بٹن پر کلک کریں تاکہ ایک مدد ونڈو کھلے جس میں استعمال کی گائیڈ، ماڈل سوئچ کرنے کی ہدایات، اور CLI کمانڈ کے مساوی ہوں۔

## مثالی تعاملات

**"ایک پائتھون اسکرپٹ بنائیں جو فبونیکی نمبر پرنٹ کرے"**

ایجنٹ فائل بنائے گا، کوڈ لکھے گا، پھر تصدیق کے لیے اسے چلائے گا:

```
آپ: ایک fibonacci.py لکھیں جو پہلے 20 نمبر پرنٹ کرے
⏳ سوچ رہا ہے...
  🔧 write_file({"path":"fibonacci.py","content":"..."})
  🔧 run_command({"command":"python fibonacci.py"})
ایجنٹ: ہو گیا! fibonacci.py بنائی گئی اور آؤٹ پٹ کی تصدیق: 0, 1, 1, 2, 3, 5...
```

**"تمام TypeScript فائلیں تلاش کریں جو fetch() کال کرتی ہیں اور انہیں axios سے بدل دیں"**

```
آپ: تمام .ts فائلیں تلاش کریں جن میں fetch() کال ہے اور انہیں axios سے بدلیں
  🔧 search_content({"pattern":"fetch(","filePattern":"*.ts"})
  🔧 read_file({"path":"src/api.ts"})
  🔧 replace_in_file({"path":"src/api.ts","old_str":"fetch(","new_str":"axios."})
ایجنٹ: 3 فائلیں اپڈیٹ کر دی گئیں (api.ts, users.ts, auth.ts)۔
```

**"اس ایرر کو ڈیبگ کریں: Cannot read property 'map' of undefined"**

ایجنٹ متعلقہ فائل پڑھتا ہے، کوڈ کا تجزیہ کرتا ہے، اور ایک حل تجویز اور لاگو کرتا ہے۔

## فیچرز

- **8 فراہم کنندگان** — OpenRouter, Groq, Google, DeepSeek, Mistral + Ollama, LM Studio, Llama.cpp
- **5 بلٹ-ان پری سیٹس** — `openrouter/free` سے شروع کریں (خودکار طور پر کام کرنے والے مفت ماڈلز دریافت کرتا ہے)
- **یوزر پری سیٹس** — `/save`, `/add`, `/remove` کے ساتھ اپنے ماڈلز محفوظ/شامل/ہٹائیں
- **فالبیک چین** — ریٹ لمٹ (429) پر فراہم کنندگان کے درمیان خودکار فالبیک، علاوہ ماڈل-سطح کے فالبیک
- **13 ٹولز** — read, write, list (تفصیلات کے ساتھ), create_folder, delete_file, delete_folder (تکراری), append_file, copy_file, move_file, file_info, search_content, replace_in_file, اور run_command
- **ٹوکن کمپریشن** — لمبے ٹول نتائج کا ہیڈ+ٹیل ٹرنکیشن + خودکار ڈپلیکیٹ ہٹانا
- **سلائیڈنگ ونڈو کانٹیکسٹ** — پچھلے 20 تبادلے بطور ڈیفالٹ رکھتا ہے، ٹوکن لمٹ کی غلطیوں سے بچنے کے لیے خودکار ٹرمز (کنفیگر قابل `MAX_EXCHANGES` / `MAX_TOOL_RESULT_LENGTH` کے ذریعے)
- **اسمارٹ لوپ ڈیٹیکشن** — روک دیتا ہے اگر کوئی ٹول 3+ بار ایک جیسا یا 5+ بار لگاتار بلایا جائے
- **سیف موڈ** (`--safe` / `/safe`) — صرف وائٹ لسٹ والی شیل کمانڈز
- **سیٹ اپ وزرڈ** — `npm run setup` انٹرایکٹو طریقے سے .env کنفیگر کرتا ہے
- **خودکار دوبارہ کوشش** — ایکسپونینشل بیک آف + 120s ٹائم آؤٹ (مقامی ماڈلز کے لیے 300s)
- **Zod توثیق** — ہر ٹول ان پٹ اور آؤٹ پٹ کا رن ٹائم ٹائپ چیک
- **CLI اور ویب متحد** — مشترکہ ماڈل کنفیگ، سسٹم پرامپٹ، ٹول انجن، فراہم کنندہ تعریفیں، اور دونوں انٹرفیسز میں یوزر پری سیٹس
- **opencode.json** — جامع اجازت کے قوانین (100+ سیف کمانڈ پیٹرن خودکار طور پر الاؤ) اور صاف پرامپٹس کے لیے ٹرنکیٹڈ ٹول آؤٹ پٹ
- **ٹول آؤٹ پٹ ٹرنکیشن** — تمام ٹول نتائج 5000 حروف پر کیپ کیے گئے (`MAX_TOOL_RESULT_LENGTH`) تاکہ کانٹیکسٹ صاف رہے
- **کنورسیشن پرسسٹینس** — ری اسٹارٹس کے دوران سیشنز خودکار محفوظ/بحال
- **سٹرکچرڈ لاگنگ** — `pino` کے ذریعے (stderr، UI میں مداخلت نہیں کرتا)

## دستیاب ٹولز

| ٹول | تفصیل |
|------|-------------|
| `read_file` | فائل کے مندرجات پڑھیں |
| `write_file` | فائل میں مواد لکھیں (بنائے/اوور رائٹ کرے) |
| `list_files` | ڈائریکٹری کے مندرجات دکھائیں۔ سائز + ٹائم سٹیمپ کے لیے `details:true` استعمال کریں |
| `create_folder` | نیا فولڈر بنائیں |
| `delete_file` | ایک فائل حذف کریں |
| `delete_folder` | ایک فولڈر حذف کریں۔ غیر خالی فولڈرز کے لیے `recursive:true` سیٹ کریں |
| `append_file` | موجودہ فائل کے آخر میں مواد شامل کریں |
| `copy_file` | فائل کو ماخذ سے منزل پر کاپی کریں |
| `move_file` | فائل کو منتقل یا rename کریں |
| `file_info` | تفصیلی میٹاڈیٹا حاصل کریں (سائز، اجازتیں، ٹائم سٹیمپ) |
| `search_content` | فائلوں میں عین متن تلاش کریں۔ `filePattern` (مثلاً `*.ts`) اور `maxResults` (ڈیفالٹ 50) سپورٹ کرتا ہے۔ 1MB سے بڑی فائلیں چھوڑ دیتا ہے |
| `replace_in_file` | عین متن کی پہلی موجودگی کو بدلیں (کیس-حساس) |
| `run_command` | ورک اسپیس میں شیل کمانڈ چلائیں |

## کمانڈز

| کمانڈ | تفصیل |
|---------|-------------|
| `/model <n>` | پری سیٹ n پر جائیں |
| `/save <n>` | موجودہ ماڈل کو پری سیٹ n کے طور پر محفوظ کریں |
| `/add <n> <m>` | ماڈل m کو پری سیٹ n کے طور پر شامل کریں (`provider:model` یا صرف `model`) |
| `/remove <n>` | یوزر پری سیٹ ہٹائیں |
| `/allow <p>` | ماڈل کو ورک اسپیس سے باہر پاتھ تک رسائی کی اجازت دیں |
| `/safe` | سیف موڈ ٹوگل کریں (صرف وائٹ لسٹ والی شیل کمانڈز) |
| `/models` | تمام پری سیٹس دکھائیں |
| `/active` | موجودہ فعال ماڈل دکھائیں |
| `/reset` | گفتگو کی تاریخ صاف کریں (نیا شروع کریں) |
| `/list-providers` | درست کلیدوں والے فراہم کنندگان دکھائیں (اور مقامی فراہم کنندگان) |
| `/exit` | بند کریں |

## ایک سے زیادہ فراہم کنندگان کا استعمال

ہر پری سیٹ ایک فراہم کنندہ سے منسلک ہے۔ `/model <n>` کے ساتھ پری سیٹ تبدیل کرنے سے API کلائنٹ خودکار طور پر دوبارہ بن جاتا ہے:

```
آپ: /add 6 groq:openai/gpt-oss-120b
✅ پری سیٹ 6 شامل کیا گیا: [Groq] openai/gpt-oss-120b

آپ: /model 6
✅ پری سیٹ 6 پر سوئچ کیا گیا: [Groq] openai/gpt-oss-120b
   (اب Groq کی API gpt-oss-120b کے ساتھ استعمال ہو رہی ہے)

آپ: /model 1
✅ پری سیٹ 1 پر سوئچ کیا گیا: [OpenRouter] openrouter/free
   (واپس OpenRouter پر)
```

### دوسرے فراہم کنندگان سے ماڈلز شامل کرنا

```
/add <n> <provider>:<model-id>
```

مثالیں:
```
/add 10 groq:llama-3.3-70b-versatile
/add 11 google:gemini-2.0-flash-exp
/add 12 deepseek:deepseek-chat
/add 13 mistral:codestral-latest
```

اگر آپ فراہم کنندہ چھوڑ دیتے ہیں (مثلاً `/add 10 llama-3.3-70b-versatile`)، تو یہ موجودہ پری سیٹ کے فراہم کنندہ پر ڈیفالٹ ہو جاتا ہے۔

## مقامی ماڈلز (Ollama, LM Studio, Llama.cpp)

ایجنٹ بغیر کسی کنفیگریشن کے کسی بھی OpenAI-مطابق مقامی سرور کو سپورٹ کرتا ہے:

### فوری شروع

یقینی بنائیں کہ آپ کا مقامی سرور چل رہا ہے، پھر:

```
آپ: /add 6 ollama:auto
✅ خودکار طور پر ماڈل دریافت کیا گیا: llama3.2:latest
✅ پری سیٹ 6 شامل کیا گیا: [Ollama] llama3.2:latest

آپ: /model 6
✅ پری سیٹ 6 پر سوئچ کیا گیا: [Ollama] llama3.2:latest
```

یا LM Studio کے لیے:

```
آپ: /add 7 lmstudio:auto
✅ پری سیٹ 7 شامل کیا گیا: [LM Studio] qwen2.5-coder-7b-instruct
```

`:auto` کی ورڈ ایجنٹ کو بتاتی ہے کہ مقامی سرور سے کنیکٹ ہو اور لوڈ کردہ ماڈل خودکار طور پر دریافت کرے۔

### فوری شروع — مخصوص مقامی ماڈل

```bash
# Ollama — ٹول-کالنگ ماڈل پل اور سرو کریں
ollama pull llama3.2
ollama serve                  # پورٹ 11434 پر شروع ہوتا ہے

# Llama.cpp — GGUF ماڈل براہ راست سرو کریں
llama-server -m qwen2.5-coder-1.5b-instruct-q4_k_m.gguf --port 8080

# LM Studio — بلٹ-ان lms CLI استعمال کرتا ہے
lms get llama-3.2-3b-instruct   # ماڈل ڈاؤن لوڈ کریں
lms load llama-3.2-3b-instruct  # میموری میں لوڈ کریں
lms server start --port 1234    # API سرور شروع کریں
```

پھر مقامی ماڈل کو ایجنٹ میں شامل کریں:
```
/add 6 ollama:auto
/add 7 lmstudio:auto
/add 8 llamacpp:auto
```

### کسٹم پورٹس

`.env` میں سیٹ کریں:
```bash
OLLAMA_HOST=http://localhost:11434/v1
LMSTUDIO_HOST=http://localhost:1234/v1
LLAMACPP_HOST=http://localhost:8080/v1
```

### تقاضے

- **Ollama**: [ڈاؤن لوڈ](https://ollama.ai) کریں → `ollama pull llama3.2` → `ollama serve`
- **LM Studio**: [ڈاؤن لوڈ](https://lmstudio.ai) کریں → `lms get llama-3.2-3b-instruct` → `lms server start --port 1234`
- **Llama.cpp**: [ڈاؤن لوڈ](https://github.com/ggerganov/llama.cpp) کریں → بلڈ کریں یا بائنری حاصل کریں → `llama-server -m model.gguf --port 8080`
- ماڈل میں مکمل ایجنٹ فعالیت کے لیے **ٹول کالنگ** (فنکشن کالنگ) ہونی چاہیے۔
- کوئی API کلید درکار نہیں — مقامی فراہم کنندگان اسٹارٹ اپ کلید توثیق کے دوران چھوڑ دیے جاتے ہیں۔
- تمام مقامی فراہم کنندگان OpenAI-مطابق API استعمال کرتے ہیں، لہذا کسی اضافی پیکیج کی ضرورت نہیں۔

## ورک اسپیس اور اجازتیں

ڈیفالٹ کے مطابق، ایجنٹ صرف `./workspace` کے اندر موجود فائلوں تک رسائی حاصل کر سکتا ہے۔ دوسرے پاتھ تک رسائی کے لیے:

### آپشن 1: ڈیفالٹ ورک اسپیس تبدیل کریں (مستقل)

`.env` میں `ALLOWED_DIR` سیٹ کریں:
```
ALLOWED_DIR=.          # پروجیکٹ روٹ — سب تک رسائی
ALLOWED_DIR=C:\path    # کوئی بھی مطلق پاتھ
```

### آپشن 2: پاتھ کو مانگ پر الاؤ کریں (فی سیشن)

جب ماڈل ورک اسپیس سے باہر کسی پاتھ تک رسائی حاصل کرنے کی کوشش کرے:
```
❌ ٹول ایرر: رسائی سے انکار: "C:\path" اجازت یافتہ ڈائریکٹری سے باہر ہے۔
   کمانڈ استعمال کریں: /allow "C:\path"
```

رسائی دیں:
```
آپ: /allow "C:\path"
✅ الاؤ کیا گیا: C:\path
```

اجازتیں صرف موجودہ سیشن کے لیے رہتی ہیں۔

## بلٹ-ان پری سیٹس

| # | ماڈل | فراہم کنندہ | رفتار | نوٹس |
|---|-------|----------|-------|-------|
| 1 | `openrouter/free` | OpenRouter | مختلف | دستیاب مفت ماڈلز پر خودکار روٹنگ |
| 2 | Qwen 3 Next 80B | OpenRouter | درمیانی | اچھا عام مقصد |
| 3 | Nemotron 3 Super 120B | OpenRouter | درمیانی | 1M کانٹیکسٹ |
| 4 | OpenAI GPT-OSS 120B | OpenRouter | تیز | مضبوط استدلال |
| 5 | Nemotron 3 Ultra 550B | OpenRouter | سست | ٹولز کے ساتھ سب سے بڑا مفت ماڈل |

## فراہم کنندہ کے لحاظ سے تجویز کردہ مفت کوڈنگ ماڈلز

### OpenRouter
`openrouter/free` روٹر استعمال کریں، یا `/add <n> <model>:free` کے ساتھ مخصوص ماڈلز پن کریں۔

### Groq (تیز ترین — LPU ہارڈویئر)
```
/add 6 groq:openai/gpt-oss-120b       # 120B, 500 t/s
/add 7 groq:llama-3.3-70b-versatile   # 70B, 280 t/s
/add 8 groq:qwen/qwen3-32b            # 32B, 400 t/s
/add 9 groq:meta-llama/llama-4-scout-17b-16e-instruct  # 750 t/s
```
ریٹ لمٹ: 30 RPM, ~1K RPD۔ تمام ماڈلز ٹول کالنگ سپورٹ کرتے ہیں۔

### Mistral (EU میں ہوسٹڈ)
```
/add 10 mistral:codestral-latest       # مخصوص کوڈنگ ماڈل
/add 11 mistral:mistral-large-latest   # بہترین معیار
/add 12 mistral:mistral-small-latest   # ہلکا اور تیز
/add 13 mistral:open-mistral-nemo      # 128K کانٹیکسٹ، اوپن-ویٹ
```
مفت ٹیر: ~1 req/s، 1B ٹوکن/ماہ۔

### Google AI Studio
```
/add 14 google:gemini-2.0-flash-exp    # تیز، اچھا کوڈنگ
```
مفت ٹیر: 5-15 RPM, 100-1K RPD۔

### DeepSeek
```
/add 15 deepseek:deepseek-chat         # عام مقصد
/add 16 deepseek:deepseek-reasoner     # مضبوط استدلال
```
مفت ٹیر: ~500 RPM، 500M ٹوکن/دن۔

## مثال سیشن

```
آپ: /model 4
✅ پری سیٹ 4 پر سوئچ کیا گیا: openai/gpt-oss-120b:free

آپ: demo نامی فولڈر بنائیں اور اس میں hello.py لکھیں
⏳ سوچ رہا ہے...
  [Model: openai/gpt-oss-120b:free]
  🔧 create_folder({"path":"demo"})
  🔧 write_file({"path":"demo/hello.py","content":"print('Hello, world!')\n"})
ایجنٹ: ہو گیا! demo/hello.py بنا دیا گیا ہے Hello World اسکرپٹ کے ساتھ۔

آپ: فائل چلائیں
⏳ سوچ رہا ہے...
  [Model: openai/gpt-oss-120b:free]
  🔧 run_command({"command":"python demo/hello.py"})
ایجنٹ: Hello, world! — اسکرپٹ درست چلتا ہے۔

آپ: /model 6
✅ پری سیٹ 6 پر سوئچ کیا گیا: [Groq] openai/gpt-oss-120b
   (اب Groq استعمال کر رہے ہیں — وہی ماڈل، 500 t/s)

آپ: فائلیں دکھائیں
⏳ سوچ رہا ہے...
  [Model: openai/gpt-oss-120b]
  🔧 run_command({"command":"ls -la"})
ایجنٹ: demo/hello.py  ...
```

## مسائل کا حل

| ایرر | ممکنہ وجہ | حل |
|-------|-------------|------|
| `403 Forbidden` | API کلید غائب یا غلط | چیک کریں کہ `.env` میں اس فراہم کنندہ کے لیے صحیح کلید ہے |
| `403 Forbidden` | انٹرنیٹ پابندیاں API ہوسٹ کو بلاک کر رہی ہیں | VPN/proxy فعال کریں، `HTTPS_PROXY` سیٹ کریں، یا مقامی ماڈل استعمال کریں: `/add 6 ollama:auto` |
| `429 Rate limit exceeded` | مفت ٹیر کی روزانہ حد پوری ہو گئی | انتظار کریں یا **خودکار فالبیک** کو فراہم کنندہ تبدیل کرنے دیں۔ دستی: `/model <n>` |
| `Agent stopped: stuck detected` | ایک ہی ٹول 3×+ لگاتار بلایا گیا | بحالی کا پیغام خودکار طور پر داخل کیا جاتا ہے — اپنی درخواست دوبارہ لکھیں |
| `All 3 attempts failed` | ماڈل ناقابل رسائی یا بہت سست | چھوٹا ماڈل آزمائیں، مقامی ماڈل استعمال کریں، یا `/model <n>` کے ساتھ فراہم کنندہ تبدیل کریں |
| `tool_calls` with empty arguments | ماڈل ٹول کالنگ سپورٹ نہیں کرتا | دوسرا ماڈل استعمال کریں |
| `ENOTFOUND` / `ECONNREFUSED` | انٹرنیٹ پابندیاں یا پراکسی درکار | VPN/proxy فعال کریں، `HTTPS_PROXY` سیٹ کریں، یا مقامی ماڈل استعمال کریں |

### فوری جانچ
- `/list-providers` — دکھاتا ہے کہ کون سی API کلیدیں کنفیگر ہیں
- `/safe` — سیف موڈ کی حیثیت ٹوگل کریں
- `npm run setup` — سیٹ اپ وزرڈ دوبارہ چلائیں
- `npm start` — کسی بھی کوڈ اپڈیٹ کے بعد دوبارہ شروع کریں

## پروجیکٹ کا ڈھانچہ

```
coding-agent-free/
├── src/
│   ├── agent.ts                # CLI انٹری پوائنٹ
│   ├── CodingAgent.ts          # ایجنٹ لوپ، ٹول ایگزیکیوشن، سٹک ڈیٹیکشن
│   ├── ConversationState.ts    # سلائیڈنگ ونڈو، کانٹیکسٹ ٹرمنگ، میسج مینجمنٹ
│   ├── commands.ts             # پری سیٹ فارمیٹنگ، showModels
│   ├── detectLocalModel.ts     # مقامی فراہم کنندگان پر ماڈلز خودکار دریافت
│   ├── persistence.ts          # گفتگو اور پری سیٹس محفوظ/لوڈ کریں (Zod توثیق کے ساتھ)
│   ├── tokenEstimator.ts       # ٹوکن تخمینہ (لمبائی/4)
│   ├── types.ts                # مشترکہ ٹائپ ڈیفینیشنز (ChatMessage, ToolCall, وغیرہ)
│   ├── validation.ts           # ٹول ان پٹ/آؤٹ پٹ کے لیے Zod اسکیما
│   ├── server.ts               # Express ویب سرور (SSE اسٹریمنگ)
│   ├── config/
│   │   └── models.ts           # فراہم کنندہ ڈیفینیشنز، پری سیٹس، سسٹم پرامپٹ
│   ├── tools/
│   │   └── fileManager.ts      # 13 ٹولز + سیف موڈ + ورک اسپیس پابندیاں
│   └── __tests__/              # یونٹ ٹیسٹس
│       ├── ConversationState.test.ts  # 9 ٹیسٹ: trim, removeLastAssistantTurn, وغیرہ
│       ├── comprehensive.test.ts      # 30 ٹیسٹ: تمام ماڈیولز + انٹیگریشن
│       ├── CodingAgent.test.ts        # 11 ٹیسٹ: عملدرآمد، پھنسنا، دوبارہ کوشش، خرابیاں
│       ├── loadProjectContext.test.ts  # 7 ٹیسٹ: فائل تلاش، نیویگیشن، حدی کیسز
│       ├── fileManager.test.ts        # 26 ٹیسٹ: تمام 13 ٹولز + سیف موڈ
│       ├── agent.test.ts              # 24 ٹیسٹ: CLI کمانڈز، regex پارسنگ، createClient
│       └── server.test.ts             # 21 ٹیسٹ: API اینڈپوائنٹس، سیشن، safe-mode، proxy
├── .github/
│   └── workflows/
│       └── ci.yml              # CI: ٹائپ چیک + ٹیسٹ push/PR پر
├── scripts/
│   ├── check_models.js         # ٹول سپورٹ والے مفت OpenRouter ماڈلز دکھائیں
│   ├── cleanup.js              # پورٹ 3000 پر پرانے پراسیسز ختم کریں
│   ├── comprehensive-test.js   # 35 انٹیگریشن ٹیسٹس (npm test)
│   ├── provider-integration-test.ts  # 26 پرووائیڈر انٹیگریشن ٹیسٹ (npm run test:integration)
│   ├── setup.js                # انٹرایکٹو سیٹ اپ وزرڈ (npm run setup)
│   ├── setup-ide.js            # IDEs کو مقامی API پراکسی استعمال کرنے کے لیے کنفیگر کریں
│   ├── test.js                 # غیر انٹرایکٹو CLI سموک ٹیسٹ
│   ├── test-improvements.js
│   ├── tool-integration-test.ts
│   └── wezterm-launcher.cmd    # run-cli-rtl.bat کے لیے ہیلپر
├── local/                      # مقامی ٹولز (gitignored)
│   ├── backup/src/             # فوری رول بیک کے لیے src/ کا سنیپ شاٹ
│   └── restore.ps1             # src/ کو بیک اپ سے بحال کریں
├── workspace/                  # ڈیفالٹ ورکنگ ڈائریکٹری
├── .env                        # API کلیدیں (gitignored)
├── presets.json                # یوزر پری سیٹس (gitignored)
├── tsconfig.json
├── run-cli.bat                 # CLI لانچر (Windows)
├── run-cli-rtl.bat             # RTL سپورٹ کے ساتھ CLI لانچر (WezTerm)
└── run-web.bat                 # ویب UI لانچر (Windows)
```

> 📝 ٹیسٹ چلائیں: `npm run test:unit` (129 یونٹ ٹیسٹ) — `npm run test:integration` (26 پرووائیڈر انٹیگریشن ٹیسٹ) — `npm test` (35 انٹیگریشن ٹیسٹ)

## ماحولی متغیرات

| متغیر | ضروری؟ | تفصیل |
|----------|-----------|-------------|
| `OPENROUTER_API_KEY` | نہیں* | OpenRouter API کلید — https://openrouter.ai/keys |
| `GROQ_API_KEY` | نہیں* | Groq API کلید — https://console.groq.com/keys |
| `GOOGLE_API_KEY` | نہیں* | Google AI Studio کلید — https://aistudio.google.com/apikey |
| `DEEPSEEK_API_KEY` | نہیں* | DeepSeek API کلید — https://platform.deepseek.com |
| `MISTRAL_API_KEY` | نہیں* | Mistral API کلید — https://console.mistral.ai |
| `OLLAMA_HOST` | نہیں | Ollama سرور URL (ڈیفالٹ: `http://localhost:11434/v1`) |
| `LMSTUDIO_HOST` | نہیں | LM Studio سرور URL (ڈیفالٹ: `http://localhost:1234/v1`) |
| `LLAMACPP_HOST` | نہیں | Llama.cpp سرور URL (ڈیفالٹ: `http://localhost:8080/v1`) |
| `ALLOWED_DIR` | نہیں | فائل آپریشنز کے لیے ڈائریکٹری (ڈیفالٹ: `./workspace`) |
| `LOCAL_TIMEOUT` | نہیں | مقامی ماڈل کی درخواستوں کے لیے ٹائم آؤٹ (ms) (ڈیفالٹ: 300000) |
| `LOG_LEVEL` | نہیں | لاگ لیول: `debug`, `info`, `warn`, `error` (ڈیفالٹ: `info`) |
| `MAX_EXCHANGES` | نہیں | سلائیڈنگ ونڈو میں رکھے جانے والے زیادہ سے زیادہ تبادلے (ڈیفالٹ: `20`) |
| `MAX_TOOL_RESULT_LENGTH` | نہیں | ٹول نتائج کے ٹرنکیٹ ہونے سے پہلے زیادہ سے زیادہ حروف (ڈیفالٹ: `5000`) |

\* کم از کم ایک API کلید درکار ہے (مقامی فراہم کنندگان کے لیے ضروری نہیں)۔

## بڑے پروجیکٹس

درمیانے سے بڑے پروجیکٹس کے لیے، ڈیفالٹ سلائیڈنگ ونڈو (20 تبادلے) پرانا کانٹیکسٹ چھوڑ سکتی ہے۔ یہ قدریں `.env` میں بڑھائیں:

```env
# زیادہ سے زیادہ 50 یوزر-اسسٹنٹ تبادلے رکھیں
MAX_EXCHANGES=50

# ٹول نتائج کو 20,000 حروف تک اجازت دیں
MAX_TOOL_RESULT_LENGTH=20000
```

آپ سیشن کے درمیان `/reset` کے ساتھ گفتگو کو دوبارہ ترتیب دے سکتے ہیں اگر ماڈل پرانے کانٹیکسٹ کی وجہ سے الجھ جائے۔

## حدود

- **سسٹم پرامپٹ کی پیروی**: کچھ مفت ماڈلز (مثلاً Nvidia Nemotron 550B) سسٹم کی ہدایات کو نظر انداز یا جزوی طور پر فالو کر سکتے ہیں۔ اگر یہ محسوس کریں تو دوسرے ماڈل پر سوئچ کریں۔
- **ریٹ لمٹس**: مفت-ٹیر API کلیدوں کی روزانہ ریٹ لمٹس ہوتی ہیں (HTTP 429)۔ ایجنٹ ایکسپونینشل بیک آف کے ساتھ دوبارہ کوشش کرتا ہے (زیادہ سے زیادہ 3 کوششیں)، لیکن مستقل حدود کے لیے فراہم کنندہ تبدیل کرنا یا انتظار کرنا ضروری ہے۔
- **ٹوکن ونڈو**: 128K کانٹیکسٹ ماڈل اور 20-تبادلہ سلائیڈنگ ونڈو کے ساتھ، بڑے کوڈبیسز کانٹیکسٹ کی حدود کو چھو سکتے ہیں۔ بڑے پروجیکٹس کے لیے `.env` میں `MAX_EXCHANGES` اور `MAX_TOOL_RESULT_LENGTH` بڑھائیں۔
- **سٹک ڈیٹیکشن**: ایجنٹ 3× ایک جیسے ٹول کالز یا 5× لگاتار ایک ہی نام کی کالز کے بعد روک دیتا ہے، ایک بحالی کا سسٹم پیغام داخل کرتا ہے، اور آخری ٹول کے نتائج ہٹاتا ہے۔ جاری رکھنے کے لیے اپنی درخواست دوبارہ لکھیں۔
- **Windows شیل**: PowerShell پائپ لائن آپریٹرز (`|`, `&&`) سخت opencode.json قوانین کے تحت تفصیلی اجازت کے پرامپٹس کو متحرک کر سکتے ہیں۔ سادہ کمانڈز بغیر پرامپٹس کے چلتی ہیں۔
- **رشتہ دار بمقابلہ مطلق پاتھ**: ماڈلز پاتھ کو متضاد طریقے سے ہینڈل کرتے ہیں — کچھ رشتہ دار پاتھ استعمال کرتے ہیں، کچھ مطلق۔ ایجنٹ `ALLOWED_DIR` کے اندر پاتھ کو نارملائز کرتا ہے۔

## سیکیورٹی

- تمام فائل آپریشنز `ALLOWED_DIR` تک محدود — `sanitizePath` ٹراورسل حملوں کو روکتا ہے
- شیل کمانڈز ورک اسپیس ڈائریکٹری کے اندر چلتی ہیں
- API کلیدیں `.env` میں محفوظ ہیں (`.gitignore` میں درج، کبھی کمٹ نہیں ہوتیں)
- سیف موڈ (`/safe`) کمانڈز کو وائٹ لسٹ تک محدود کرتا ہے
- خطرناک شیل کمانڈز ڈینی لسٹ کے ذریعے بلاک (rm -rf, dd, mkfs, wget, وغیرہ)
- بیک اپ/ریسٹور کے لیے `local/` اسکرپٹ استعمال کریں

## تعاون

تعاون کا خیرمقدم ہے! بلا جھجھک [issue](https://github.com/maz557/coding-agent-free/issues) کھولیں یا پل ریکویسٹ جمع کروائیں۔ اگر یہ کارآمد لگے تو ریپو کو اسٹار کریں — اس سے دوسروں کو اسے دریافت کرنے میں مدد ملتی ہے۔

## لائسنس

MIT
