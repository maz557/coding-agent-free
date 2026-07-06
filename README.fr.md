# Coding Agent Free

<p align="center">
  <img src="https://img.shields.io/github/stars/maz557/coding-agent-free?style=for-the-badge&logo=github" alt="Stars"/>
  <img src="https://img.shields.io/github/license/maz557/coding-agent-free?style=for-the-badge" alt="Licence"/>
  <img src="https://img.shields.io/github/last-commit/maz557/coding-agent-free?style=for-the-badge&logo=git" alt="Dernier commit"/>
  <img src="https://img.shields.io/badge/TypeScript-6.x-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/github/actions/workflow/status/maz557/coding-agent-free/ci.yml?branch=main&style=for-the-badge&logo=githubactions" alt="CI"/>
  <br/>
  <a href="#-why-this-agent"><strong>Pourquoi cet agent ?</strong></a> •
  <a href="#quick-start"><strong>Démarrage rapide</strong></a> •
  <a href="#cli-interface"><strong>CLI</strong></a> •
  <a href="#web-interface"><strong>Web</strong></a> •
  <a href="#example-interactions"><strong>Exemples</strong></a>
</p>

<p align="center">
  🌐
  <a href="README.fr.md"><strong>Français</strong></a> •
  <a href="README.md">English</a> •
  <a href="README.fa.md">فارسی</a> •
  <a href="README.ar.md">العربية</a> •
  <a href="README.tr.md">Türkçe</a> •
  <a href="README.es.md">Español</a> •
  <a href="README.ur.md">اردو</a>
</p>

Un assistant de codage IA interactif qui fonctionne dans votre **terminal** ou **navigateur web** — alimenté par des API cloud **gratuites** (OpenRouter, Groq, Google, DeepSeek, Mistral) et des modèles **locaux** (Ollama, LM Studio, Llama.cpp). Il lit, écrit, cherche, copie, déplace et supprime des fichiers, et exécute des commandes shell — le tout via des appels d'outils en langage naturel.

> 💡 **Prêt pour le hors-ligne** : Avec un serveur local, l'agent fonctionne entièrement hors-ligne — aucune connexion internet requise, aucune donnée ne quitte votre machine.

## 🧠 Pourquoi cet agent ?

| Problème | Comment cet agent le résout |
|---------|------------------------------|
| Les assistants de codage coûtent 20 $/mois (ChatGPT+, Claude Pro) | **100 % gratuit** — utilise les niveaux gratuits d'OpenRouter, Groq, Google, DeepSeek, Mistral + modèles locaux |
| Un fournisseur tombe en panne / est limité en débit | **8 fournisseurs** — bascule automatique sur 429 + `/model <n>` manuel |
| Pas d'accès internet / région restreinte | **Modèles locaux** (Ollama, LM Studio, Llama.cpp) — entièrement hors-ligne |
| Problèmes de confidentialité avec les API cloud | Utilisez **uniquement des modèles locaux** — aucune donnée ne quitte votre machine |
| Configuration trop complexe | **`npm run setup`** — assistant interactif, aucune édition manuelle de `.env` |
| L'IA exécute des commandes dangereuses | **Mode sécurisé** (`/safe`) — commandes shell sur liste blanche uniquement |
| L'agent reste bloqué dans des boucles | **Détection intelligente** — s'arrête après 3 appels d'outils identiques |
| Fournisseur limité en débit | **Bascule automatique** — change de fournisseur automatiquement sur 429 |
| Résultats d'outils longs gaspillent des tokens | **Compression de tokens** — troncature début+fin + suppression des doublons |
| Vous voulez utiliser votre IDE avec des modèles gratuits | **API compatible OpenAI** — `npm run setup-ide` connecte Cline, Continue.dev, Cursor |

## Démarrage rapide

```bash
git clone https://github.com/maz557/coding-agent-free.git
cd coding-agent-free
npm install
```

Exécutez l'assistant de configuration interactif (recommandé) :
```bash
npm run setup
```

Ou créez `.env` manuellement (choisissez au moins un fournisseur) :
```bash
# OpenRouter (le plus simple — une clé pour 18+ modèles gratuits avec appel d'outils)
echo "OPENROUTER_API_KEY=sk-or-v1-..." >> .env

# Fournisseurs optionnels :
echo "GROQ_API_KEY=gsk_..." >> .env      # Infra-rapide
echo "GOOGLE_API_KEY=AIza..." >> .env     # Modèles Gemini
echo "DEEPSEEK_API_KEY=sk-..." >> .env    # DeepSeek
echo "MISTRAL_API_KEY=..." >> .env        # Modèles Mistral
```

**Entièrement hors-ligne (aucune clé API requise) :**
```bash
# 1. Clonez et installez (nécessite internet une fois)
git clone https://github.com/maz557/coding-agent-free.git
cd coding-agent-free
npm install

# 2. Démarrez votre serveur de modèle local (choisissez-en un) :
#    ollama run qwen3:14b           # Ollama
#    # ou lancez LM Studio / llama-server

# 3. Lancez l'agent :
npm start

# 4. Dans l'agent, ajoutez votre modèle local :
#    Vous : /add 6 ollama:auto
#    Vous : /model 6
```

## Interface CLI

```bash
npm start
```

> Sur Windows, double-cliquez sur `run-cli.bat`.
> 📝 **Langues RTL (persan, arabe, ourdou, hébreu, etc.) :** Si votre terminal affiche incorrectement le texte de droite à gauche, utilisez `run-cli-rtl.bat` à la place — il lance via [WezTerm](https://wezfurlong.org/wezterm/) avec un support BiDi approprié.

## Interface Web

```bash
npm run web
# Ouvrez http://localhost:3000 dans votre navigateur
```

> Sur Windows, double-cliquez sur `run-web.bat`.

L'interface web prend en charge les mêmes fonctionnalités que le terminal — réponses en streaming, appels d'outils, changement de modèle (les 8 fournisseurs + préréglages utilisateur), bascule du mode sécurisé, chemin d'accès autorisé et réinitialisation de la conversation. Plusieurs onglets de navigateur sont pris en charge avec des sessions indépendantes. La CLI et le Web partagent la même configuration de modèle (`src/config/models.ts`) et le même moteur d'outils (`fileManager.ts`).

Le serveur web expose également une **API compatible OpenAI** à l'adresse `http://localhost:3000/v1/chat/completions`, de sorte que tout client compatible OpenAI (Cline, Continue.dev, Cursor, etc.) peut utiliser vos fournisseurs configurés via un seul point d'accès avec support de bascule automatique.

Configurez votre IDE automatiquement :
```bash
npm run setup-ide
```

Cela configurera **Cline**, **Continue.dev** et **Cursor** pour pointer vers le proxy API local, en utilisant les clés de vos fournisseurs `.env` via le même routage.

**Exemple de session :**

```
┌──────────────────────────────────────────────────────────┐
│  💬 Coding Agent                       [🔒 Safe] [🌐 P] │
│  ──────────────────────────────────────────────────────── │
│                                                          │
│  Vous : créez un hello.py qui affiche "Hello from Web UI" │
│                                                          │
│  ⏳ Réflexion... [Modèle : openrouter/free]               │
│                                                          │
│  🛠  write_file(path="hello.py", content="...")          │
│  ✔  Fichier écrit (25 octets)                            │
│                                                          │
│  🛠  run_command(command="python hello.py")              │
│  ✔  Hello from Web UI                                    │
│                                                          │
│  Terminé ! hello.py créé et vérifié qu'il affiche :      │
│  Hello from Web UI                                       │
│  ──────────────────────────────────────────────────────── │
│  [Saisie du message...                        ] [Envoyer] │
└──────────────────────────────────────────────────────────┘
```

> Le menu déroulant des modèles vous permet de basculer entre les 8 fournisseurs et vos préréglages sauvegardés en cours de session. Les réponses en streaming apparaissent token par token en temps réel.
> Cliquez sur le bouton **`?`** dans l'en-tête pour ouvrir une fenêtre d'aide avec le guide d'utilisation, les instructions de changement de modèle et les équivalents de commandes CLI.

## Exemples d'interactions

**"Crée un script Python qui affiche les nombres de Fibonacci"**

L'agent créera le fichier, écrira le code, puis l'exécutera pour vérifier :

```
Vous : écris un fibonacci.py qui affiche les 20 premiers nombres
⏳ Réflexion...
  🔧 write_file({"path":"fibonacci.py","content":"..."})
  🔧 run_command({"command":"python fibonacci.py"})
Agent : Terminé ! fibonacci.py créé et sortie vérifiée : 0, 1, 1, 2, 3, 5...
```

**"Trouve tous les fichiers TypeScript qui appellent fetch() et remplace-les par axios"**

```
Vous : trouve tous les fichiers .ts avec des appels fetch() et remplace-les par axios
  🔧 search_content({"pattern":"fetch(","filePattern":"*.ts"})
  🔧 read_file({"path":"src/api.ts"})
  🔧 replace_in_file({"path":"src/api.ts","old_str":"fetch(","new_str":"axios."})
Agent : 3 fichiers mis à jour (api.ts, users.ts, auth.ts).
```

**"Débogue cette erreur : Cannot read property 'map' of undefined"**

L'agent lit le fichier concerné, analyse le code, suggère et applique une correction.

## Fonctionnalités

- **8 fournisseurs** — OpenRouter, Groq, Google, DeepSeek, Mistral + Ollama, LM Studio, Llama.cpp
- **5 préréglages intégrés** — commencez avec `openrouter/free` (découvre automatiquement les modèles gratuits fonctionnels)
- **Préréglages utilisateur** — sauvegardez/ajoutez/supprimez vos propres modèles avec `/save`, `/add`, `/remove`
- **Chaîne de bascule** — bascule automatique entre fournisseurs en cas de limite de débit (429), plus bascules au niveau du modèle
- **13 outils** — read, write, list (avec détails), create_folder, delete_file, delete_folder (récursif), append_file, copy_file, move_file, file_info, search_content, replace_in_file et run_command
- **Compression de tokens** — troncature début+fin des longs résultats d'outils + suppression automatique des doublons
- **Fenêtre de contexte glissante** — conserve les 20 derniers échanges par défaut, se réduit automatiquement pour éviter les erreurs de limite de tokens (configurable via `MAX_EXCHANGES` / `MAX_TOOL_RESULT_LENGTH`)
- **Détection intelligente de boucle** — s'arrête si un outil est appelé 3+ fois à l'identique ou 5+ fois consécutivement
- **Mode sécurisé** (`--safe` / `/safe`) — commandes shell sur liste blanche uniquement
- **Assistant de configuration** — `npm run setup` configure `.env` de manière interactive
- **Réessai automatique** — backoff exponentiel + délai d'attente de 120 s (300 s pour les modèles locaux)
- **Validation Zod** — vérification de type à l'exécution de chaque entrée et sortie d'outil
- **CLI et Web unifiés** — configuration de modèle, invite système, moteur d'outils, définitions de fournisseurs et préréglages utilisateur partagés entre les deux interfaces
- **opencode.json** — règles de permission complètes (100+ motifs de commandes sûrs auto-autorisés) et sortie d'outil tronquée pour des invites plus propres
- **Troncature de la sortie d'outil** — tous les résultats d'outils limités à 5000 caractères (`MAX_TOOL_RESULT_LENGTH`) pour garder le contexte propre
- **Persistance de la conversation** — sauvegarde/restauration automatique des sessions entre les redémarrages
- **Journalisation structurée** — via `pino` (stderr, n'interfère pas avec l'interface)

## Outils disponibles

| Outil | Description |
|------|-------------|
| `read_file` | Lit le contenu d'un fichier |
| `write_file` | Écrit du contenu dans un fichier (crée/remplace) |
| `list_files` | Liste le contenu d'un répertoire. Utilisez `details:true` pour la taille + les horodatages |
| `create_folder` | Crée un nouveau dossier |
| `delete_file` | Supprime un seul fichier |
| `delete_folder` | Supprime un dossier. Définissez `recursive:true` pour les dossiers non vides |
| `append_file` | Ajoute du contenu à un fichier existant |
| `copy_file` | Copie un fichier de la source vers la destination |
| `move_file` | Déplace ou renomme un fichier |
| `file_info` | Obtient des métadonnées détaillées (taille, permissions, horodatages) |
| `search_content` | Recherche un texte exact dans les fichiers. Prend en charge `filePattern` (p. ex. `*.ts`) et `maxResults` (par défaut 50). Ignore les fichiers >1 Mo |
| `replace_in_file` | Remplace la première occurrence d'un texte exact (sensible à la casse) |
| `run_command` | Exécute une commande shell dans l'espace de travail |

## Commandes

| Commande | Description |
|---------|-------------|
| `/model <n>` | Bascule vers le préréglage n |
| `/save <n>` | Sauvegarde le modèle actuel comme préréglage n |
| `/add <n> <m>` | Ajoute le modèle m comme préréglage n (`provider:model` ou simplement `model`) |
| `/remove <n>` | Supprime un préréglage utilisateur |
| `/allow <p>` | Autorise le modèle à accéder à un chemin en dehors de l'espace de travail |
| `/safe` | Bascule le mode sécurisé (commandes shell sur liste blanche uniquement) |
| `/models` | Affiche tous les préréglages |
| `/active` | Affiche le modèle actif actuel |
| `/reset` | Efface l'historique de la conversation (recommencer à zéro) |
| `/list-providers` | Affiche les fournisseurs avec des clés valides (et les fournisseurs locaux) |
| `/exit` | Quitter |

## Utilisation multi-fournisseur

Chaque préréglage est lié à un fournisseur. Basculer de préréglage avec `/model <n>` recrée le client API automatiquement :

```
Vous : /add 6 groq:openai/gpt-oss-120b
✅ Préréglage 6 ajouté : [Groq] openai/gpt-oss-120b

Vous : /model 6
✅ Bascule vers le préréglage 6 : [Groq] openai/gpt-oss-120b
   (utilise maintenant l'API Groq avec gpt-oss-120b)

Vous : /model 1
✅ Bascule vers le préréglage 1 : [OpenRouter] openrouter/free
   (retour à OpenRouter)
```

### Ajout de modèles depuis d'autres fournisseurs

```
/add <n> <provider>:<model-id>
```

Exemples :
```
/add 10 groq:llama-3.3-70b-versatile
/add 11 google:gemini-2.0-flash-exp
/add 12 deepseek:deepseek-chat
/add 13 mistral:codestral-latest
```

Si vous omettez le fournisseur (p. ex. `/add 10 llama-3.3-70b-versatile`), il utilise par défaut le fournisseur du préréglage actuel.

## Modèles locaux (Ollama, LM Studio, Llama.cpp)

L'agent prend en charge tout serveur local compatible OpenAI sans aucune configuration :

### Démarrage rapide

Assurez-vous que votre serveur local est en cours d'exécution, puis :

```
Vous : /add 6 ollama:auto
✅ Modèle auto-détecté : llama3.2:latest
✅ Préréglage 6 ajouté : [Ollama] llama3.2:latest

Vous : /model 6
✅ Bascule vers le préréglage 6 : [Ollama] llama3.2:latest
```

Ou pour LM Studio :

```
Vous : /add 7 lmstudio:auto
✅ Préréglage 7 ajouté : [LM Studio] qwen2.5-coder-7b-instruct
```

Le mot-clé `:auto` indique à l'agent de se connecter au serveur local et de détecter automatiquement le modèle chargé.

### Démarrage rapide — modèle local spécifique

```bash
# Ollama — téléchargez et servez un modèle avec appel d'outils
ollama pull llama3.2
ollama serve                  # démarre sur le port 11434

# Llama.cpp — servez un modèle GGUF directement
llama-server -m qwen2.5-coder-1.5b-instruct-q4_k_m.gguf --port 8080

# LM Studio — utilise la CLI lms intégrée
lms get llama-3.2-3b-instruct   # téléchargez un modèle
lms load llama-3.2-3b-instruct  # chargez en mémoire
lms server start --port 1234    # démarrez le serveur API
```

Ajoutez ensuite le modèle local à l'agent :
```
/add 6 ollama:auto
/add 7 lmstudio:auto
/add 8 llamacpp:auto
```

### Ports personnalisés

Définissez dans `.env` :
```bash
OLLAMA_HOST=http://localhost:11434/v1
LMSTUDIO_HOST=http://localhost:1234/v1
LLAMACPP_HOST=http://localhost:8080/v1
```

### Prérequis

- **Ollama** : [Télécharger](https://ollama.ai) → `ollama pull llama3.2` → `ollama serve`
- **LM Studio** : [Télécharger](https://lmstudio.ai) → `lms get llama-3.2-3b-instruct` → `lms server start --port 1234`
- **Llama.cpp** : [Télécharger](https://github.com/ggerganov/llama.cpp) → Compilez ou obtenez un binaire → `llama-server -m model.gguf --port 8080`
- Le modèle doit prendre en charge **l'appel d'outils** (function calling) pour bénéficier de toutes les fonctionnalités de l'agent.
- Aucune clé API requise — les fournisseurs locaux sont ignorés lors de la validation des clés au démarrage.
- Tous les fournisseurs locaux utilisent l'API compatible OpenAI, donc aucun paquet supplémentaire n'est nécessaire.

## Espace de travail et permissions

Par défaut, l'agent ne peut accéder qu'aux fichiers dans `./workspace`. Pour accéder à d'autres chemins :

### Option 1 : Modifier l'espace de travail par défaut (permanent)

Définissez `ALLOWED_DIR` dans `.env` :
```
ALLOWED_DIR=.          # racine du projet — accès à tout
ALLOWED_DIR=C:\chemin  # n'importe quel chemin absolu
```

### Option 2 : Autoriser des chemins à la demande (par session)

Quand le modèle tente d'accéder à un chemin en dehors de l'espace de travail :
```
❌ Erreur d'outil : Accès refusé : "C:\chemin" est en dehors du répertoire autorisé.
   Utilisez la commande : /allow "C:\chemin"
```

Autorisez l'accès avec :
```
Vous : /allow "C:\chemin"
✅ Autorisé : C:\chemin
```

Les permissions ne durent que pour la session en cours.

## Préréglages intégrés

| # | Modèle | Fournisseur | Vitesse | Notes |
|---|-------|----------|-------|-------|
| 1 | `openrouter/free` | OpenRouter | variable | Aiguillage automatique vers les modèles gratuits disponibles |
| 2 | Qwen 3 Next 80B | OpenRouter | moyenne | Bon usage général |
| 3 | Nemotron 3 Super 120B | OpenRouter | moyenne | Contexte 1M |
| 4 | OpenAI GPT-OSS 120B | OpenRouter | rapide | Raisonnement puissant |
| 5 | Nemotron 3 Ultra 550B | OpenRouter | lente | Plus grand modèle gratuit avec outils |

## Modèles de codage gratuits recommandés par fournisseur

### OpenRouter
Utilisez le routeur `openrouter/free`, ou épinglez des modèles spécifiques avec `/add <n> <model>:free`.

### Groq (le plus rapide — matériel LPU)
```
/add 6 groq:openai/gpt-oss-120b       # 120B, 500 t/s
/add 7 groq:llama-3.3-70b-versatile   # 70B, 280 t/s
/add 8 groq:qwen/qwen3-32b            # 32B, 400 t/s
/add 9 groq:meta-llama/llama-4-scout-17b-16e-instruct  # 750 t/s
```
Limites de débit : 30 RPM, ~1K RPD. Tous les modèles prennent en charge l'appel d'outils.

### Mistral (hébergé dans l'UE)
```
/add 10 mistral:codestral-latest       # Modèle de codage dédié
/add 11 mistral:mistral-large-latest   # Meilleure qualité
/add 12 mistral:mistral-small-latest   # Léger et rapide
/add 13 mistral:open-mistral-nemo      # Contexte 128K, poids ouverts
```
Niveau gratuit : ~1 req/s, 1 milliard de tokens/mois.

### Google AI Studio
```
/add 14 google:gemini-2.0-flash-exp    # Rapide, bon pour le codage
```
Niveau gratuit : 5-15 RPM, 100-1K RPD.

### DeepSeek
```
/add 15 deepseek:deepseek-chat         # Usage général
/add 16 deepseek:deepseek-reasoner     # Raisonnement puissant
```
Niveau gratuit : ~500 RPM, 500 millions de tokens/jour.

## Exemple de session

```
Vous : /model 4
✅ Bascule vers le préréglage 4 : openai/gpt-oss-120b:free

Vous : crée un dossier nommé demo et écris un hello.py
⏳ Réflexion...
  [Modèle : openai/gpt-oss-120b:free]
  🔧 create_folder({"path":"demo"})
  🔧 write_file({"path":"demo/hello.py","content":"print('Hello, world!')\n"})
Agent : Terminé ! demo/hello.py créé avec un script Hello World.

Vous : exécute le fichier
⏳ Réflexion...
  [Modèle : openai/gpt-oss-120b:free]
  🔧 run_command({"command":"python demo/hello.py"})
Agent : Hello, world! — le script s'exécute correctement.

Vous : /model 6
✅ Bascule vers le préréglage 6 : [Groq] openai/gpt-oss-120b
   (utilise maintenant Groq — même modèle, 500 t/s)

Vous : liste les fichiers
⏳ Réflexion...
  [Modèle : openai/gpt-oss-120b]
  🔧 run_command({"command":"ls -la"})
Agent : demo/hello.py  ...
```

## Dépannage

| Erreur | Cause probable | Correctif |
|-------|-------------|------|
| `403 Forbidden` | Clé API manquante ou invalide | Vérifiez que `.env` contient la bonne clé pour ce fournisseur |
| `403 Forbidden` | Restrictions réseau bloquant l'hôte API | Activez VPN/proxy, définissez `HTTPS_PROXY`, ou utilisez des modèles locaux : `/add 6 ollama:auto` |
| `429 Rate limit exceeded` | Limite quotidienne du niveau gratuit atteinte | Attendez ou laissez la **bascule automatique** changer de fournisseur. Manuel : `/model <n>` |
| `Agent stopped: stuck detected` | Même outil appelé 3×+ consécutivement | Un message de récupération est injecté automatiquement — reformulez votre demande |
| `All 3 attempts failed` | Modèle injoignable ou trop lent | Essayez un modèle plus petit, utilisez des modèles locaux ou changez de fournisseur avec `/model <n>` |
| `tool_calls` avec arguments vides | Le modèle ne prend pas en charge l'appel d'outils | Utilisez un modèle différent |
| `ENOTFOUND` / `ECONNREFUSED` | Restrictions réseau ou proxy nécessaire | Activez VPN/proxy, définissez `HTTPS_PROXY`, ou utilisez des modèles locaux |

### Vérifications rapides
- `/list-providers` — affiche les clés API configurées
- `/safe` — bascule l'état du mode sécurisé
- `npm run setup` — réexécutez l'assistant de configuration
- `npm start` — redémarrez après toute mise à jour du code

## Structure du projet

```
coding-agent-free/
├── src/
│   ├── agent.ts                # Point d'entrée CLI
│   ├── CodingAgent.ts          # Boucle agent, exécution d'outils, détection de blocage
│   ├── ConversationState.ts    # Fenêtre glissante, réduction de contexte, gestion des messages
│   ├── commands.ts             # Formatage des préréglages, showModels
│   ├── detectLocalModel.ts     # Détection automatique des modèles sur les fournisseurs locaux
│   ├── persistence.ts          # Sauvegarde/chargement de la conversation et des préréglages (avec validation Zod)
│   ├── tokenEstimator.ts       # Estimation de tokens (longueur/4)
│   ├── types.ts                # Définitions de types partagés (ChatMessage, ToolCall, etc.)
│   ├── validation.ts           # Schémas Zod pour entrée/sortie d'outils
│   ├── server.ts               # Serveur web Express (streaming SSE)
│   ├── config/
│   │   └── models.ts           # Définitions des fournisseurs, préréglages, invite système
│   ├── tools/
│   │   └── fileManager.ts      # 13 outils + mode sécurisé + restrictions d'espace de travail
│   └── __tests__/              # Tests unitaires
│       ├── ConversationState.test.ts  # 9 tests : trim, removeLastAssistantTurn, etc.
│       └── comprehensive.test.ts      # 30 tests : tous les modules + intégration
├── .github/
│   └── workflows/
│       └── ci.yml              # CI : vérification de types + tests sur push/PR
├── scripts/
│   ├── check_models.js         # Liste les modèles gratuits OpenRouter avec support d'outils
│   ├── cleanup.js              # Tue les processus obsolètes sur le port 3000
│   ├── comprehensive-test.js   # 35 tests d'intégration (npm test)
│   ├── setup.js                # Assistant de configuration interactif (npm run setup)
│   ├── setup-ide.js            # Configure les IDE pour utiliser le proxy API local
│   ├── test.js                 # Test CLI non interactif
│   ├── test-improvements.js
│   ├── tool-integration-test.ts
│   └── wezterm-launcher.cmd    # Assistant pour run-cli-rtl.bat
├── local/                      # Outils locaux (gitignored)
│   ├── backup/src/             # Instantané de src/ pour restauration rapide
│   └── restore.ps1             # Restaure src/ depuis la sauvegarde
├── workspace/                  # Répertoire de travail par défaut
├── .env                        # Clés API (gitignored)
├── presets.json                # Préréglages utilisateur (gitignored)
├── tsconfig.json
├── run-cli.bat                 # Lanceur CLI (Windows)
├── run-cli-rtl.bat             # Lanceur CLI avec support RTL (WezTerm)
└── run-web.bat                 # Lanceur interface Web (Windows)
```

> 📝 Exécutez les tests : `npm run test:unit` (39 tests unitaires) — `npm test` (35 tests d'intégration)

## Variables d'environnement

| Variable | Requise ? | Description |
|----------|-----------|-------------|
| `OPENROUTER_API_KEY` | Non* | Clé API OpenRouter — https://openrouter.ai/keys |
| `GROQ_API_KEY` | Non* | Clé API Groq — https://console.groq.com/keys |
| `GOOGLE_API_KEY` | Non* | Clé Google AI Studio — https://aistudio.google.com/apikey |
| `DEEPSEEK_API_KEY` | Non* | Clé API DeepSeek — https://platform.deepseek.com |
| `MISTRAL_API_KEY` | Non* | Clé API Mistral — https://console.mistral.ai |
| `OLLAMA_HOST` | Non | URL du serveur Ollama (par défaut : `http://localhost:11434/v1`) |
| `LMSTUDIO_HOST` | Non | URL du serveur LM Studio (par défaut : `http://localhost:1234/v1`) |
| `LLAMACPP_HOST` | Non | URL du serveur Llama.cpp (par défaut : `http://localhost:8080/v1`) |
| `ALLOWED_DIR` | Non | Répertoire pour les opérations sur fichiers (par défaut : `./workspace`) |
| `LOCAL_TIMEOUT` | Non | Délai d'attente (ms) pour les requêtes aux modèles locaux (par défaut : 300000) |
| `LOG_LEVEL` | Non | Niveau de journalisation : `debug`, `info`, `warn`, `error` (par défaut : `info`) |
| `MAX_EXCHANGES` | Non | Nombre max d'échanges utilisateur ↔ assistant conservés dans la fenêtre glissante (par défaut : `20`) |
| `MAX_TOOL_RESULT_LENGTH` | Non | Nombre max de caractères avant troncature des résultats d'outils (par défaut : `5000`) |

\* Au moins une clé API est requise (non nécessaire pour les fournisseurs locaux).

## Grands projets

Pour les projets de taille moyenne à grande, la fenêtre glissante par défaut (20 échanges) peut perdre du contexte plus ancien. Augmentez ces valeurs dans `.env` :

```env
# Conserve jusqu'à 50 échanges utilisateur-assistant
MAX_EXCHANGES=50

# Autorise les résultats d'outils jusqu'à 20 000 caractères
MAX_TOOL_RESULT_LENGTH=20000
```

Vous pouvez aussi réinitialiser la conversation en cours de session avec `/reset` si le modèle est perturbé par un contexte obsolète.

## Limitations

- **Respect de l'invite système** : Certains modèles gratuits (p. ex. Nvidia Nemotron 550B) peuvent ignorer ou suivre partiellement les instructions système. Basculez vers un autre modèle si vous remarquez cela.
- **Limites de débit** : Les clés API du niveau gratuit ont des limites de débit quotidiennes (HTTP 429). L'agent réessaie avec un backoff exponentiel (max 3 tentatives), mais des limites persistantes nécessitent de changer de fournisseur ou d'attendre.
- **Fenêtre de tokens** : Avec un modèle à contexte 128K et une fenêtre glissante de 20 échanges, les grandes bases de code peuvent atteindre les limites de contexte. Augmentez `MAX_EXCHANGES` et `MAX_TOOL_RESULT_LENGTH` dans `.env` pour les grands projets.
- **Détection de blocage** : L'agent s'arrête après 3 appels d'outils identiques ou 5 appels consécutifs du même nom, injecte un message système de récupération et supprime les derniers résultats d'outils. Reformulez simplement votre demande pour continuer.
- **Shell Windows** : Les opérateurs de pipeline PowerShell (`|`, `&&`) peuvent déclencher des invites de permission verbeuses sous des règles opencode.json strictes. Les commandes simples fonctionnent sans invites.
- **Chemins relatifs vs absolus** : Les modèles gèrent les chemins de manière incohérente — certains utilisent des chemins relatifs, d'autres des chemins absolus. L'agent normalise les chemins dans `ALLOWED_DIR`.

## Sécurité

- Toutes les opérations sur fichiers sont restreintes à `ALLOWED_DIR` — `sanitizePath` empêche les attaques de traversée
- Les commandes shell s'exécutent dans le répertoire de l'espace de travail
- Les clés API sont stockées dans `.env` (listé dans `.gitignore`, jamais commitées)
- Le mode sécurisé (`/safe`) restreint les commandes à une liste blanche
- Les commandes shell dangereuses sont bloquées par une liste noire (rm -rf, dd, mkfs, wget, etc.)
- Utilisez les scripts `local/` pour la sauvegarde/restauration

## Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une [issue](https://github.com/maz557/coding-agent-free/issues) ou à soumettre une pull request. Mettez une étoile au dépôt si vous le trouvez utile — cela aide d'autres personnes à le découvrir.

## Licence

MIT
