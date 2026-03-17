# Event Registration API

Ez a repository a felvételi feladat backend részének megoldása (Node.js + TypeScript + Express).

- tranzakciós szemlélet (race condition kezelése)
- tiszta rétegek (controller/service)
- validáció és konzisztens API hibakezelés
- célzott, értelmes logolás
- reprodukálható tesztelhetőség

## Telepítés

Ajánlott mód (reviewhoz a legegyszerűbb): Docker + `docker compose`.

Telepítéshez hivatalos leírások:

- Docker Desktop (Windows/macOS): https://www.docker.com/products/docker-desktop/
- Docker Engine + Compose plugin (Linux): https://docs.docker.com/engine/install/

Gyors ellenőrzés:

```bash
docker --version
docker compose version
```

## Futtatás

1. Konténerek indítása

```bash
docker compose up --build -d
```

2. Eventek seedelése

```bash
docker compose exec api npm run seed:events
```

3. Leállítás (tesztelés után)

```bash
docker compose down
```

Ha a `3000` port foglalt:

```powershell
$env:API_PORT="3001"; docker compose up --build -d
```

## Endpointok tesztelése

Alap URL:

- `http://localhost:3000`
- egyedi port esetén: `http://localhost:API_PORT`

Windows megjegyzés:

- PowerShellben a `curl` alias az `Invoke-WebRequest` parancsra. PS-ben ne használd a Linuxos `curl -X -H -d` formát.
- PowerShellben használd az `Invoke-RestMethod` parancsot, vagy explicit a `curl.exe` binárist.
- Windows cmd-ben a JSON body-hoz dupla idézőjel escape kell (`\"...\"`).

### 1) Health check

```bash
curl http://localhost:3000/health
```

PowerShell:

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/health"
```

Elvárt:

- `200 OK`
- válasz: `{ "status": "ok" }`

### 2) Eventek seedelése (ha még nincs adat)

```bash
docker compose exec api npm run seed:events
```

### 3) GET /api/events

```bash
curl http://localhost:3000/api/events
```

PowerShell:

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/events"
```

Elvárt:

- `200 OK`
- `data` tömb

### 4) POST /api/events/:id/register (sikeres)

PowerShell:

```powershell
$body = @{ email = "teszt.user@example.com"; name = "Teszt User" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/events/1/register" -ContentType "application/json" -Body $body
```

PowerShell `curl.exe` (ha ragaszkodsz a curl szintaxishoz):

```powershell
curl.exe -X POST "http://localhost:3000/api/events/1/register" -H "Content-Type: application/json" -d '{"email":"teszt.user@example.com","name":"Teszt User"}'
```

Bash/curl:

```bash
curl -X POST http://localhost:3000/api/events/1/register \
  -H "Content-Type: application/json" \
  -d '{"email":"teszt.user@example.com","name":"Teszt User"}'
```

Windows cmd (Command Prompt):

```bat
curl -X POST http://localhost:3000/api/events/1/register -H "Content-Type: application/json" -d "{\"email\":\"teszt.user@example.com\",\"name\":\"Teszt User\"}"
```

Elvárt:

- `201 Created`
- `data.ticketCode`

### 5) POST /api/events/:id/register (duplikált)

Ugyanazzal az emaillel küldd el újra a 4. pont kérését.

Elvárt:

- `409 Conflict`
- hibakód: `ALREADY_REGISTERED`

### 6) POST /api/events/:id/register (nem létező event)

PowerShell:

```powershell
$body = @{ email = "nobody@example.com"; name = "Nobody" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/events/999999/register" -ContentType "application/json" -Body $body
```

PowerShell `curl.exe`:

```powershell
curl.exe -X POST "http://localhost:3000/api/events/999999/register" -H "Content-Type: application/json" -d '{"email":"nobody@example.com","name":"Nobody"}'
```

Bash/curl:

```bash
curl -X POST http://localhost:3000/api/events/999999/register \
  -H "Content-Type: application/json" \
  -d '{"email":"nobody@example.com","name":"Nobody"}'
```

Windows cmd (Command Prompt):

```bat
curl -X POST http://localhost:3000/api/events/999999/register -H "Content-Type: application/json" -d "{\"email\":\"nobody@example.com\",\"name\":\"Nobody\"}"
```

Elvárt:

- `404 Not Found`
- hibakód: `EVENT_NOT_FOUND`

### 7) Race condition teszt

```bash
npm run test:race
```

Elvárt:

- 1 db `201`
- 1 db `409`
- adott eventen 1 attendee

### 8) Postman

1. Import: `docs/postman/event-reg-api.postman_collection.json`
2. `baseUrl` változó: `http://localhost:3000`

Ha valakinél `500 Internal Server Error` jön vissza:

1. Ellenőrizze, hogy futnak-e a konténerek: `docker compose ps`
2. Nézze meg az API logot: `docker compose logs api --tail 100`
3. Futtassa újra a seedet: `docker compose exec api npm run seed:events`

## Döntések és indoklás (a "miért")

Ebben a részben van pár döntés amit talán kiemelhetnék.

### 1) Adatbázis és tranzakció

A legkritikusabb pont a "last seat" helyzet volt, ezért PostgreSQL + tranzakció + `FOR UPDATE` kombináció lett a végső megoldás.

Lock nélkül a versenyhelyzet reprodukálhatóan inkonzisztens eredményt adhat.

### 2) DB-szintű szabályok, nem csak app logika

Be van téve a `@@unique([eventId, email])`, mert nem akartam, hogy a duplikáció elleni védelem csak a service kódon múljon.

Az üzletileg tiltott állapotokat érdemes DB-szinten is tiltani.

### 3) Külön controller és service

Ez nem formai döntés volt, a controller csak request/response felelősséget kapott, a service pedig az üzleti folyamatot.

Így a kód olvashatóbb és a hibakeresés is gyorsabb.

### 4) Validáció és hibakezelés

Zodot használtam kézi `if` helyett, mert gyorsabban szétcsúszik a kód, ha minden endpoint külön kézzel validál.

A hibák centralizált middleware-en mennek át, így a kliens mindig ugyanabban a formában kap hibát.

### 5) Ticket kód stratégia

`TCK-` prefix + olvasható karakterkészlet (`O/0`, `I/1` nélkül), és ütközésnél retry.

Ez csökkenti a félreolvasásból adódó hibákat.

### 6) Logolás: Egyszerűbb és részletesebb formában is kérhető

A cél az volt, hogy hibánál elég kontextus legyen, de ne legyen tele túl sok feleslegesnek tűnő információval a log.

Ezért:

- domain eseményeket külön logolok
- emailt maszkolva írok ki
- HTTP log részletesség kapcsolható a .env-ben(`LOG_HTTP_VERBOSE`)

### 7) Seedelés és reprodukálhatóság

A seed script reseteli az állapotot (`TRUNCATE ... RESTART IDENTITY`), mert review közben az a legrosszabb, amikor mindenkinél más adatból indul a teszt.

Ez a race-condition tesztelést is stabilabbá teszi.

### 8) Miért van külön race test script?

Azért írtam külön scriptet (`npm run test:race`), hogy a konkurencia-kezelés egy paranccsal, reprodukálhatóan ellenőrizhető legyen. Ez nem volt kötelező feladatban, viszont a review gyorsítása érdekében hasznos lehet.

Ha ez a script 1 db `201` + 1 db `409` eredményt ad, akkor a kritikus rész tényleg azt csinálja, amit várunk.

### 9) Miért maradt meg a `/health`?

Nem kötelező endpoint, de Dockeres ellenőrzésnél gyorsan visszajelzi, hogy az app él-e.

## Reviewer rövid ellenőrzési útvonal

Ha gyorsan szeretnéd validálni a lényeget, ez a 4 pont adja vissza a megoldás gerincét:

1. Futtasd a race tesztet (`npm run test:race`), és nézd meg, hogy 1 siker + 1 konfliktus történik.
2. Ellenőrizd, hogy ugyanarra az eseményre ugyanazzal az emaillel nem lehet duplán regisztrálni (`ALREADY_REGISTERED`).
3. Nézd meg a logot (`logs/app.log`), hogy a domain események és hibák strukturáltan mennek ki.
4. Nézd át a service logikát, ahol a tranzakció + `FOR UPDATE` miatt a last-seat versenyhelyzet determinisztikusan kezelve van.

A cél az volt, hogy a feladatban kért funkciók mellett a kritikus backend problémák (konkurencia, adatkonzisztencia, hibakezelés, observability) is stabilan legyenek lefedve.

