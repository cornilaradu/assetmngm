# Portal Mentenanta Asset-uri

Aplicatie web full-stack pentru evidenta mentenantei asset-urilor unei companii:
fiecare asset poate avea mai multe tipuri de mentenanta, fiecare cu propria
recurenta si data de scadenta. Sistemul trimite automat email-uri de reminder
catre persoanele responsabile inainte (si dupa) expirarea termenului.

## Arhitectura

```
asset-maintenance-portal/
├── backend/     Node.js + Express + Prisma + PostgreSQL (API REST + cron de remindere)
├── frontend/    React + Vite + Tailwind CSS (interfata web)
└── docker-compose.yml   Ruleaza tot stack-ul local dintr-o comanda
```

### Model de date (pe scurt)

- **Department** — departamentele companiei
- **User** — utilizatori cu rol: `ADMIN`, `MANAGER`, `TECHNICIAN`, `VIEWER`
- **Asset** — echipamentul/activul urmarit (cod intern, categorie, locatie, departament, responsabil)
- **MaintenanceSchedule** — un tip de mentenanta configurat pe un asset (ex: "Revizie anuala",
  "Verificare ISCIR"), cu recurenta in zile, data urmatoarei scadente, cate zile inainte se
  trimite reminder-ul si cine e responsabil
- **MaintenanceHistory** — istoricul interventiilor efectiv realizate pentru fiecare schedule

### Roluri si permisiuni

| Actiune                                   | ADMIN | MANAGER | TECHNICIAN | VIEWER |
|--------------------------------------------|:---:|:---:|:---:|:---:|
| Vizualizare asset-uri si mentenante         | ✅  | ✅  | ✅  | ✅  |
| Creare/editare asset-uri                    | ✅  | ✅  | ❌  | ❌  |
| Creare/editare tipuri de mentenanta          | ✅  | ✅  | ❌  | ❌  |
| Marcare mentenanta ca efectuata              | ✅  | ✅  | ✅  | ❌  |
| Administrare utilizatori/departamente        | ✅  | ❌  | ❌  | ❌  |

### Cum functioneaza remindere-le pe email

Un job cron (`node-cron`, configurabil din `.env` prin `REMINDER_CRON_SCHEDULE`,
implicit zilnic la 07:00) parcurge toate schedule-urile active si:

1. Calculeaza cate zile au mai ramas pana la `nextDueDate`.
2. Daca zilele ramase sunt sub pragul `reminderDaysBefore` (configurabil per tip de
   mentenanta) sau termenul e deja depasit, trimite un email persoanei responsabile
   (plus, optional, o adresa CC).
3. Nu trimite acelasi reminder de mai multe ori in aceeasi zi.
4. Cand cineva marcheaza mentenanta ca "efectuata", se salveaza in istoric si se
   recalculeaza automat urmatoarea scadenta (`data efectuarii + recurrenceDays`).

Exista si un endpoint manual `POST /api/maintenance/run-reminder-check` (doar ADMIN)
pentru a declansa verificarea imediat, util la testare.

## Instalare si rulare (local, fara Docker)

### 1. Backend

```bash
cd backend
cp .env.example .env
# editeaza .env: DATABASE_URL, SMTP_*, JWT_SECRET etc.

npm install
npx prisma migrate dev --name init   # creeaza tabelele in baza de date
npm run seed                          # creeaza un admin implicit + date demo
npm run dev                           # porneste API-ul pe http://localhost:4000
```

Cont admin creat de `seed`: **admin@compania.ro** / **Admin123!** (schimba parola dupa primul login).

### 2. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev   # porneste interfata pe http://localhost:5173
```

### 3. Configurare SMTP pentru email-uri

In `backend/.env`, completeaza:

```
SMTP_HOST=smtp.office365.com   # sau smtp.gmail.com, sau serverul companiei
SMTP_PORT=587
SMTP_USER=mentenanta@compania.ro
SMTP_PASS=parola-sau-app-password
EMAIL_FROM="Portal Mentenanta <mentenanta@compania.ro>"
```

Pentru Gmail/Outlook cu 2FA activat, foloseste un "App Password" dedicat, nu parola normala de cont.

## Rulare cu Docker (recomandat pentru un mediu de test rapid)

```bash
# creeaza un fisier .env in radacina proiectului cu variabilele SMTP_*
docker compose up --build
```

Aceasta porneste automat PostgreSQL, backend-ul (cu migratii aplicate automat) si frontend-ul.

> Nota: pentru productie reala (companie intreaga), recomandam:
> - un server PostgreSQL gestionat (nu containerul simplu din docker-compose)
> - deploy backend pe un serviciu tip Render/Railway/VPS propriu, cu HTTPS
> - build de productie pentru frontend (`npm run build`) servit din spatele unui reverse proxy (nginx) sau pe Vercel/Netlify
> - un secret JWT lung si generat aleator, nu cel din exemplu

## Extindere ulterioara (idei)

- Notificari si in aplicatie (nu doar email), folosind WebSockets sau polling
- Export Excel/PDF cu planul de mentenanta
- Atasare documente (certificate, rapoarte de service) la fiecare interventie din istoric
- Calendar vizual (FullCalendar) pentru toate scadentele
- SSO / login cu contul Microsoft/Google al companiei

## Structura completa a fisierelor

```
backend/
  src/
    index.js                     Entry point Express
    config/db.js                 Client Prisma
    middleware/auth.js           JWT auth + verificare rol
    controllers/                 Logica de business per resursa
    routes/                      Definirea endpoint-urilor REST
    services/email.service.js    Trimitere email (nodemailer)
    services/reminder.service.js Cron zilnic de verificare remindere
    utils/date.js                Calcul zile ramase / status
  prisma/schema.prisma           Modelul de date
  prisma/seed.js                 Date initiale (admin + exemplu)

frontend/
  src/
    api/client.js                Axios cu JWT interceptor
    context/AuthContext.jsx      Stare autentificare
    components/                  Layout, StatusBadge, ProtectedRoute
    pages/                       Login, Dashboard, Assets, AssetDetail, Admin
```
