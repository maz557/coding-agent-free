# Coding Agent Free

<p align="center">
  <img src="https://img.shields.io/github/stars/maz557/coding-agent-free?style=for-the-badge&logo=github" alt="Stars"/>
  <img src="https://img.shields.io/github/license/maz557/coding-agent-free?style=for-the-badge" alt="License"/>
  <img src="https://img.shields.io/github/last-commit/maz557/coding-agent-free?style=for-the-badge&logo=git" alt="Last Commit"/>
  <img src="https://img.shields.io/badge/TypeScript-6.x-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/github/actions/workflow/status/maz557/coding-agent-free/ci.yml?branch=main&style=for-the-badge&logo=githubactions" alt="CI"/>
  <br/>
  <a href="#-چرا-این-عامل"><strong>چرا این عامل؟</strong></a> •
  <a href="#شروع-سریع"><strong>شروع سریع</strong></a> •
  <a href="#رابط-خط-فرمان"><strong>CLI</strong></a> •
  <a href="#رابط-وب"><strong>وب</strong></a> •
  <a href="#نمونه-تعاملات"><strong>نمونه‌ها</strong></a>
</p>

<p align="center">
  🌐
  <a href="README.fa.md"><strong>فارسی</strong></a> •
  <a href="README.md">English</a> •
  <a href="README.ar.md">العربية</a> •
  <a href="README.tr.md">Türkçe</a> •
  <a href="README.es.md">Español</a> •
  <a href="README.fr.md">Français</a> •
  <a href="README.ur.md">اردو</a>
</p>

یک دستیار کدنویسی تعاملی مبتنی بر هوش مصنوعی که در **ترمینال** یا **مرورگر وب** شما اجرا می‌شود — نیرو گرفته از APIهای **رایگان** ابری (OpenRouter، Groq، Google، DeepSeek، Mistral) و مدل‌های **محلی** (Ollama، LM Studio، Llama.cpp). این ابزار فایل‌ها را می‌خواند، می‌نویسد، جستجو می‌کند، کپی می‌کند، انتقال می‌دهد و حذف می‌کند، و دستورات shell را اجرا می‌کند — همه از طریق فراخوانی ابزار با زبان طبیعی.

> 💡 **آماده آفلاین**: با یک سرور محلی، عامل کاملاً آفلاین کار می‌کند — بدون نیاز به اینترنت، هیچ داده‌ای از دستگاه شما خارج نمی‌شود.

## 🧠 چرا این عامل؟

| مشکل | چگونه این عامل آن را حل می‌کند |
|---------|--------------------------|
| دستیارهای کدنویسی ماهانه ۲۰ دلار هزینه دارند (ChatGPT+، Claude Pro) | **۱۰۰٪ رایگان** — از رایگان OpenRouter، Groq، Google، DeepSeek، Mistral + مدل‌های محلی استفاده می‌کند |
| یک ارائه‌دهنده قطع / محدود به نرخ می‌شود | **۸ ارائه‌دهنده** — بازگشت خودکار در ۴۲۹ + دستی `/model <n>` |
| دسترسی به اینترنت ندارید / منطقه محدود شده | **مدل‌های محلی** (Ollama، LM Studio، Llama.cpp) — کاملاً آفلاین |
| نگرانی از حریم خصوصی با APIهای ابری | فقط **مدل‌های محلی** را اجرا کنید — هیچ داده‌ای از دستگاه شما خارج نمی‌شود |
| راه‌اندازی خیلی پیچیده است | **`npm run setup`** — ویزارد تعاملی، بدون ویرایش دستی `.env` |
| هوش مصنوعی دستورات خطرناک اجرا می‌کند | **حالت امن** (`/safe`) — فقط دستورات shell لیست سفید |
| عامل در حلقه می‌ماند | **تشخیص هوشمند** — پس از ۳ بار فراخوانی یکسان ابزار متوقف می‌شود |
| ارائه‌دهنده محدود به نرخ شده | **بازگشت خودکار** — ارائه‌دهنده را در ۴۲۹ به طور خودکار تغییر می‌دهد |
| نتایج طولانی ابزار توکن هدر می‌دهد | **فشرده‌سازی توکن** — برش سر+دم + حذف تکراری |
| می‌خواهید از IDE خود با مدل‌های رایگان استفاده کنید | **API سازگار با OpenAI** — `npm run setup-ide` ،Cline، Continue.dev، Cursor را متصل می‌کند |

## شروع سریع

```bash
git clone https://github.com/maz557/coding-agent-free.git
cd coding-agent-free
npm install
```

ویزارد راه‌اندازی تعاملی را اجرا کنید (توصیه می‌شود):
```bash
npm run setup
```

یا `.env` را به صورت دستی ایجاد کنید (حداقل یک ارائه‌دهنده انتخاب کنید):
```bash
# OpenRouter (ساده‌ترین — یک کلید برای ۱۸+ مدل رایگان فراخوانی ابزار)
echo "OPENROUTER_API_KEY=sk-or-v1-..." >> .env

# ارائه‌دهندگان اختیاری:
echo "GROQ_API_KEY=gsk_..." >> .env      # استنتاج فوق‌سریع
echo "GOOGLE_API_KEY=AIza..." >> .env     # مدل‌های Gemini
echo "DEEPSEEK_API_KEY=sk-..." >> .env    # DeepSeek
echo "MISTRAL_API_KEY=..." >> .env        # مدل‌های Mistral
```

**کاملاً آفلاین (بدون نیاز به کلید API):**
```bash
# ۱. کلون و نصب (یکبار نیاز به اینترنت دارد)
git clone https://github.com/maz557/coding-agent-free.git
cd coding-agent-free
npm install

# ۲. سرور مدل محلی خود را راه‌اندازی کنید (یکی را انتخاب کنید):
#    ollama run qwen3:14b           # Ollama
#    # یا LM Studio / llama-server را اجرا کنید

# ۳. عامل را راه‌اندازی کنید:
npm start

# ۴. داخل عامل، مدل محلی خود را اضافه کنید:
#    شما: /add 6 ollama:auto
#    شما: /model 6
```

## رابط خط فرمان

```bash
npm start
```

> در ویندوز، روی `run-cli.bat` دوبار کلیک کنید.
> 📝 **زبان‌های راست‌به‌چپ (فارسی، عربی، اردو، عبری و غیره):** اگر ترمینال شما متن راست‌به‌چپ را به درستی نمایش نمی‌دهد، به جای آن از `run-cli-rtl.bat` استفاده کنید — این فایل از طریق [WezTerm](https://wezfurlong.org/wezterm/) با پشتیبانی صحیح از دوطرفه (BiDi) اجرا می‌شود.

## رابط وب

```bash
npm run web
# http://localhost:3000 را در مرورگر خود باز کنید
```

> در ویندوز، روی `run-web.bat` دوبار کلیک کنید.

رابط وب از همان قابلیت‌های ترمینال پشتیبانی می‌کند — پاسخ‌های جریانی، فراخوانی ابزار، تغییر مدل (همه ۸ ارائه‌دهنده + تنظیمات کاربر)، تغییر حالت امن، مسیر مجاز و بازنشانی مکالمه. چندین تب مرورگر با نشست‌های مستقل پشتیبانی می‌شوند. CLI و وب از یک پیکربندی مدل (`src/config/models.ts`) و موتور ابزار (`fileManager.ts`) مشترک استفاده می‌کنند.

**جدید در v1.10 — بهبودهای رابط وب:**
- **نمایشگر تفاوت (Diff Viewer)** — هنگام نوشتن، جایگزینی یا الحاق فایل، تفاوت خط به خط (سبز + / قرمز -) نمایش داده می‌شود.
- **مدیریت نشست‌ها (Session Manager)** — ایجاد و جابجایی بین نشست‌ها با عنوان خودکار از اولین پیام، نمایش مدل و تعداد پیام‌ها.
- **دستورات اسلش (Slash Commands)** — `/active`، `/model 2`، `/safe`، `/allow`، `/reset`، `/models`، `/exit` در ورودی وب.
- **راهنمای تعاملی (Help Modal)** — دکمه `?` برای راهنمای کامل استفاده، تغییر مدل، مرور دستورات و توضیح نمایشگر تفاوت.
- **پخش SSE** — استفاده از `fetch` + `ReadableStream` (بدون وابستگی به `EventSource`).

سرور وب همچنین یک **API سازگار با OpenAI** در `http://localhost:3000/v1/chat/completions` ارائه می‌دهد، بنابراین هر کلاینت سازگار با OpenAI (Cline، Continue.dev، Cursor و غیره) می‌تواند از ارائه‌دهندگان پیکربندی شده شما از طریق یک نقطه پایانی واحد با پشتیبانی از بازگشت خودکار استفاده کند.

IDE خود را به طور خودکار پیکربندی کنید:
```bash
npm run setup-ide
```

این کار **Cline**، **Continue.dev** و **Cursor** را برای اشاره به پروکسی API محلی، با استفاده از کلیدهای ارائه‌دهنده `.env` شما از طریق مسیریابی یکسان پیکربندی می‌کند.

**نمونه نشست:**

```
┌──────────────────────────────────────────────────────────┐
│  💬 Coding Agent                       [🔒 Safe] [🌐 P] │
│  ──────────────────────────────────────────────────────── │
│                                                          │
│  شما: create a hello.py that prints "Hello from Web UI"  │
│                                                          │
│  ⏳ در حال فکر کردن... [Model: openrouter/free]          │
│                                                          │
│  🛠  write_file(path="hello.py", content="...")          │
│  ✔  فایل نوشته شد (25 bytes)                              │
│                                                          │
│  🛠  run_command(command="python hello.py")              │
│  ✔  Hello from Web UI                                     │
│                                                          │
│  انجام شد! hello.py ایجاد شد و تأیید شد که چاپ می‌کند:   │
│  Hello from Web UI                                       │
│  ──────────────────────────────────────────────────────── │
│ [ورودی پیام...                               ] [ارسال]   │
└──────────────────────────────────────────────────────────┘
```

> کشوی پایین مدل به شما امکان می‌دهد در میانه نشست بین همه ۸ ارائه‌دهنده و تنظیمات ذخیره شده خود جابجا شوید. پاسخ‌های جریانی توکن به توکن در زمان واقعی نمایش داده می‌شوند.
> روی دکمه **`?`** در هدر کلیک کنید تا یک راهنمای کمک با راهنمای استفاده، دستورالعمل‌های تغییر مدل و معادل‌های دستورات CLI باز شود.

## نمونه تعاملات

**"یک اسکریپت پایتون ایجاد کن که اعداد فیبوناچی را چاپ کند"**

عامل فایل را ایجاد می‌کند، کد را می‌نویسد، سپس آن را برای تأیید اجرا می‌کند:

```
شما: یک fibonacci.py بنویس که ۲۰ عدد اول را چاپ کند
⏳ در حال فکر کردن...
  🔧 write_file({"path":"fibonacci.py","content":"..."})
  🔧 run_command({"command":"python fibonacci.py"})
عامل: انجام شد! fibonacci.py ایجاد شد و خروجی تأیید شد: 0, 1, 1, 2, 3, 5...
```

**"همه فایل‌های TypeScript که fetch() را صدا می‌زنند پیدا کن و با axios جایگزین کن"**

```
شما: همه فایل‌های .ts با فراخوانی fetch() را پیدا کن و به axios تغییر بده
  🔧 search_content({"pattern":"fetch(","filePattern":"*.ts"})
  🔧 read_file({"path":"src/api.ts"})
  🔧 replace_in_file({"path":"src/api.ts","old_str":"fetch(","new_str":"axios."})
عامل: ۳ فایل به‌روزرسانی شد (api.ts, users.ts, auth.ts).
```

**"این خطا را دیباگ کن: Cannot read property 'map' of undefined"**

عامل فایل مربوطه را می‌خواند، کد را تحلیل می‌کند، یک راه‌حل پیشنهاد می‌دهد و اعمال می‌کند.

## ویژگی‌ها

- **۸ ارائه‌دهنده** — OpenRouter، Groq، Google، DeepSeek، Mistral + Ollama، LM Studio، Llama.cpp
- **۵ تنظیمات از پیش تعیین شده داخلی** — با `openrouter/free` شروع کنید (به طور خودکار مدل‌های رایگان کارآمد را کشف می‌کند)
- **تنظیمات کاربر** — مدل‌های خود را با `/save`، `/add`، `/remove` ذخیره/اضافه/حذف کنید
- **زنجیره بازگشتی** — بازگشت خودکار بین ارائه‌دهندگان در محدودیت نرخ (۴۲۹)، به علاوه بازگشت‌های سطح مدل
- **۱۳ ابزار** — read، write، list (با جزئیات)، create_folder، delete_file، delete_folder (بازگشتی)، append_file، copy_file، move_file، file_info، search_content، replace_in_file و run_command
- **فشرده‌سازی توکن** — برش سر+دم نتایج طولانی ابزار + حذف خودکار تکراری
- **پنجره لغزان زمینه** — آخرین ۲۰ تبادل را به طور پیش‌فرض نگه می‌دارد، به طور خودکار کوتاه می‌کند تا از خطاهای محدودیت توکن جلوگیری کند (قابل تنظیم با `MAX_EXCHANGES` / `MAX_TOOL_RESULT_LENGTH`)
- **تشخیص هوشمند حلقه** — اگر یک ابزار ۳+ بار به طور یکسان یا ۵+ بار متوالی فراخوانی شود، متوقف می‌شود
- **حالت امن** (`--safe` / `/safe`) — فقط دستورات shell لیست سفید
- **ویزارد راه‌اندازی** — `npm run setup` به طور تعاملی `.env` را پیکربندی می‌کند
- **تلاش مجدد خودکار** — Backoff نمایی + تایم‌اوت ۱۲۰ ثانیه (۳۰۰ ثانیه برای مدل‌های محلی)
- **اعتبارسنجی Zod** — بررسی نوع در زمان اجرا برای هر ورودی و خروجی ابزار
- **CLI و وب یکپارچه** — پیکربندی مدل مشترک، پرامپت سیستم، موتور ابزار، تعاریف ارائه‌دهنده و تنظیمات کاربر در هر دو رابط
- **opencode.json** — قوانین مجوز جامع (۱۰۰+ الگوی دستور امن به طور خودکار مجاز) و خروجی ابزار کوتاه شده برای پرامپت‌های تمیزتر
- **کوتاه‌سازی خروجی ابزار** — همه نتایج ابزار در ۵۰۰۰ کاراکتر محدود شده (`MAX_TOOL_RESULT_LENGTH`) برای تمیز نگه داشتن زمینه
- **ماندگاری مکالمه** — ذخیره/بازیابی خودکار نشست‌ها در راه‌اندازی مجدد
- **ثبت ساختاریافته** — از طریق `pino` (stderr، با UI تداخل ندارد)

## ابزارهای موجود

| ابزار | توضیحات |
|------|-------------|
| `read_file` | خواندن محتویات یک فایل |
| `write_file` | نوشتن محتوا در یک فایل (ایجاد/بازنویسی) |
| `list_files` | فهرست کردن محتویات دایرکتوری. از `details:true` برای اندازه + زمان استفاده کنید |
| `create_folder` | ایجاد یک پوشه جدید |
| `delete_file` | حذف یک فایل |
| `delete_folder` | حذف یک پوشه. برای پوشه‌های غیر خالی `recursive:true` را تنظیم کنید |
| `append_file` | افزودن محتوا به انتهای یک فایل موجود |
| `copy_file` | کپی کردن یک فایل از مبدأ به مقصد |
| `move_file` | انتقال یا تغییر نام یک فایل |
| `file_info` | دریافت فراداده دقیق (اندازه، مجوزها، زمان‌ها) |
| `search_content` | جستجوی متن دقیق در فایل‌ها. از `filePattern` (مثلاً `*.ts`) و `maxResults` (پیش‌فرض ۵۰) پشتیبانی می‌کند. فایل‌های بزرگتر از ۱MB را نادیده می‌گیرد |
| `replace_in_file` | جایگزینی اولین وقوع متن دقیق (حساس به بزرگی کوچکی حروف) |
| `run_command` | اجرای یک دستور shell در فضای کاری |

## دستورات

| دستور | توضیحات |
|---------|-------------|
| `/model <n>` | تغییر به تنظیمات n |
| `/save <n>` | ذخیره مدل فعلی به عنوان تنظیمات n |
| `/add <n> <m>` | اضافه کردن مدل m به عنوان تنظیمات n (`provider:model` یا فقط `model`) |
| `/remove <n>` | حذف یک تنظیمات کاربر |
| `/allow <p>` | اجازه دسترسی مدل به یک مسیر خارج از فضای کاری |
| `/safe` | تغییر وضعیت حالت امن (فقط دستورات shell لیست سفید) |
| `/models` | نمایش همه تنظیمات |
| `/active` | نمایش مدل فعال فعلی |
| `/reset` | پاک کردن تاریخچه مکالمه (شروع تازه) |
| `/list-providers` | نمایش ارائه‌دهندگان با کلیدهای معتبر (و ارائه‌دهندگان محلی) |
| `/exit` | خروج |

## استفاده چند-ارائه‌دهنده

هر تنظیمات به یک ارائه‌دهنده متصل است. تغییر تنظیمات با `/model <n>` به طور خودکار کلاینت API را بازآفرینی می‌کند:

```
شما: /add 6 groq:openai/gpt-oss-120b
✅ تنظیمات ۶ اضافه شد: [Groq] openai/gpt-oss-120b

شما: /model 6
✅ به تنظیمات ۶ تغییر یافت: [Groq] openai/gpt-oss-120b
   (اکنون از API Groq با gpt-oss-120b استفاده می‌کند)

شما: /model 1
✅ به تنظیمات ۱ تغییر یافت: [OpenRouter] openrouter/free
   (بازگشت به OpenRouter)
```

### افزودن مدل از سایر ارائه‌دهندگان

```
/add <n> <provider>:<model-id>
```

نمونه‌ها:
```
/add 10 groq:llama-3.3-70b-versatile
/add 11 google:gemini-2.0-flash-exp
/add 12 deepseek:deepseek-chat
/add 13 mistral:codestral-latest
```

اگر ارائه‌دهنده را حذف کنید (مثلاً `/add 10 llama-3.3-70b-versatile`)، به طور پیش‌فرض از ارائه‌دهنده تنظیمات فعلی استفاده می‌کند.

## مدل‌های محلی (Ollama, LM Studio, Llama.cpp)

عامل از هر سرور محلی سازگار با OpenAI بدون هیچ پیکربندی پشتیبانی می‌کند:

### شروع سریع

مطمئن شوید سرور محلی شما در حال اجراست، سپس:

```
شما: /add 6 ollama:auto
✅ مدل به طور خودکار تشخیص داده شد: llama3.2:latest
✅ تنظیمات ۶ اضافه شد: [Ollama] llama3.2:latest

شما: /model 6
✅ به تنظیمات ۶ تغییر یافت: [Ollama] llama3.2:latest
```

یا برای LM Studio:

```
شما: /add 7 lmstudio:auto
✅ تنظیمات ۷ اضافه شد: [LM Studio] qwen2.5-coder-7b-instruct
```

کلیدواژه `:auto` به عامل می‌گوید به سرور محلی متصل شود و مدل بارگذاری شده را به طور خودکار تشخیص دهد.

### شروع سریع — مدل محلی مشخص

```bash
# Ollama — دریافت و سرو کردن یک مدل فراخوانی ابزار
ollama pull llama3.2
ollama serve                  # روی پورت ۱۱۴۳۴ شروع می‌شود

# Llama.cpp — سرو کردن مستقیم یک مدل GGUF
llama-server -m qwen2.5-coder-1.5b-instruct-q4_k_m.gguf --port 8080

# LM Studio — از CLI داخلی lms استفاده می‌کند
lms get llama-3.2-3b-instruct   # دانلود یک مدل
lms load llama-3.2-3b-instruct  # بارگذاری در حافظه
lms server start --port 1234    # شروع سرور API
```

سپس مدل محلی را به عامل اضافه کنید:
```
/add 6 ollama:auto
/add 7 lmstudio:auto
/add 8 llamacpp:auto
```

### پورت‌های سفارشی

در `.env` تنظیم کنید:
```bash
OLLAMA_HOST=http://localhost:11434/v1
LMSTUDIO_HOST=http://localhost:1234/v1
LLAMACPP_HOST=http://localhost:8080/v1
```

### نیازمندی‌ها

- **Ollama**: [دانلود](https://ollama.ai) → `ollama pull llama3.2` → `ollama serve`
- **LM Studio**: [دانلود](https://lmstudio.ai) → `lms get llama-3.2-3b-instruct` → `lms server start --port 1234`
- **Llama.cpp**: [دانلود](https://github.com/ggerganov/llama.cpp) → بسازید یا یک باینری بگیرید → `llama-server -m model.gguf --port 8080`
- مدل باید از **فراخوانی ابزار** (function calling) برای عملکرد کامل عامل پشتیبانی کند.
- بدون نیاز به کلید API — ارائه‌دهندگان محلی در هنگام اعتبارسنجی کلید راه‌اندازی نادیده گرفته می‌شوند.
- همه ارائه‌دهندگان محلی از API سازگار با OpenAI استفاده می‌کنند، بنابراین هیچ بسته اضافی نیاز نیست.

## فضای کاری و مجوزها

به طور پیش‌فرض، عامل فقط می‌تواند به فایل‌های داخل `./workspace` دسترسی داشته باشد. برای دسترسی به مسیرهای دیگر:

### گزینه ۱: تغییر فضای کاری پیش‌فرض (دائمی)

`ALLOWED_DIR` را در `.env` تنظیم کنید:
```
ALLOWED_DIR=.          # ریشه پروژه — دسترسی به همه چیز
ALLOWED_DIR=C:\path    # هر مسیر مطلق
```

### گزینه ۲: اجازه مسیرها در صورت نیاز (هر نشست)

وقتی مدل سعی می‌کند به یک مسیر خارج از فضای کاری دسترسی پیدا کند:
```
❌ خطای ابزار: دسترسی رد شد: "C:\path" خارج از دایرکتوری مجاز است.
   از دستور استفاده کنید: /allow "C:\path"
```

دسترسی را اعطا کنید با:
```
شما: /allow "C:\path"
✅ مجاز شد: C:\path
```

مجوزها فقط برای نشست فعلی معتبر هستند.

## تنظیمات از پیش تعیین شده داخلی

| # | مدل | ارائه‌دهنده | سرعت | یادداشت‌ها |
|---|-------|----------|-------|-------|
| 1 | `openrouter/free` | OpenRouter | متغیر | مسیریابی خودکار به مدل‌های رایگان موجود |
| 2 | Qwen 3 Next 80B | OpenRouter | متوسط | همه‌منظوره خوب |
| 3 | Nemotron 3 Super 120B | OpenRouter | متوسط | ۱M زمینه |
| 4 | OpenAI GPT-OSS 120B | OpenRouter | سریع | استدلال قوی |
| 5 | Nemotron 3 Ultra 550B | OpenRouter | کند | بزرگترین مدل رایگان با ابزارها |

## مدل‌های رایگان کدنویسی توصیه شده بر اساس ارائه‌دهنده

### OpenRouter
از مسیریاب `openrouter/free` استفاده کنید، یا مدل‌های خاص را با `/add <n> <model>:free` ثابت کنید.

### Groq (سریع‌ترین — سخت‌افزار LPU)
```
/add 6 groq:openai/gpt-oss-120b       # 120B، ۵۰۰ t/s
/add 7 groq:llama-3.3-70b-versatile   # 70B، ۲۸۰ t/s
/add 8 groq:qwen/qwen3-32b            # 32B، ۴۰۰ t/s
/add 9 groq:meta-llama/llama-4-scout-17b-16e-instruct  # ۷۵۰ t/s
```
محدودیت نرخ: ۳۰ RPM، ~۱K RPD. همه مدل‌ها از فراخوانی ابزار پشتیبانی می‌کنند.

### Mistral (میزبانی شده در اروپا)
```
/add 10 mistral:codestral-latest       # مدل کدنویسی اختصاصی
/add 11 mistral:mistral-large-latest   # بهترین کیفیت
/add 12 mistral:mistral-small-latest   # سبک و سریع
/add 13 mistral:open-mistral-nemo      # ۱۲۸K زمینه، وزن باز
```
رایگان: ~۱ req/s، ۱ میلیارد توکن در ماه.

### Google AI Studio
```
/add 14 google:gemini-2.0-flash-exp    # سریع، کدنویسی خوب
```
رایگان: ۵-۱۵ RPM، ۱۰۰-۱K RPD.

### DeepSeek
```
/add 15 deepseek:deepseek-chat         # همه‌منظوره
/add 16 deepseek:deepseek-reasoner     # استدلال قوی
```
رایگان: ~۵۰۰ RPM، ۵۰۰ میلیون توکن در روز.

## نمونه نشست

```
شما: /model 4
✅ به تنظیمات ۴ تغییر یافت: openai/gpt-oss-120b:free

شما: یک پوشه به نام demo بساز و یک hello.py در آن بنویس
⏳ در حال فکر کردن...
  [Model: openai/gpt-oss-120b:free]
  🔧 create_folder({"path":"demo"})
  🔧 write_file({"path":"demo/hello.py","content":"print('Hello, world!')\n"})
عامل: انجام شد! demo/hello.py با یک اسکریپت Hello World ایجاد شد.

شما: فایل را اجرا کن
⏳ در حال فکر کردن...
  [Model: openai/gpt-oss-120b:free]
  🔧 run_command({"command":"python demo/hello.py"})
عامل: Hello, world! — اسکریپت به درستی کار می‌کند.

شما: /model 6
✅ به تنظیمات ۶ تغییر یافت: [Groq] openai/gpt-oss-120b
   (اکنون از Groq استفاده می‌کند — همان مدل، ۵۰۰ t/s)

شما: فایل‌ها را فهرست کن
⏳ در حال فکر کردن...
  [Model: openai/gpt-oss-120b]
  🔧 run_command({"command":"ls -la"})
عامل: demo/hello.py  ...
```

## عیب‌یابی

| خطا | علت احتمالی | رفع |
|-------|-------------|------|
| `403 Forbidden` | کلید API گم شده یا نامعتبر | بررسی کنید `.env` کلید صحیح برای آن ارائه‌دهنده را دارد |
| `403 Forbidden` | محدودیت‌های اینترنتی که میزبان API را مسدود می‌کند | VPN/proxy را فعال کنید، `HTTPS_PROXY` را تنظیم کنید، یا از مدل‌های محلی استفاده کنید: `/add 6 ollama:auto` |
| `429 Rate limit exceeded` | محدودیت روزانه رایگان رسیده شده | صبر کنید یا اجازه دهید **بازگشت خودکار** ارائه‌دهنده را تغییر دهد. دستی: `/model <n>` |
| `Agent stopped: stuck detected` | همان ابزار ۳+ بار متوالی فراخوانی شده | پیام بازیابی به طور خودکار تزریق می‌شود — درخواست خود را مجدداً بیان کنید |
| `All 3 attempts failed` | مدل غیرقابل دسترس یا خیلی کند | یک مدل کوچکتر امتحان کنید، از مدل‌های محلی استفاده کنید، یا ارائه‌دهنده را با `/model <n>` تغییر دهید |
| `tool_calls` با آرگومان‌های خالی | مدل از فراخوانی ابزار پشتیبانی نمی‌کند | از یک مدل متفاوت استفاده کنید |
| `ENOTFOUND` / `ECONNREFUSED` | محدودیت‌های اینترنتی یا نیاز به پروکسی | VPN/proxy را فعال کنید، `HTTPS_PROXY` را تنظیم کنید، یا از مدل‌های محلی استفاده کنید |

### بررسی‌های سریع
- `/list-providers` — نشان می‌دهد کدام کلیدهای API پیکربندی شده‌اند
- `/safe` — تغییر وضعیت حالت امن
- `npm run setup` — اجرای مجدد ویزارد راه‌اندازی
- `npm start` — راه‌اندازی مجدد پس از هر به‌روزرسانی کد

## ساختار پروژه

```
coding-agent-free/
├── src/
│   ├── agent.ts                # نقطه ورود CLI
│   ├── CodingAgent.ts          # حلقه عامل، اجرای ابزار، تشخیص گیرکردن
│   ├── ConversationState.ts    # پنجره لغزان، کوتاه‌سازی زمینه، مدیریت پیام
│   ├── commands.ts             # قالب‌بندی تنظیمات، showModels
│   ├── detectLocalModel.ts     # تشخیص خودکار مدل‌ها در ارائه‌دهندگان محلی
│   ├── persistence.ts          # ذخیره/بارگیری مکالمه و تنظیمات (با اعتبارسنجی Zod)
│   ├── tokenEstimator.ts       # تخمین توکن (طول/۴)
│   ├── types.ts                # تعاریف انواع مشترک (ChatMessage، ToolCall و غیره)
│   ├── validation.ts           # طرح‌های Zod برای ورودی/خروجی ابزار
│   ├── server.ts               # سرور وب Express (جریانی SSE)
│   ├── config/
│   │   └── models.ts           # تعاریف ارائه‌دهنده، تنظیمات، پرامپت سیستم
│   ├── tools/
│   │   └── fileManager.ts      # ۱۳ ابزار + حالت امن + محدودیت‌های فضای کاری
│   └── __tests__/              # تست‌های واحد
│       ├── ConversationState.test.ts  # ۹ تست: trim، removeLastAssistantTurn و غیره
│       ├── comprehensive.test.ts      # ۳۰ تست: همه ماژول‌ها + یکپارچگی
│       ├── CodingAgent.test.ts        # ۱۱ تست: اجرا، گرفتگی، تلاش مجدد، خطاها
│       ├── loadProjectContext.test.ts  # ۷ تست: جستجوی فایل، پیمایش، موارد مرزی
│       ├── fileManager.test.ts        # ۲۶ تست: همه ۱۳ ابزار + حالت امن
│       ├── agent.test.ts              # ۲۴ تست: دستورات CLI، parsing regex، createClient
│       └── server.test.ts             # ۲۱ تست: نقاط پایانی API، session، safe-mode، proxy
├── .github/
│   └── workflows/
│       └── ci.yml              # CI: بررسی نوع + تست‌ها در push/PR
├── scripts/
│   ├── check_models.js         # فهرست مدل‌های رایگان OpenRouter با پشتیبانی ابزار
│   ├── cleanup.js              # کشتن فرآیندهای قدیمی روی پورت ۳۰۰۰
│   ├── comprehensive-test.js   # ۳۵ تست یکپارچگی (npm test)
│   ├── provider-integration-test.ts  # ۲۶ تست یکپارچگی تامین‌کننده (npm run test:integration)
│   ├── setup.js                # ویزارد راه‌اندازی تعاملی (npm run setup)
│   ├── setup-ide.js            # پیکربندی IDEها برای استفاده از پروکسی API محلی
│   ├── test.js                 # تست دود CLI غیرتعاملی
│   ├── test-improvements.js
│   ├── tool-integration-test.ts
│   └── wezterm-launcher.cmd    # کمک‌کننده برای run-cli-rtl.bat
├── local/                      # ابزارهای محلی (gitignored)
│   ├── backup/src/             # عکس فوری از src/ برای بازگشت سریع
│   └── restore.ps1             # بازیابی src/ از پشتیبان
├── workspace/                  # دایرکتوری کاری پیش‌فرض
├── .env                        # کلیدهای API (gitignored)
├── presets.json                # تنظیمات کاربر (gitignored)
├── tsconfig.json
├── run-cli.bat                 # راه‌انداز CLI (ویندوز)
├── run-cli-rtl.bat             # راه‌انداز CLI با پشتیبانی RTL (WezTerm)
└── run-web.bat                 # راه‌انداز رابط وب (ویندوز)
```

> 📝 اجرای تست‌ها: `npm run test:unit` (۱۳۷ تست واحد) — `npm run test:integration` (۲۶ تست یکپارچگی تامین‌کننده) — `npm test` (۳۵ تست یکپارچگی)

## متغیرهای محیطی

| متغیر | اجباری؟ | توضیحات |
|----------|-----------|-------------|
| `OPENROUTER_API_KEY` | خیر* | کلید API OpenRouter — https://openrouter.ai/keys |
| `GROQ_API_KEY` | خیر* | کلید API Groq — https://console.groq.com/keys |
| `GOOGLE_API_KEY` | خیر* | کلید Google AI Studio — https://aistudio.google.com/apikey |
| `DEEPSEEK_API_KEY` | خیر* | کلید API DeepSeek — https://platform.deepseek.com |
| `MISTRAL_API_KEY` | خیر* | کلید API Mistral — https://console.mistral.ai |
| `OLLAMA_HOST` | خیر | URL سرور Ollama (پیش‌فرض: `http://localhost:11434/v1`) |
| `LMSTUDIO_HOST` | خیر | URL سرور LM Studio (پیش‌فرض: `http://localhost:1234/v1`) |
| `LLAMACPP_HOST` | خیر | URL سرور Llama.cpp (پیش‌فرض: `http://localhost:8080/v1`) |
| `ALLOWED_DIR` | خیر | دایرکتوری برای عملیات فایل (پیش‌فرض: `./workspace`) |
| `LOCAL_TIMEOUT` | خیر | تایم‌اوت (ms) برای درخواست‌های مدل محلی (پیش‌فرض: ۳۰۰۰۰۰) |
| `LOG_LEVEL` | خیر | سطح لاگ: `debug`، `info`، `warn`، `error` (پیش‌فرض: `info`) |
| `MAX_EXCHANGES` | خیر | حداکثر تبادلات کاربر ↔ دستیار نگه داشته شده در پنجره لغزان (پیش‌فرض: `۲۰`) |
| `MAX_TOOL_RESULT_LENGTH` | خیر | حداکثر کاراکتر قبل از کوتاه‌سازی نتایج ابزار (پیش‌فرض: `۵۰۰۰`) |

\* حداقل یک کلید API لازم است (برای ارائه‌دهندگان محلی نیاز نیست).

## پروژه‌های بزرگ

برای پروژه‌های متوسط تا بزرگ، پنجره لغزان پیش‌فرض (۲۰ تبادل) ممکن است زمینه قدیمی‌تر را حذف کند. این مقادیر را در `.env` افزایش دهید:

```env
# نگهداری تا ۵۰ تبادل کاربر-دستیار
MAX_EXCHANGES=50

# اجازه نتایج ابزار تا ۲۰,۰۰۰ کاراکتر
MAX_TOOL_RESULT_LENGTH=20000
```

همچنین می‌توانید مکالمه را در میانه نشست با `/reset` بازنشانی کنید اگر مدل با زمینه قدیمی گیج شود.

## محدودیت‌ها

- **پایبندی به پرامپت سیستم**: برخی مدل‌های رایگان (مثلاً Nvidia Nemotron 550B) ممکن است دستورالعمل‌های سیستم را نادیده گرفته یا تا حدی دنبال کنند. اگر متوجه این موضوع شدید، به یک مدل متفاوت تغییر دهید.
- **محدودیت نرخ**: کلیدهای API رایگان دارای محدودیت نرخ روزانه هستند (HTTP 429). عامل با backoff نمایی (حداکثر ۳ تلاش) مجدداً تلاش می‌کند، اما محدودیت‌های پایدار نیاز به تغییر ارائه‌دهنده یا انتظار دارند.
- **پنجره توکن**: با یک مدل زمینه ۱۲۸K و پنجره لغزان ۲۰ تبادل، پایگاه‌های کد بزرگ ممکن است به محدودیت‌های زمینه برسند. `MAX_EXCHANGES` و `MAX_TOOL_RESULT_LENGTH` را در `.env` برای پروژه‌های بزرگتر افزایش دهید.
- **تشخیص گیرکردن**: عامل پس از ۳ بار فراخوانی یکسان ابزار یا ۵ بار متوالی با نام یکسان متوقف می‌شود، یک پیام سیستم بازیابی تزریق می‌کند و آخرین نتایج ابزار را حذف می‌کند. فقط درخواست خود را برای ادامه مجدداً بیان کنید.
- **Shell ویندوز**: عملگرهای pipeline پاورشل (`|`، `&&`) ممکن است تحت قوانین سختگیرانه opencode.json اعلان‌های مجوز طولانی ایجاد کنند. دستورات ساده بدون اعلان کار می‌کنند.
- **مسیرهای نسبی در مقابل مطلق**: مدل‌ها مسیرها را ناسازگار مدیریت می‌کنند — برخی از مسیرهای نسبی استفاده می‌کنند، برخی دیگر مطلق. عامل مسیرها را در `ALLOWED_DIR` نرمال می‌کند.

## امنیت

- همه عملیات فایل به `ALLOWED_DIR` محدود شده است — `sanitizePath` از حملات traversal جلوگیری می‌کند
- دستورات Shell در داخل دایرکتوری فضای کاری اجرا می‌شوند
- کلیدهای API در `.env` ذخیره می‌شوند (در `.gitignore` لیست شده، هرگز commit نمی‌شوند)
- حالت امن (`/safe`) دستورات را به یک لیست سفید محدود می‌کند
- دستورات خطرناک Shell توسط لیست سیاه مسدود شده‌اند (rm -rf، dd، mkfs، wget و غیره)
- از اسکریپت‌های `local/` برای پشتیبان‌گیری/بازیابی استفاده کنید

## مشارکت

مشارکت‌ها خوش‌آمد می‌گویند! می‌توانید یک [issue](https://github.com/maz557/coding-agent-free/issues) باز کنید یا یک pull request ارسال کنید. اگر این ابزار را مفید یافتید، به مخزن ستاره دهید — این کار به دیگران در کشف آن کمک می‌کند.

## مجوز

MIT
