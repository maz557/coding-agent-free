# Coding Agent Free

<p align="center">
  <img src="https://img.shields.io/github/stars/maz557/coding-agent-free?style=for-the-badge&logo=github" alt="Estrellas"/>
  <img src="https://img.shields.io/github/license/maz557/coding-agent-free?style=for-the-badge" alt="Licencia"/>
  <img src="https://img.shields.io/github/last-commit/maz557/coding-agent-free?style=for-the-badge&logo=git" alt="Último commit"/>
  <img src="https://img.shields.io/badge/TypeScript-6.x-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/github/actions/workflow/status/maz557/coding-agent-free/ci.yml?branch=main&style=for-the-badge&logo=githubactions" alt="CI"/>
  <br/>
  <a href="#-why-this-agent"><strong>¿Por qué este agente?</strong></a> •
  <a href="#quick-start"><strong>Inicio rápido</strong></a> •
  <a href="#cli-interface"><strong>CLI</strong></a> •
  <a href="#web-interface"><strong>Web</strong></a> •
  <a href="#example-interactions"><strong>Ejemplos</strong></a>
</p>

<p align="center">
  🌐
  <a href="README.es.md"><strong>Español</strong></a> •
  <a href="README.md">English</a> •
  <a href="README.fa.md">فارسی</a> •
  <a href="README.ar.md">العربية</a> •
  <a href="README.tr.md">Türkçe</a> •
  <a href="README.fr.md">Français</a> •
  <a href="README.ur.md">اردو</a>
</p>

Un asistente de codigo interactivo con IA que se ejecuta en tu **terminal** o **navegador web** — impulsado por APIs en la nube **gratuitas** (OpenRouter, Groq, Google, DeepSeek, Mistral) y modelos **locales** (Ollama, LM Studio, Llama.cpp). Lee, escribe, busca, copia, mueve y elimina archivos, y ejecuta comandos de shell — todo mediante llamadas a herramientas en lenguaje natural.

> 💡 **Listo para modo offline**: Con un servidor local, el agente funciona completamente sin conexión — no se necesita internet, ningún dato sale de tu máquina.

## 🧠 ¿Por qué este agente?

| Problema | Cómo lo resuelve este agente |
|---------|------------------------------|
| Los asistentes de codigo cuestan $20/mes (ChatGPT+, Claude Pro) | **100% gratuito** — usa el nivel gratuito de OpenRouter, Groq, Google, DeepSeek, Mistral + modelos locales |
| Un proveedor se cae o limita la tasa | **8 proveedores** — cambio automático en 429 + `/model <n>` manual |
| Sin acceso a internet / región restringida | **Modelos locales** (Ollama, LM Studio, Llama.cpp) — completamente offline |
| Preocupaciones de privacidad con APIs en la nube | Usa solo **modelos locales** — cero datos salen de tu máquina |
| La configuración es demasiado compleja | **`npm run setup`** — asistente interactivo, sin editar `.env` manualmente |
| La IA ejecuta comandos peligrosos | **Modo seguro** (`/safe`) — solo comandos de shell en lista blanca |
| El agente se queda en bucles | **Detección inteligente** — se detiene después de 3 llamadas a herramientas idénticas |
| El proveedor limita la tasa | **Cambio automático** — cambia de proveedor automáticamente en 429 |
| Resultados largos de herramientas desperdician tokens | **Compresión de tokens** — truncado de cabeza+cola + eliminación de duplicados |
| Quieres usar tu IDE con modelos gratuitos | **API compatible con OpenAI** — `npm run setup-ide` configura Cline, Continue.dev, Cursor |

## Inicio rápido

```bash
git clone https://github.com/maz557/coding-agent-free.git
cd coding-agent-free
npm install
```

Ejecuta el asistente de configuración interactivo (recomendado):
```bash
npm run setup
```

O crea `.env` manualmente (elige al menos un proveedor):
```bash
# OpenRouter (el más fácil — una sola clave para 18+ modelos gratuitos con llamada a herramientas)
echo "OPENROUTER_API_KEY=sk-or-v1-..." >> .env

# Proveedores opcionales:
echo "GROQ_API_KEY=gsk_..." >> .env      # Inferencia ultra-rápida
echo "GOOGLE_API_KEY=AIza..." >> .env     # Modelos Gemini
echo "DEEPSEEK_API_KEY=sk-..." >> .env    # DeepSeek
echo "MISTRAL_API_KEY=..." >> .env        # Modelos Mistral
```

**Completamente offline (sin necesidad de claves API):**
```bash
# 1. Clonar e instalar (requiere internet una vez)
git clone https://github.com/maz557/coding-agent-free.git
cd coding-agent-free
npm install

# 2. Inicia tu servidor de modelo local (elige uno):
#    ollama run qwen3:14b           # Ollama
#    # o ejecuta LM Studio / llama-server

# 3. Inicia el agente:
npm start

# 4. Dentro del agente, añade tu modelo local:
#    Tú: /add 6 ollama:auto
#    Tú: /model 6
```

## Interfaz CLI

```bash
npm start
```

> En Windows, haz doble clic en `run-cli.bat`.
> 📝 **Idiomas RTL (persa, árabe, urdu, hebreo, etc.):** Si tu terminal muestra texto de derecha a izquierda incorrectamente, usa `run-cli-rtl.bat` en su lugar — se inicia mediante [WezTerm](https://wezfurlong.org/wezterm/) con soporte BiDi adecuado.

## Interfaz Web

```bash
npm run web
# Abre http://localhost:3000 en tu navegador
```

> En Windows, haz doble clic en `run-web.bat`.

La interfaz web admite las mismas funciones que la terminal — respuestas en streaming, llamadas a herramientas, cambio de modelo (los 8 proveedores + preajustes de usuario), modo seguro, ruta permitida y reinicio de conversación. Se admiten múltiples pestañas del navegador con sesiones independientes. La CLI y la Web comparten la misma configuración de modelo (`src/config/models.ts`) y el mismo motor de herramientas (`fileManager.ts`).

El servidor web también expone una **API compatible con OpenAI** en `http://localhost:3000/v1/chat/completions`, por lo que cualquier cliente compatible con OpenAI (Cline, Continue.dev, Cursor, etc.) puede usar tus proveedores configurados a través de un único punto final con soporte de cambio automático.

Configura tu IDE automáticamente:
```bash
npm run setup-ide
```

Esto configurará **Cline**, **Continue.dev** y **Cursor** para que apunten al proxy API local, usando las claves de tus proveedores `.env` a través del mismo enrutamiento.

**Sesión de ejemplo:**

```
┌──────────────────────────────────────────────────────────┐
│  💬 Coding Agent                       [🔒 Seguro] [🌐 P] │
│  ──────────────────────────────────────────────────────── │
│                                                          │
│  Tú: create a hello.py that prints "Hello from Web UI"   │
│                                                          │
│  ⏳ Pensando... [Modelo: openrouter/free]                │
│                                                          │
│  🛠  write_file(path="hello.py", content="...")          │
│  ✔  Archivo escrito (25 bytes)                           │
│                                                          │
│  🛠  run_command(command="python hello.py")              │
│  ✔  Hello from Web UI                                    │
│                                                          │
│  ¡Listo! Se creó hello.py y se verificó que imprime:     │
│  Hello from Web UI                                       │
│  ──────────────────────────────────────────────────────── │
│  [Mensaje de entrada...                     ] [Enviar]   │
└──────────────────────────────────────────────────────────┘
```

> El menú desplegable de modelos te permite cambiar entre los 8 proveedores y tus preajustes guardados en medio de la sesión. Las respuestas en streaming aparecen token por token en tiempo real.
> Haz clic en el botón **`?`** en el encabezado para abrir un modal de ayuda con guía de uso, instrucciones para cambiar de modelo y equivalentes de comandos CLI.

## Ejemplos de Interacción

**"Crea un script en Python que imprima los números de Fibonacci"**

El agente creará el archivo, escribirá el código y luego lo ejecutará para verificar:

```
Tú: write a fibonacci.py that prints first 20 numbers
⏳ Pensando...
  🔧 write_file({"path":"fibonacci.py","content":"..."})
  🔧 run_command({"command":"python fibonacci.py"})
Agente: ¡Listo! Se creó fibonacci.py y se verificó la salida: 0, 1, 1, 2, 3, 5...
```

**"Encuentra todos los archivos TypeScript que llaman a fetch() y reemplázalos con axios"**

```
Tú: find all .ts files with fetch() calls and change them to axios
  🔧 search_content({"pattern":"fetch(","filePattern":"*.ts"})
  🔧 read_file({"path":"src/api.ts"})
  🔧 replace_in_file({"path":"src/api.ts","old_str":"fetch(","new_str":"axios."})
Agente: Se actualizaron 3 archivos (api.ts, users.ts, auth.ts).
```

**"Depura este error: Cannot read property 'map' of undefined"**

El agente lee el archivo relevante, analiza el código, sugiere y aplica una corrección.

## Características

- **8 proveedores** — OpenRouter, Groq, Google, DeepSeek, Mistral + Ollama, LM Studio, Llama.cpp
- **5 preajustes integrados** — comienza con `openrouter/free` (descubre automáticamente los modelos gratuitos disponibles)
- **Preajustes de usuario** — guarda/añade/elimina tus propios modelos con `/save`, `/add`, `/remove`
- **Cadena de respaldo** — cambio automático entre proveedores en caso de límite de tasa (429), más respaldos a nivel de modelo
- **13 herramientas** — read, write, list (con detalles), create_folder, delete_file, delete_folder (recursivo), append_file, copy_file, move_file, file_info, search_content, replace_in_file y run_command
- **Compresión de tokens** — truncado de cabeza+cola de resultados largos de herramientas + eliminación automática de duplicados
- **Ventana deslizante de contexto** — mantiene los últimos 20 intercambios por defecto, recorta automáticamente para evitar errores de límite de tokens (configurable mediante `MAX_EXCHANGES` / `MAX_TOOL_RESULT_LENGTH`)
- **Detección inteligente de bucles** — se detiene si una herramienta se llama 3+ veces de forma idéntica o 5+ veces consecutivas
- **Modo seguro** (`--safe` / `/safe`) — solo comandos de shell en lista blanca
- **Asistente de configuración** — `npm run setup` configura `.env` interactivamente
- **Reintento automático** — retroceso exponencial + tiempo de espera de 120s (300s para modelos locales)
- **Validación Zod** — verificación de tipos en tiempo de ejecución de cada entrada y salida de herramienta
- **CLI y Web unificados** — configuración de modelo, prompt del sistema, motor de herramientas, definiciones de proveedores y preajustes de usuario compartidos en ambas interfaces
- **opencode.json** — reglas de permisos completas (más de 100 patrones de comandos seguros auto-permitidos) y salida de herramientas truncada para prompts más limpios
- **Truncado de salida de herramientas** — todos los resultados de herramientas limitados a 5000 caracteres (`MAX_TOOL_RESULT_LENGTH`) para mantener el contexto limpio
- **Persistencia de conversación** — guardado/restauración automática de sesiones entre reinicios
- **Registro estructurado** — mediante `pino` (stderr, no interfiere con la interfaz de usuario)

## Herramientas Disponibles

| Herramienta | Descripción |
|-------------|-------------|
| `read_file` | Lee el contenido de un archivo |
| `write_file` | Escribe contenido en un archivo (crea/sobrescribe) |
| `list_files` | Lista el contenido de un directorio. Usa `details:true` para tamaño + marcas de tiempo |
| `create_folder` | Crea una nueva carpeta |
| `delete_file` | Elimina un solo archivo |
| `delete_folder` | Elimina una carpeta. Usa `recursive:true` para carpetas no vacías |
| `append_file` | Añade contenido a un archivo existente |
| `copy_file` | Copia un archivo de origen a destino |
| `move_file` | Mueve o renombra un archivo |
| `file_info` | Obtiene metadatos detallados (tamaño, permisos, marcas de tiempo) |
| `search_content` | Busca texto exacto en archivos. Soporta `filePattern` (ej. `*.ts`) y `maxResults` (defecto 50). Omite archivos >1MB |
| `replace_in_file` | Reemplaza la primera ocurrencia de texto exacto (sensible a mayúsculas) |
| `run_command` | Ejecuta un comando de shell en el espacio de trabajo |

## Comandos

| Comando | Descripción |
|---------|-------------|
| `/model <n>` | Cambia al preajuste n |
| `/save <n>` | Guarda el modelo actual como preajuste n |
| `/add <n> <m>` | Añade el modelo m como preajuste n (`provider:model` o solo `model`) |
| `/remove <n>` | Elimina un preajuste de usuario |
| `/allow <p>` | Permite al modelo acceder a una ruta fuera del espacio de trabajo |
| `/safe` | Alterna el modo seguro (solo comandos de shell en lista blanca) |
| `/models` | Muestra todos los preajustes |
| `/active` | Muestra el modelo activo actual |
| `/reset` | Limpia el historial de conversación (empezar de nuevo) |
| `/list-providers` | Muestra los proveedores con claves válidas (y proveedores locales) |
| `/exit` | Salir |

## Uso Multi-Proveedor

Cada preajuste está vinculado a un proveedor. Cambiar de preajuste con `/model <n>` recrea el cliente API automáticamente:

```
Tú: /add 6 groq:openai/gpt-oss-120b
✅ Añadido preajuste 6: [Groq] openai/gpt-oss-120b

Tú: /model 6
✅ Cambiado al preajuste 6: [Groq] openai/gpt-oss-120b
   (ahora usando la API de Groq con gpt-oss-120b)

Tú: /model 1
✅ Cambiado al preajuste 1: [OpenRouter] openrouter/free
   (de vuelta a OpenRouter)
```

### Añadir modelos de otros proveedores

```
/add <n> <provider>:<model-id>
```

Ejemplos:
```
/add 10 groq:llama-3.3-70b-versatile
/add 11 google:gemini-2.0-flash-exp
/add 12 deepseek:deepseek-chat
/add 13 mistral:codestral-latest
```

Si omites el proveedor (ej. `/add 10 llama-3.3-70b-versatile`), se usa por defecto el proveedor del preajuste actual.

## Modelos Locales (Ollama, LM Studio, Llama.cpp)

El agente soporta cualquier servidor local compatible con OpenAI sin configuración:

### Inicio rápido

Asegúrate de que tu servidor local esté ejecutándose, luego:

```
Tú: /add 6 ollama:auto
✅ Modelo auto-detectado: llama3.2:latest
✅ Añadido preajuste 6: [Ollama] llama3.2:latest

Tú: /model 6
✅ Cambiado al preajuste 6: [Ollama] llama3.2:latest
```

O para LM Studio:

```
Tú: /add 7 lmstudio:auto
✅ Añadido preajuste 7: [LM Studio] qwen2.5-coder-7b-instruct
```

La palabra clave `:auto` le indica al agente que se conecte al servidor local y detecte el modelo cargado automáticamente.

### Inicio rápido — modelo local específico

```bash
# Ollama — descargar y servir un modelo con llamada a herramientas
ollama pull llama3.2
ollama serve                  # se inicia en el puerto 11434

# Llama.cpp — servir un modelo GGUF directamente
llama-server -m qwen2.5-coder-1.5b-instruct-q4_k_m.gguf --port 8080

# LM Studio — usa la CLI lms integrada
lms get llama-3.2-3b-instruct   # descargar un modelo
lms load llama-3.2-3b-instruct  # cargar en memoria
lms server start --port 1234    # iniciar el servidor API
```

Luego añade el modelo local al agente:
```
/add 6 ollama:auto
/add 7 lmstudio:auto
/add 8 llamacpp:auto
```

### Puertos personalizados

Configura en `.env`:
```bash
OLLAMA_HOST=http://localhost:11434/v1
LMSTUDIO_HOST=http://localhost:1234/v1
LLAMACPP_HOST=http://localhost:8080/v1
```

### Requisitos

- **Ollama**: [Descargar](https://ollama.ai) → `ollama pull llama3.2` → `ollama serve`
- **LM Studio**: [Descargar](https://lmstudio.ai) → `lms get llama-3.2-3b-instruct` → `lms server start --port 1234`
- **Llama.cpp**: [Descargar](https://github.com/ggerganov/llama.cpp) → Compilar u obtener un binario → `llama-server -m model.gguf --port 8080`
- El modelo debe soportar **llamada a herramientas** (function calling) para la funcionalidad completa del agente.
- No se requiere clave API — los proveedores locales se omiten durante la validación de claves al inicio.
- Todos los proveedores locales usan la API compatible con OpenAI, por lo que no se necesitan paquetes adicionales.

## Espacio de Trabajo y Permisos

Por defecto, el agente solo puede acceder a archivos dentro de `./workspace`. Para acceder a otras rutas:

### Opción 1: Cambiar el espacio de trabajo predeterminado (permanente)

Configura `ALLOWED_DIR` en `.env`:
```
ALLOWED_DIR=.          # raíz del proyecto — accede a todo
ALLOWED_DIR=C:\path    # cualquier ruta absoluta
```

### Opción 2: Permitir rutas bajo demanda (por sesión)

Cuando el modelo intenta acceder a una ruta fuera del espacio de trabajo:
```
❌ Error de herramienta: Acceso denegado: "C:\path" está fuera del directorio permitido.
   Usa el comando: /allow "C:\path"
```

Concede acceso con:
```
Tú: /allow "C:\path"
✅ Permitido: C:\path
```

Los permisos duran solo para la sesión actual.

## Preajustes Integrados

| # | Modelo | Proveedor | Velocidad | Notas |
|---|--------|-----------|-----------|-------|
| 1 | `openrouter/free` | OpenRouter | variable | Enruta automáticamente a modelos gratuitos disponibles |
| 2 | Qwen 3 Next 80B | OpenRouter | media | Buen propósito general |
| 3 | Nemotron 3 Super 120B | OpenRouter | media | Contexto de 1M |
| 4 | OpenAI GPT-OSS 120B | OpenRouter | rápida | Razonamiento sólido |
| 5 | Nemotron 3 Ultra 550B | OpenRouter | lenta | Modelo gratuito más grande con herramientas |

## Modelos Gratuitos Recomendados para Codificación por Proveedor

### OpenRouter
Usa el enrutador `openrouter/free`, o fija modelos específicos con `/add <n> <model>:free`.

### Groq (el más rápido — hardware LPU)
```
/add 6 groq:openai/gpt-oss-120b       # 120B, 500 t/s
/add 7 groq:llama-3.3-70b-versatile   # 70B, 280 t/s
/add 8 groq:qwen/qwen3-32b            # 32B, 400 t/s
/add 9 groq:meta-llama/llama-4-scout-17b-16e-instruct  # 750 t/s
```
Límites de tasa: 30 RPM, ~1K RPD. Todos los modelos soportan llamada a herramientas.

### Mistral (alojado en la UE)
```
/add 10 mistral:codestral-latest       # Modelo dedicado de codificación
/add 11 mistral:mistral-large-latest   # Mejor calidad
/add 12 mistral:mistral-small-latest   # Ligero y rápido
/add 13 mistral:open-mistral-nemo      # Contexto de 128K, pesos abiertos
```
Nivel gratuito: ~1 req/s, 1B tokens/mes.

### Google AI Studio
```
/add 14 google:gemini-2.0-flash-exp    # Rápido, buena codificación
```
Nivel gratuito: 5-15 RPM, 100-1K RPD.

### DeepSeek
```
/add 15 deepseek:deepseek-chat         # Propósito general
/add 16 deepseek:deepseek-reasoner     # Razonamiento sólido
```
Nivel gratuito: ~500 RPM, 500M tokens/día.

## Sesión de Ejemplo

```
Tú: /model 4
✅ Cambiado al preajuste 4: openai/gpt-oss-120b:free

Tú: create a folder named demo and write a hello.py
⏳ Pensando...
  [Modelo: openai/gpt-oss-120b:free]
  🔧 create_folder({"path":"demo"})
  🔧 write_file({"path":"demo/hello.py","content":"print('Hello, world!')\n"})
Agente: ¡Listo! Se creó demo/hello.py con un script Hello World.

Tú: run the file
⏳ Pensando...
  [Modelo: openai/gpt-oss-120b:free]
  🔧 run_command({"command":"python demo/hello.py"})
Agente: Hello, world! — el script se ejecuta correctamente.

Tú: /model 6
✅ Cambiado al preajuste 6: [Groq] openai/gpt-oss-120b
   (ahora usando Groq — mismo modelo, 500 t/s)

Tú: list files
⏳ Pensando...
  [Modelo: openai/gpt-oss-120b]
  🔧 run_command({"command":"ls -la"})
Agente: demo/hello.py  ...
```

## Solución de Problemas

| Error | Causa Probable | Solución |
|-------|----------------|----------|
| `403 Forbidden` | Clave API faltante o inválida | Verifica que `.env` tenga la clave correcta para ese proveedor |
| `403 Forbidden` | Restricciones de internet bloqueando el host de la API | Activa VPN/proxy, configura `HTTPS_PROXY`, o usa modelos locales: `/add 6 ollama:auto` |
| `429 Rate limit exceeded` | Límite diario del nivel gratuito alcanzado | Espera o deja que el **cambio automático** cambie de proveedor automáticamente. Manual: `/model <n>` |
| `Agent stopped: stuck detected` | Misma herramienta llamada 3+ veces consecutivas | Se inyecta un mensaje de recuperación automáticamente — reformula tu solicitud |
| `All 3 attempts failed` | Modelo inalcanzable o demasiado lento | Prueba un modelo más pequeño, usa modelos locales, o cambia de proveedor con `/model <n>` |
| `tool_calls` con argumentos vacíos | El modelo no soporta llamada a herramientas | Usa un modelo diferente |
| `ENOTFOUND` / `ECONNREFUSED` | Restricciones de internet o se necesita proxy | Activa VPN/proxy, configura `HTTPS_PROXY`, o usa modelos locales |

### Verificaciones rápidas
- `/list-providers` — muestra qué claves API están configuradas
- `/safe` — alterna el estado del modo seguro
- `npm run setup` — vuelve a ejecutar el asistente de configuración
- `npm start` — reinicia después de cualquier actualización de codigo

## Estructura del Proyecto

```
coding-agent-free/
├── src/
│   ├── agent.ts                # Punto de entrada CLI
│   ├── CodingAgent.ts          # Bucle del agente, ejecución de herramientas, detección de bucles
│   ├── ConversationState.ts    # Ventana deslizante, recorte de contexto, gestión de mensajes
│   ├── commands.ts             # Formateo de preajustes, showModels
│   ├── detectLocalModel.ts     # Auto-detección de modelos en proveedores locales
│   ├── persistence.ts          # Guardar/cargar conversación y preajustes (con validación Zod)
│   ├── tokenEstimator.ts       # Estimación de tokens (longitud/4)
│   ├── types.ts                # Definiciones de tipos compartidos (ChatMessage, ToolCall, etc.)
│   ├── validation.ts           # Esquemas Zod para entrada/salida de herramientas
│   ├── server.ts               # Servidor web Express (streaming SSE)
│   ├── config/
│   │   └── models.ts           # Definiciones de proveedores, preajustes, prompt del sistema
│   ├── tools/
│   │   └── fileManager.ts      # 13 herramientas + modo seguro + restricciones del espacio de trabajo
│   └── __tests__/              # Pruebas unitarias
│       ├── ConversationState.test.ts  # 9 pruebas: trim, removeLastAssistantTurn, etc.
│       └── comprehensive.test.ts      # 30 pruebas: todos los módulos + integración
├── .github/
│   └── workflows/
│       └── ci.yml              # CI: verificación de tipos + pruebas en push/PR
├── scripts/
│   ├── check_models.js         # Lista modelos gratuitos de OpenRouter con soporte de herramientas
│   ├── cleanup.js              # Elimina procesos estancados en el puerto 3000
│   ├── comprehensive-test.js   # 35 pruebas de integración (npm test)
│   ├── setup.js                # Asistente de configuración interactivo (npm run setup)
│   ├── setup-ide.js            # Configura IDEs para usar el proxy API local
│   ├── test.js                 # Prueba de humo CLI no interactiva
│   ├── test-improvements.js
│   ├── tool-integration-test.ts
│   └── wezterm-launcher.cmd    # Helper para run-cli-rtl.bat
├── local/                      # Herramientas locales (gitignored)
│   ├── backup/src/             # Instantánea de src/ para restauración rápida
│   └── restore.ps1             # Restaura src/ desde la copia de seguridad
├── workspace/                  # Directorio de trabajo predeterminado
├── .env                        # Claves API (gitignored)
├── presets.json                # Preajustes de usuario (gitignored)
├── tsconfig.json
├── run-cli.bat                 # Lanzador CLI (Windows)
├── run-cli-rtl.bat             # Lanzador CLI con soporte RTL (WezTerm)
└── run-web.bat                 # Lanzador Web UI (Windows)
```

> 📝 Ejecuta pruebas: `npm run test:unit` (39 pruebas unitarias) — `npm test` (35 pruebas de integración)

## Variables de Entorno

| Variable | ¿Requerida? | Descripción |
|----------|-------------|-------------|
| `OPENROUTER_API_KEY` | No* | Clave API de OpenRouter — https://openrouter.ai/keys |
| `GROQ_API_KEY` | No* | Clave API de Groq — https://console.groq.com/keys |
| `GOOGLE_API_KEY` | No* | Clave de Google AI Studio — https://aistudio.google.com/apikey |
| `DEEPSEEK_API_KEY` | No* | Clave API de DeepSeek — https://platform.deepseek.com |
| `MISTRAL_API_KEY` | No* | Clave API de Mistral — https://console.mistral.ai |
| `OLLAMA_HOST` | No | URL del servidor Ollama (defecto: `http://localhost:11434/v1`) |
| `LMSTUDIO_HOST` | No | URL del servidor LM Studio (defecto: `http://localhost:1234/v1`) |
| `LLAMACPP_HOST` | No | URL del servidor Llama.cpp (defecto: `http://localhost:8080/v1`) |
| `ALLOWED_DIR` | No | Directorio para operaciones con archivos (defecto: `./workspace`) |
| `LOCAL_TIMEOUT` | No | Tiempo de espera (ms) para solicitudes a modelos locales (defecto: 300000) |
| `LOG_LEVEL` | No | Nivel de registro: `debug`, `info`, `warn`, `error` (defecto: `info`) |
| `MAX_EXCHANGES` | No | Máximo de intercambios usuario ↔ asistente en la ventana deslizante (defecto: `20`) |
| `MAX_TOOL_RESULT_LENGTH` | No | Máximo de caracteres antes de truncar los resultados de herramientas (defecto: `5000`) |

\* Se requiere al menos una clave API (no necesaria para proveedores locales).

## Proyectos Grandes

Para proyectos medianos o grandes, la ventana deslizante predeterminada (20 intercambios) puede perder contexto antiguo. Aumenta estos valores en `.env`:

```env
# Mantener hasta 50 intercambios usuario-asistente
MAX_EXCHANGES=50

# Permitir resultados de herramientas de hasta 20,000 caracteres
MAX_TOOL_RESULT_LENGTH=20000
```

También puedes reiniciar la conversación en medio de una sesión con `/reset` si el modelo se confunde con contexto desactualizado.

## Limitaciones

- **Cumplimiento del prompt del sistema**: Algunos modelos gratuitos (ej. Nvidia Nemotron 550B) pueden ignorar o seguir parcialmente las instrucciones del sistema. Cambia a un modelo diferente si notas esto.
- **Límites de tasa**: Las claves API del nivel gratuito tienen límites de tasa diarios (HTTP 429). El agente reintenta con retroceso exponencial (máximo 3 intentos), pero los límites persistentes requieren cambiar de proveedor o esperar.
- **Ventana de tokens**: Con un modelo de contexto de 128K y una ventana deslizante de 20 intercambios, las bases de codigo grandes pueden alcanzar los límites de contexto. Aumenta `MAX_EXCHANGES` y `MAX_TOOL_RESULT_LENGTH` en `.env` para proyectos más grandes.
- **Detección de bucles**: El agente se detiene después de 3 llamadas idénticas a la misma herramienta o 5 llamadas consecutivas del mismo nombre, inyecta un mensaje de sistema de recuperación y elimina los últimos resultados de herramientas. Simplemente reformula tu solicitud para continuar.
- **Shell de Windows**: Los operadores de pipeline de PowerShell (`|`, `&&`) pueden activar mensajes de permiso verbosos bajo reglas estrictas de opencode.json. Los comandos simples funcionan sin mensajes.
- **Rutas relativas vs absolutas**: Los modelos manejan las rutas de manera inconsistente — algunos usan rutas relativas, otros absolutas. El agente normaliza las rutas dentro de `ALLOWED_DIR`.

## Seguridad

- Todas las operaciones con archivos restringidas a `ALLOWED_DIR` — `sanitizePath` previene ataques de traversal
- Los comandos de shell se ejecutan dentro del directorio del espacio de trabajo
- Las claves API se almacenan en `.env` (listado en `.gitignore`, nunca se confirman)
- El modo seguro (`/safe`) restringe los comandos a una lista blanca
- Los comandos de shell peligrosos están bloqueados por una lista negra (rm -rf, dd, mkfs, wget, etc.)
- Usa los scripts de `local/` para copias de seguridad/restauración

## Contribuir

¡Las contribuciones son bienvenidas! No dudes en abrir un [issue](https://github.com/maz557/coding-agent-free/issues) o enviar un pull request. Dale una estrella al repositorio si te resulta útil — ayuda a que otros lo descubran.

## Licencia

MIT
