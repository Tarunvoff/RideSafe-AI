# 🚗 RideSafe-AI

Welcome to RideSafe-AI! This guide will provide you with everything you need to know to get the application (Backend & Mobile App) up and running on your local machine.

## 📋 Prerequisites
Before you start, make sure you have installed:
1. [Node.js](https://nodejs.org/) (v16 or higher)
2. [PostgreSQL](https://www.postgresql.org/) (Must be running on port `5432`)
3. [Redis](https://redis.io/) (Must be running on port `6379`)
4. [Expo Go App](https://expo.dev/client) (Installed on your physical mobile device)
5. A database named `RideSafe-AI` created inside your PostgreSQL instance.

---

## 🚀 The "Magic" 1-Click Setup (Recommended)
We've included an automated bash script that handles everything perfectly for you: finding your Wi-Fi IP, syncing environment variables, setting up the database, and booting both servers simultaneously.

**Just run this command from the root of the project:**
- **Mac/Linux:**
  ```bash
  ./start.sh
  ```
  *(Note: If permission is denied, run `chmod +x start.sh` first).*

- **Windows:**
  Double-click `start.bat` or run:
  ```cmd
  ./start.bat
  ```

Once running:
- The backend will run on port `3001` in the background.
- The Expo server will run in the foreground. Scan the QR code shown in your terminal!
- **Press `Ctrl+C` at any time to kill both the frontend and backend servers together.**

---

## 🛠️ Manual Setup (Alternative)
If you prefer to run the backend and frontend in separate terminals manually, follow these steps:

### 1. Start the Backend (NestJS Server)
The backend manages the database and handles all API requests.

1. **Open a new terminal** and navigate to the backend folder:
   ```bash
   cd backend
   ```

2. **Setup your environment variables**:
   Ensure you have a `.env` file inside the `backend/` folder. It should contain your database URL, like this:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/RideSafe-AI"
   REDIS_URL="redis://localhost:6379"
   PORT=3001
   ```

3. **Install backend dependencies**:
   ```bash
   npm install
   ```

4. **Initialize the database**:
   This command creates the tables in your PostgreSQL database dynamically:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

5. **Start the backend server**:
   ```bash
   npm run start:dev
   ```
   *✅ You should see a message saying "Aegis NestJS API running on http://0.0.0.0:3001/api". Keep this terminal open!*

### 2. Start the Mobile App (Expo)
The frontend is a React Native mobile application powered by Expo.

1. **Find your computer's local Wi-Fi IP address**.
   - **Mac:** open a new terminal and run `ipconfig getifaddr en0`
   - **Windows:** open CMD and run `ipconfig` (Look for the IPv4 Address)
   - *Example:* `192.168.1.101`

2. **Open a second terminal** and navigate to the `frontend/mobile/` folder:
   ```bash
   cd frontend/mobile
   ```

3. **Set up your environment variables**:
   Create a file exactly named `.env` in the `frontend/mobile/` folder, and paste your IP inside like this:
   ```env
   EXPO_PUBLIC_API_URL=http://<YOUR_LOCAL_IP>:3001/api
   ```
   *(Example: `EXPO_PUBLIC_API_URL=http://192.168.1.101:3001/api`)*

4. **Install app dependencies**:
   ```bash
   npm install
   ```

5. **Start the Expo server**:
   ```bash
   npx expo start -c
   ```

6. **Open the app on your phone**:
   - Make sure your mobile phone is connected to the **same Wi-Fi network** as your computer.
   - Open your camera (iOS) or the Expo Go App (Android).
   - Scan the large QR code shown in the terminal.

🎉 **That's it! Both the backend and the app should now be talking to each other perfectly!**
