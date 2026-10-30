# 🌶️ Spicy Zaika - Production Restaurant POS & Kitchen Display System (KDS)

A real-time, role-based Point of Sale (POS) and Kitchen Display System (KDS) built for high-volume multi-cuisine restaurant operations. Engineered with a hardened security posture, strict Role-Based Access Control (RBAC), bcrypt PIN hashing, JWT session protection in hardware keystores, and instant WebSocket event synchronization.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technology | Primary Responsibilities |
|---|---|---|
| **Mobile App (Frontend)** | React Native (Expo SDK 52) | Android/iOS/Web terminal, on-screen numeric PIN keypad, live table floor grid, KDS queue cards, sanitation checklist, administrative analytics |
| **Secure Storage** | `expo-secure-store` | Hardware-backed keystore (Android Keystore / iOS Keychain) for JWT sessions; zero AsyncStorage leakage |
| **Backend API** | Node.js, Express | RESTful API, RBAC middleware, NoSQL injection defenses, bounded JSON parsing |
| **Database & ODM** | MongoDB, Mongoose | ACID document schemas, indexing, immutable pricing snapshots, timestamps |
| **Real-Time Engine** | Socket.io (WebSocket) | Handshake-authenticated real-time room dispatching (`order:created`, `order:status_updated`, `table:status_updated`) |
| **Security Suite** | Helmet, CORS, Express-Rate-Limit, Express-Mongo-Sanitize, Bcryptjs, Zod | Defense-in-depth security perimeter blocking brute force PIN attacks, DoS, query injection, and privilege escalation |

---

## 🛡️ Security Architecture & Threat Defense

### 1. 4-Digit PIN Security & Brute-Force Throttling
- Staff log in using a 4-digit PIN (total keyspace: 10,000 combinations `0000`-`9999`).
- **Defense**: The `/api/auth/login` endpoint is guarded by `authLimiter` allowing only **5 attempts per 15 minutes** per IP address. Iterating through all possible PINs would require over 30 days of continuous attempts, rendering brute-force attacks mathematically futile.
- **Bcrypt Hashing**: PINs are never stored in plain text. Pre-save hooks hash all PINs with 10 salt rounds (`bcryptjs`).
- **Suppression of User Enumeration**: Authentication failure yields an identical, constant-time error message: `"Authentication failed. Please verify your credentials."`.

### 2. Session Management & Hardware Keystores
- Authentication issues short-lived JWTs signed with HMAC-SHA256.
- The mobile application strictly stores tokens using `expo-secure-store` (Android Keystore / iOS Keychain). Insecure `AsyncStorage` is completely avoided.
- Defensive token verification: On every API request, the middleware confirms that the associated staff member still exists and `isActive === true`. Deactivated or terminated employees are locked out instantly.

### 3. Strict Role-Based Access Control (RBAC) Matrix

| Endpoint | Method | Admin | Waiter | Cook | Cleaner | Purpose / Business Rule |
|---|---|:---:|:---:|:---:|:---:|---|
| `/api/auth/staff-list` | `GET` | ✅ | ✅ | ✅ | ✅ | Public active staff list for PIN keypad selection |
| `/api/auth/login` | `POST` | ✅ | ✅ | ✅ | ✅ | PIN login with brute-force rate limiting |
| `/api/menu` | `GET` | ✅ | ✅ | ✅ | ✅ | View multi-cuisine dishes |
| `/api/menu` | `POST`/`PUT`/`DELETE` | ✅ | ❌ | ❌ | ❌ | Full menu catalog CRUD (No tandoor allowed) |
| `/api/menu/:id/availability` | `PATCH` | ✅ | ❌ | ✅ | ❌ | 86/Toggle item out of stock |
| `/api/tables` | `GET` | ✅ | ✅ | ✅ | ✅ | Real-time floor status inspection |
| `/api/tables/:id/clean` | `PATCH` | ✅ | ❌ | ❌ | ✅ | Transition table from `Dirty` to `Available` |
| `/api/orders` | `GET` / `/active` | ✅ | ✅ | ✅ | ✅ | Active kitchen queue and floor orders |
| `/api/orders` | `POST` | ✅ | ✅ | ❌ | ❌ | Dispatch order -> Table becomes `Occupied` |
| `/api/orders/:id/status` | `PATCH` | ✅ | ❌ | ✅ | ❌ | Cook moves ticket: `Accepted`, `Rejected`, `Ready` |
| `/api/orders/:id/items` | `PUT` | ✅ | ✅ | ❌ | ❌ | **Locked once Kitchen accepts order!** |
| `/api/orders/:id/pay` | `PATCH` | ✅ | ✅ | ❌ | ❌ | Settle bill -> Order `Completed`, Table `Dirty` |
| `/api/orders/:id/void` | `DELETE` | ✅ | ❌ | ❌ | ❌ | **Admin Master Override**: Void order at any stage |
| `/api/admin/*` | `ALL` | ✅ | ❌ | ❌ | ❌ | Revenue analytics, staff management, table floor CRUD |

### 4. Input Validation & NoSQL Injection Protection
- **Zod Strict Validation**: All route payloads (`req.body`, `req.params`, `req.query`) are parsed with Zod schemas using `.strict()`. Any unexpected keys or nested query operators (e.g. `{"$gt": ""}`) are rejected with `400 Bad Request`.
- **Mongo-Sanitize**: Strips `$` and `.` characters from incoming requests.
- **Helmet**: Sets secure HTTP response headers (`X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`).

---

## 🍲 Multi-Cuisine Menu Catalog (Excluding Tandoor)

The kitchen supports multi-cuisine offerings strictly configured without tandoor equipment:
1. **North Indian** (Dal Makhani, Paneer Butter Masala, Kashmiri Rogan Josh)
2. **Indo-Chinese** (Chilli Paneer Dry, Veg Hakka Noodles, Chicken Manchurian Gravy)
3. **South Indian** (Crispy Masala Dosa, Steamed Idli Sambar, Chettinad Pepper Chicken)
4. **Street Food** (Mumbai Pav Bhaji, Delhi Chaat Papdi, Dahi Ke Sholay)
5. **Grills** (Charcoal Grilled Paneer Skewers, Herb Grilled Chicken Breast, Grilled Fish with Lemon Butter)
6. **Biryani** (Hyderabadi Dum Chicken Biryani, Awadhi Mutton Biryani, Subz Dum Veg Biryani)
7. **Momos** (Steamed Darjeeling Veg Momos, Juicy Chicken Momos, Crispy Kurkure Momos)
8. **Beverages** (Alphonso Mango Lassi, Kullad Masala Chai, Fresh Lime Mint Soda)

---

## ⚡ Real-Time Socket.io Event Dictionary

| Event Name | Direction | Payload | Recipient Roles |
|---|---|---|---|
| `order:created` | Server -> Client | Populated Order object | Cook (KDS), Admin |
| `order:status_updated` | Server -> Client | Updated Order (Accepted, Ready, Rejected) | Waiter (POS), Cook (KDS), Admin |
| `order:completed` | Server -> Client | Settled Order object | Waiter (POS), Admin |
| `table:status_updated` | Server -> Client | `{ tableId, tableNumber, status, currentOrderId }` | Waiter, Cleaner, Admin |
| `menu:availability_changed`| Server -> Client | `{ id, name, isAvailable, updatedBy }` | All connected staff |

---

## 🚀 Quickstart Guide

### Prerequisites
- **Node.js**: v18 or higher (tested on Node v24)
- **MongoDB**: Local MongoDB instance (`mongodb://127.0.0.1:27017`) or MongoDB Atlas URI
- **Expo CLI** (for mobile client)

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Copy environment variables (modify MONGO_URI and JWT_SECRET if desired)
cp .env.example .env

# Seed the database with default staff, tables, and multi-cuisine menu
npm run seed

# Start the server with hot-reload
npm run dev
```

#### Pre-Configured Seed Staff Accounts (PIN Keypad):
| Staff Name | Role | 4-Digit PIN | Default View |
|---|---|:---:|---|
| **Rajesh Sharma** | `Admin` | `1111` | Admin Master Portal (Revenue, Staff CRUD, Menu CRUD, Tables) |
| **Amit Verma** | `Waiter` | `2222` | Waiter POS (Table floor grid, ticket drafting, billing) |
| **Chef Sanjeev** | `Cook` | `3333` | Kitchen Display System (KDS preparation queue) |
| **Ramesh Lal** | `Cleaner` | `4444` | Sanitation Dashboard (Dirty table queue with 'Mark Clean') |

---

### 2. Frontend Setup (React Native / Expo)

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Expo development terminal
npm run start
```

Press `a` for Android Emulator, `w` for Web Preview, or scan the QR code using Expo Go on a physical Android/iOS tablet or phone.
*(Note: If running on a physical mobile device, update `API_BASE_URL` in `src/api/client.js` and `SOCKET_URL` in `src/api/socket.js` to your computer's local IP address, e.g., `http://192.168.1.100:5000`)*.

