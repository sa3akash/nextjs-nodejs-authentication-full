To implement authentication with Passport.js (local, Google, and GitHub strategies) in a Node.js and React TypeScript application while enabling multi-device authentication and saving session details such as IP address, user-agent, and location in MongoDB, follow these steps:

---

### **1. Backend (Node.js)**

#### **Install required packages:**
```bash
npm install passport passport-local passport-google-oauth20 passport-github express-session connect-mongo mongoose useragent geoip-lite
```

#### **Configure Passport strategies:**
Create a file, e.g., `passportConfig.ts`, to configure the strategies.

```ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github";
import UserModel from "./models/User"; // Import your User schema

// Local Strategy
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await UserModel.findOne({ username });
      if (!user || !(await user.comparePassword(password))) {
        return done(null, false, { message: "Invalid credentials" });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

// Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await UserModel.findOne({ googleId: profile.id });
        if (!user) {
          user = await UserModel.create({
            googleId: profile.id,
            username: profile.displayName,
            email: profile.emails?.[0]?.value,
          });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// GitHub Strategy
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      callbackURL: "/auth/github/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await UserModel.findOne({ githubId: profile.id });
        if (!user) {
          user = await UserModel.create({
            githubId: profile.id,
            username: profile.username,
            email: profile.emails?.[0]?.value,
          });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await UserModel.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
```

---

#### **Session setup:**
Configure session handling with `express-session` and `connect-mongo`.

```ts
import session from "express-session";
import MongoStore from "connect-mongo";

app.use(
  session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);
```

---

#### **Track IP, User-Agent, and Location:**
Middleware to track session details and save them to MongoDB.

```ts
import useragent from "useragent";
import geoip from "geoip-lite";

app.use(async (req, res, next) => {
  if (req.isAuthenticated()) {
    const sessionDetails = {
      ip: req.ip || req.connection.remoteAddress,
      userAgent: useragent.parse(req.headers["user-agent"] || ""),
      location: geoip.lookup(req.ip || ""),
    };

    await UserModel.updateOne(
      { _id: req.user._id },
      { $addToSet: { sessions: sessionDetails } } // Prevent duplicates
    );
  }
  next();
});
```

**User Schema:**
```ts
import mongoose, { Schema, Document } from "mongoose";

interface SessionDetail {
  ip: string;
  userAgent: any;
  location: any;
}

interface User extends Document {
  username: string;
  email: string;
  googleId?: string;
  githubId?: string;
  sessions: SessionDetail[];
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema = new Schema<User>({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  googleId: String,
  githubId: String,
  sessions: [
    {
      ip: String,
      userAgent: Object,
      location: Object,
    },
  ],
});

UserSchema.methods.comparePassword = async function (password: string) {
  // Add your bcrypt comparison logic here
};

export default mongoose.model<User>("User", UserSchema);
```

---

### **2. Frontend (React with TypeScript)**

#### **Setup Authentication APIs:**
Use `axios` or `fetch` to call authentication routes (e.g., `/auth/google`, `/auth/github`, `/auth/login`).

#### **Save Sessions Locally:**
Maintain a session state for multi-device authentication:
- Store session cookies in `httpOnly` mode.
- Fetch the current session status on page load using an API like `/auth/session`.

#### **Logout Flow:**
Allow users to log out from a specific session or all devices by:
- Clearing the session data for that device in MongoDB.
- Destroying the session server-side.

```ts
const logoutFromDevice = async (sessionId: string) => {
  await axios.post("/auth/logout", { sessionId });
};

const logoutFromAllDevices = async () => {
  await axios.post("/auth/logout/all");
};
```

---

### **3. Multi-Device Authentication**

Each session for a user will have unique session details stored in MongoDB. When a user logs in from a new device:
1. A new session is created.
2. Session details (IP, user-agent, location) are saved in MongoDB.

Allow the user to:
- View all active sessions.
- Logout from specific sessions or all devices.

---

This setup ensures multi-device authentication, session tracking, and enhanced user session management. Would you like more guidance on a specific part?


---



To implement a system where a `sessionId` is stored in both the session and the database, and on user logout, all sessions are cleared, and the devices are marked as offline in the database, follow these steps:

---

### **1. Backend (Node.js)**

#### **Update Session Middleware to Include `sessionId`:**
When a user logs in, generate a unique `sessionId` and store it in both the session store and the user's database entry.

```ts
import { v4 as uuidv4 } from "uuid";

app.post("/auth/login", (req, res, next) => {
  passport.authenticate("local", async (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    req.logIn(user, async (err) => {
      if (err) return next(err);

      const sessionId = uuidv4();
      req.session.sessionId = sessionId; // Store in session

      // Store session in database
      const sessionDetails = {
        sessionId,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers["user-agent"] || "",
        location: geoip.lookup(req.ip || ""),
        isOnline: true,
      };

      await UserModel.updateOne(
        { _id: user._id },
        { $push: { sessions: sessionDetails } }
      );

      res.json({ message: "Login successful" });
    });
  })(req, res, next);
});
```

---

#### **Modify User Schema to Include Session ID and Online Status:**

Update the user schema to store `sessionId` and online status.

```ts
const UserSchema = new Schema<User>({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  googleId: String,
  githubId: String,
  sessions: [
    {
      sessionId: { type: String, required: true },
      ip: String,
      userAgent: String,
      location: Object,
      isOnline: { type: Boolean, default: true },
    },
  ],
});
```

---

#### **Logout from Current Session:**

When the user logs out from the current session, remove the session from the database and mark the device offline.

```ts
app.post("/auth/logout", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const { sessionId } = req.session;

  if (sessionId) {
    // Remove the session from the database
    await UserModel.updateOne(
      { _id: req.user._id },
      { $pull: { sessions: { sessionId } } }
    );
  }

  // Destroy the session
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Error logging out" });
    }
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out successfully" });
  });
});
```

---

#### **Logout from All Sessions:**

When the user logs out from all devices, clear all sessions in both the session store and the database.

```ts
app.post("/auth/logout/all", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  // Clear all sessions in the database
  await UserModel.updateOne(
    { _id: req.user._id },
    { $set: { "sessions.$[].isOnline": false }, $unset: { sessions: "" } }
  );

  // Destroy all sessions
  req.sessionStore.clear((err) => {
    if (err) {
      return res.status(500).json({ message: "Error logging out from all devices" });
    }
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out from all devices" });
  });
});
```

---

### **2. Frontend (React with TypeScript)**

#### **API Calls for Logout:**

Use `axios` or `fetch` to call the logout endpoints for both single-session and multi-session logout.

```ts
import axios from "axios";

const logout = async () => {
  try {
    await axios.post("/auth/logout");
    alert("Logged out successfully");
  } catch (error) {
    console.error("Error logging out", error);
  }
};

const logoutFromAllDevices = async () => {
  try {
    await axios.post("/auth/logout/all");
    alert("Logged out from all devices successfully");
  } catch (error) {
    console.error("Error logging out from all devices", error);
  }
};
```

---

#### **Show Active Sessions in User Profile:**

Fetch the user's active sessions and display them in a profile or settings page.

```ts
const fetchActiveSessions = async () => {
  const { data } = await axios.get("/auth/sessions");
  return data.sessions;
};

useEffect(() => {
  fetchActiveSessions().then((sessions) => {
    console.log("Active sessions:", sessions);
  });
}, []);
```

---

### **3. Optional Enhancements**

- **Session Expiry:** Set a TTL for sessions in the session store or MongoDB.
- **Revoke Specific Sessions:** Add an endpoint to allow the user to logout from a specific session by passing its `sessionId`.
- **Notify on New Device Login:** Send an email or push notification when a new session is created from a different device.

This setup ensures that:
- Each session is uniquely tracked with a `sessionId`.
- Users can log out from all devices or a single device.
- Device status (`isOnline`) is accurately managed.


---


To implement role-based access control (RBAC) for roles like `admin`, `moderator`, and `default user`, follow these steps:

---

### **1. Update the User Schema**

Add a `role` field to the user schema to store the user's role. You can also define constants for roles to avoid hardcoding them.

```ts
const ROLES = {
  ADMIN: "admin",
  MODERATOR: "moderator",
  USER: "user",
};

const UserSchema = new Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: Object.values(ROLES), default: ROLES.USER },
  sessions: [
    {
      sessionId: { type: String, required: true },
      ip: String,
      userAgent: String,
      location: Object,
      isOnline: { type: Boolean, default: true },
    },
  ],
});
```

---

### **2. Middleware for Role-Based Access**

Create a middleware function to check if a user has the required role for accessing a route.

```ts
export const requireRole = (role: string) => {
  return (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (req.user.role !== role) {
      return res.status(403).json({ message: "Access denied" });
    }

    next();
  };
};
```

---

### **3. Example Routes with Role-Based Access**

#### **Admin-Only Route**
Only users with the `admin` role can access this route.

```ts
app.get("/admin/dashboard", requireRole(ROLES.ADMIN), (req, res) => {
  res.json({ message: "Welcome to the admin dashboard" });
});
```

#### **Moderator-Only Route**
Only moderators can access this route.

```ts
app.get("/moderator/tools", requireRole(ROLES.MODERATOR), (req, res) => {
  res.json({ message: "Welcome to the moderator tools" });
});
```

#### **Default User Route**
Accessible by all authenticated users.

```ts
app.get("/user/profile", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  res.json({ message: "Welcome to your profile" });
});
```

---

### **4. Support Multiple Roles per Route**

If a route can be accessed by multiple roles (e.g., both `admin` and `moderator`), modify the middleware to accept an array of roles.

```ts
export const requireRoles = (roles: string[]) => {
  return (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    next();
  };
};
```

#### Example:

```ts
app.get(
  "/manage",
  requireRoles([ROLES.ADMIN, ROLES.MODERATOR]),
  (req, res) => {
    res.json({ message: "Welcome to the management area" });
  }
);
```

---

### **5. Assign Roles to Users**

Create an API endpoint to allow `admin` users to assign roles to other users.

```ts
app.post("/admin/assign-role", requireRole(ROLES.ADMIN), async (req, res) => {
  const { userId, role } = req.body;

  if (!Object.values(ROLES).includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  const user = await UserModel.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  user.role = role;
  await user.save();

  res.json({ message: "Role assigned successfully" });
});
```

---

### **6. Frontend Adjustments**

#### **Control UI Based on Roles**

Use the user's role to conditionally render parts of the UI.

```tsx
import React, { useEffect, useState } from "react";
import axios from "axios";

const Dashboard = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await axios.get("/auth/me");
      setUser(data);
    };

    fetchUser();
  }, []);

  if (!user) return <div>Loading...</div>;

  return (
    <div>
      <h1>Welcome, {user.username}</h1>
      {user.role === "admin" && <button>Admin Panel</button>}
      {user.role === "moderator" && <button>Moderator Tools</button>}
    </div>
  );
};

export default Dashboard;
```

---

### **7. Protect API Endpoints Based on Role**

Ensure all sensitive API endpoints are protected using the role-checking middleware.

- **Admin-Only:** User management, assigning roles, sensitive data.
- **Moderator-Only:** Content moderation, limited access to sensitive data.
- **Default User:** General actions like profile updates or viewing personal data.

---

### **8. Role-Based Access in Sessions**

Store the user's role in the session during login to avoid repeated DB lookups.

```ts
app.post("/auth/login", (req, res, next) => {
  passport.authenticate("local", async (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    req.logIn(user, async (err) => {
      if (err) return next(err);

      req.session.role = user.role; // Store role in session

      res.json({ message: "Login successful", role: user.role });
    });
  })(req, res, next);
});
```

This ensures efficient role management and clear access controls across the app.


---


To properly handle session management with separate session documents, you can design the system in a way where the **session documents** are stored in MongoDB with a unique ID (`sessionId`) and a link to the user document. This will decouple session management from the user document and ensure flexibility, especially when handling multiple device logins and role-based access.

Here’s how you can address the problem and improve the session structure:

---

### **1. Separate Session Document**

Create a `Session` schema as a separate collection. This will allow you to manage user sessions independently of the `User` schema.

#### **Session Schema**
```ts
import mongoose, { Schema, Document } from "mongoose";

interface SessionDocument extends Document {
  userId: mongoose.Types.ObjectId; // Reference to the User document
  sessionId: string; // Unique session identifier (not tied to the default session store ID)
  actualSessionId: string; // Actual session ID from the session middleware
  ip: string;
  userAgent: string;
  location: {
    city: string;
    country: string;
  };
  isOnline: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<SessionDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sessionId: { type: String, required: true, unique: true },
    actualSessionId: { type: String, required: true }, // Generated by session middleware
    ip: { type: String },
    userAgent: { type: String },
    location: {
      city: { type: String },
      country: { type: String },
    },
    isOnline: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const SessionModel = mongoose.model<SessionDocument>("Session", SessionSchema);

export default SessionModel;
```

---

### **2. Create a Session During Login**

When a user logs in, create a session document and store both the `sessionId` (your custom ID) and the `actualSessionId` (generated by the session middleware).

#### **Login Route**
```ts
import { v4 as uuidv4 } from "uuid"; // For generating unique session IDs

app.post("/auth/login", (req, res, next) => {
  passport.authenticate("local", async (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    req.logIn(user, async (err) => {
      if (err) return next(err);

      // Generate a custom session ID
      const sessionId = uuidv4();

      // Get user details from the request
      const { ip, userAgent } = req;
      const location = await getLocationFromIP(ip); // Use a geo-IP service for location

      // Create a session document
      await SessionModel.create({
        userId: user._id,
        sessionId, // Custom session ID
        actualSessionId: req.sessionID, // Actual session ID from middleware
        ip: ip || "Unknown",
        userAgent: userAgent || "Unknown",
        location: location || { city: "Unknown", country: "Unknown" },
        isOnline: true,
      });

      res.json({ message: "Login successful", sessionId });
    });
  })(req, res, next);
});
```

---

### **3. Retrieve Sessions for a User**

You can fetch all active sessions for a user to display which devices are logged in.

#### **Get Active Sessions**
```ts
app.get("/auth/sessions", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const sessions = await SessionModel.find({ userId: req.user._id, isOnline: true });

  res.json({ sessions });
});
```

---

### **4. Logout and Clear Session**

When a user logs out, mark the session as offline in the `Session` collection and clear the actual session from the server.

#### **Logout Route**
```ts
app.post("/auth/logout", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  // Mark the session as offline
  await SessionModel.updateOne(
    { actualSessionId: req.sessionID },
    { isOnline: false }
  );

  // Destroy the session
  req.logout(() => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Error logging out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });
});
```

---

### **5. Logout All Sessions for a User**

To log out from all devices, mark all sessions as offline for the user and destroy the current session.

#### **Logout All Devices**
```ts
app.post("/auth/logout-all", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  // Mark all sessions for the user as offline
  await SessionModel.updateMany({ userId: req.user._id }, { isOnline: false });

  // Destroy the current session
  req.logout(() => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Error logging out" });
      }
      res.json({ message: "Logged out from all devices" });
    });
  });
});
```

---

### **6. Frontend Adjustments**

#### Display Active Sessions
Fetch the active sessions from the `/auth/sessions` endpoint and display them in a "Devices" section on the user dashboard.

#### Logout Specific Device
Add functionality to allow users to log out specific devices by sending the `sessionId` of the session they want to terminate.

```ts
app.post("/auth/logout-device", async (req, res) => {
  const { sessionId } = req.body;

  // Ensure the session belongs to the logged-in user
  const session = await SessionModel.findOne({
    sessionId,
    userId: req.user._id,
  });

  if (!session) {
    return res.status(404).json({ message: "Session not found" });
  }

  // Mark the session as offline
  session.isOnline = false;
  await session.save();

  res.json({ message: "Device logged out successfully" });
});
```

---

### **7. Verify Role and Session in Middleware**

Update role-based access middleware to verify the session and user role.

```ts
export const requireRoleAndActiveSession = (role: string) => {
  return async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Check if the session is active
    const session = await SessionModel.findOne({
      actualSessionId: req.sessionID,
      isOnline: true,
    });

    if (!session) {
      return res.status(403).json({ message: "Session expired or logged out" });
    }

    // Check user role
    if (req.user.role !== role) {
      return res.status(403).json({ message: "Access denied" });
    }

    next();
  };
};
```

---

This setup ensures:
1. **Separation of Sessions**: Session data is stored in its own collection for flexibility and scalability.
2. **Custom Session IDs**: Allows easier tracking of user sessions.
3. **Multi-Device Authentication**: Each session is managed independently, supporting multiple devices.
4. **Logout Flexibility**: Users can log out from specific devices or all devices at once.
5. **Enhanced Security**: Active session checks and role-based access improve the overall security of the application.



---


Yes, using **Bull** to handle heavy tasks like fetching geo-location data and sending emails asynchronously is an excellent approach. It allows you to offload time-consuming tasks to a background queue, ensuring your authentication process remains fast and responsive for users.

Here's how you can implement it:

---

### **Setup for Bull Queue**

1. **Install Dependencies**
   ```bash
   npm install bull ioredis
   ```

2. **Create a Bull Queue for Session and Email Tasks**

Create two queues:
- One for creating session documents (`sessionQueue`).
- One for sending emails (`emailQueue`).

#### **Queue Setup**
```ts
import Bull from "bull";

// Redis connection configuration
const redisConfig = {
  host: "127.0.0.1",
  port: 6379,
};

// Create queues
export const sessionQueue = new Bull("sessionQueue", { redis: redisConfig });
export const emailQueue = new Bull("emailQueue", { redis: redisConfig });
```

---

### **1. Add Session Creation to Queue**

When the user logs in, add a task to the `sessionQueue` to handle creating the session document asynchronously.

#### **Login Route**
```ts
import { sessionQueue } from "./queues/sessionQueue";

app.post("/auth/login", (req, res, next) => {
  passport.authenticate("local", async (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    req.logIn(user, async (err) => {
      if (err) return next(err);

      // Add session creation to the queue
      sessionQueue.add({
        userId: user._id,
        actualSessionId: req.sessionID,
        ip: req.ip || "Unknown",
        userAgent: req.headers["user-agent"] || "Unknown",
      });

      res.json({ message: "Login successful" });
    });
  })(req, res, next);
});
```

---

#### **Process the Session Creation Queue**

Use a worker to process session creation tasks. This will fetch geo-location data and save the session document in the database.

```ts
import { sessionQueue } from "./queues/sessionQueue";
import SessionModel from "./models/SessionModel";
import { getGeoLocationFromIP } from "./utils/geoLocation"; // Custom utility for geo-location

sessionQueue.process(async (job) => {
  const { userId, actualSessionId, ip, userAgent } = job.data;

  // Fetch geo-location data (heavy task)
  const location = await getGeoLocationFromIP(ip);

  // Save session document in the database
  await SessionModel.create({
    userId,
    sessionId: `${actualSessionId}-${Date.now()}`, // Custom session ID
    actualSessionId,
    ip,
    userAgent,
    location: location || { city: "Unknown", country: "Unknown" },
    isOnline: true,
  });

  console.log(`Session created for user ${userId}`);
});
```

---

### **2. Add Email Sending to Queue**

If you send a welcome email or login notification to users, you can add that to the `emailQueue`.

#### **Add Email Task to Queue**
```ts
import { emailQueue } from "./queues/emailQueue";

app.post("/auth/login", (req, res, next) => {
  passport.authenticate("local", async (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    req.logIn(user, async (err) => {
      if (err) return next(err);

      // Add session creation to the queue
      sessionQueue.add({
        userId: user._id,
        actualSessionId: req.sessionID,
        ip: req.ip || "Unknown",
        userAgent: req.headers["user-agent"] || "Unknown",
      });

      // Add email sending task to the queue
      emailQueue.add({
        to: user.email,
        subject: "Login Notification",
        message: `You have logged in from IP: ${req.ip}`,
      });

      res.json({ message: "Login successful" });
    });
  })(req, res, next);
});
```

---

#### **Process the Email Sending Queue**

Use a worker to handle email tasks.

```ts
import { emailQueue } from "./queues/emailQueue";
import nodemailer from "nodemailer";

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "your-email@gmail.com",
    pass: "your-email-password",
  },
});

emailQueue.process(async (job) => {
  const { to, subject, message } = job.data;

  try {
    // Send the email
    await transporter.sendMail({
      from: "your-email@gmail.com",
      to,
      subject,
      text: message,
    });

    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error(`Failed to send email to ${to}: ${error.message}`);
  }
});
```

---

### **3. Monitoring Queues (Optional)**

Install `bull-board` to monitor and manage your queues.

#### **Setup Bull Dashboard**
```ts
import { ExpressAdapter } from "@bull-board/express";
import { createBullBoard } from "@bull-board/api";
import { emailQueue, sessionQueue } from "./queues";

const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [new BullAdapter(emailQueue), new BullAdapter(sessionQueue)],
  serverAdapter,
});

serverAdapter.setBasePath("/admin/queues");
app.use("/admin/queues", serverAdapter.getRouter());
```

---

### **4. Benefits of This Approach**

1. **Asynchronous Processing**: Heavy tasks like geo-location fetching and email sending are moved out of the main request-response cycle.
2. **Improved Performance**: The login process remains fast, while tasks are handled in the background.
3. **Scalability**: With Redis and Bull, you can scale your task processing across multiple workers.
4. **Flexibility**: Each queue handles a specific type of task, making the system modular and easier to maintain.

---

Let me know if you need help with Redis setup or further integration!



---



To resolve the issue of having two separate session documents (one stored via `connect-mongo` in the `sessions` collection and the other manually created with `SessionModel`), you can **extend the `connect-mongo` session storage logic** to include the additional fields like `userId`, `ip`, `userAgent`, and `location`. This way, you store all session-related data in a **single document** in the `sessions` collection.

Here's how you can achieve this:

---

### **1. Extend Session Middleware to Save Custom Data**
When the session is saved in `MongoStore`, you can hook into the session save/update process and add custom fields like `userId`, `ip`, `userAgent`, and `location`.

#### **Session Configuration**
```ts
import session from "express-session";
import MongoStore from "connect-mongo";
import { getGeoLocationFromIP } from "./utils/geoLocation";

app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
      stringify: false, // Ensure the session object is saved as JSON
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  })
);
```

---

### **2. Add Middleware to Enrich Session Data**
When a user logs in, you can enrich the session data with additional fields.

#### **Enrich Session Data on Login**
```ts
app.post("/auth/login", (req, res, next) => {
  passport.authenticate("local", async (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    req.logIn(user, async (err) => {
      if (err) return next(err);

      // Add custom data to the session
      req.session.userId = user._id;
      req.session.userAgent = req.headers["user-agent"] || "Unknown";
      req.session.ip = req.ip || "Unknown";

      // Fetch geo-location data (async task)
      const location = await getGeoLocationFromIP(req.ip);
      req.session.location = location || { city: "Unknown", country: "Unknown" };

      // Save session
      req.session.save((err) => {
        if (err) return next(err);
        res.json({ message: "Login successful" });
      });
    });
  })(req, res, next);
});
```

This way, the `sessions` collection will automatically include the custom fields (`userId`, `userAgent`, `ip`, and `location`) in the session document.

---

### **3. Verify Saved Session Document**

The document in the `sessions` collection will look like this:

```json
{
  "_id": "SESSION_ID",
  "session": {
    "cookie": {
      "path": "/",
      "httpOnly": true,
      "secure": false,
      "maxAge": 86400000
    },
    "userId": "USER_ID",
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
    "ip": "203.0.113.42",
    "location": {
      "city": "New York",
      "country": "USA"
    }
  },
  "expires": "2024-12-31T23:59:59.000Z"
}
```

---

### **4. Update Session on Logout**

When the user logs out, you can update the session data (`isOnline`) or destroy the session.

#### **Logout Route**
```ts
app.post("/auth/logout", (req, res) => {
  const sessionId = req.sessionID;

  req.session.destroy(async (err) => {
    if (err) return res.status(500).json({ message: "Logout failed" });

    // Optional: Mark the session as offline in the database
    const sessionCollection = req.app.locals.db.collection("sessions");
    await sessionCollection.updateOne(
      { _id: sessionId },
      { $set: { "session.isOnline": false } }
    );

    res.json({ message: "Logout successful" });
  });
});
```

---

### **5. Benefits of This Approach**

1. **Single Source of Truth**: All session-related data is stored in one document in the `sessions` collection.
2. **Extensible**: You can add more fields to the session document without creating a separate `SessionModel`.
3. **No Redundant Data**: Avoids duplication of session data across multiple collections.
4. **Performance**: Reduces database reads and writes by consolidating session-related tasks.

---

Let me know if you need help with integrating this approach further!


---


Yes, it is possible to manually create a model for managing the session data, while still using `connect-mongo` for session handling. You can create a custom Mongoose model for the `sessions` collection and directly manage or query session data stored by `connect-mongo`.

Here’s how you can set up a manual Mongoose model to manage the session data:

---

### **1. Define a Mongoose Model for the `sessions` Collection**

Since `connect-mongo` stores session data in the `sessions` collection, you can create a corresponding Mongoose model to interact with that collection.

```ts
import mongoose, { Schema, Document } from "mongoose";

interface SessionDocument extends Document {
  session: {
    cookie: {
      path: string;
      httpOnly: boolean;
      secure: boolean;
      maxAge: number;
    };
    userId?: string;
    userAgent?: string;
    ip?: string;
    location?: {
      city: string;
      country: string;
    };
    isOnline?: boolean;
  };
  expires: Date;
}

const sessionSchema = new Schema<SessionDocument>(
  {
    _id: { type: String }, // MongoDB session ID
    session: {
      cookie: {
        path: { type: String, required: true },
        httpOnly: { type: Boolean, required: true },
        secure: { type: Boolean, required: true },
        maxAge: { type: Number, required: true },
      },
      userId: { type: String },
      userAgent: { type: String },
      ip: { type: String },
      location: {
        city: { type: String, default: "Unknown" },
        country: { type: String, default: "Unknown" },
      },
      isOnline: { type: Boolean, default: true },
    },
    expires: { type: Date, required: true },
  },
  { collection: "sessions" } // Match the collection name used by `connect-mongo`
);

const SessionModel = mongoose.model<SessionDocument>("Session", sessionSchema);

export default SessionModel;
```

---

### **2. Update Session Middleware to Sync Data**

You can enrich the session data stored by `connect-mongo` by manually creating or updating a document using the `SessionModel`.

#### **Custom Login Middleware**
Here’s how you can enrich the session data when a user logs in:

```ts
app.post("/auth/login", (req, res, next) => {
  passport.authenticate("local", async (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    req.logIn(user, async (err) => {
      if (err) return next(err);

      // Add custom fields to the session
      const sessionId = req.sessionID;
      const userAgent = req.headers["user-agent"] || "Unknown";
      const ip = req.ip || "Unknown";
      const location = await getGeoLocationFromIP(ip);

      // Update or create session document manually
      await SessionModel.findByIdAndUpdate(
        sessionId,
        {
          _id: sessionId,
          session: {
            cookie: req.session.cookie,
            userId: user._id,
            userAgent,
            ip,
            location: location || { city: "Unknown", country: "Unknown" },
            isOnline: true,
          },
          expires: new Date(Date.now() + req.session.cookie.maxAge),
        },
        { upsert: true, new: true }
      );

      res.json({ message: "Login successful" });
    });
  })(req, res, next);
});
```

---

### **3. Handle Logout with SessionModel**

When the user logs out, you can manually update the session document to set `isOnline` to `false` or remove the document altogether.

#### **Logout Middleware**
```ts
app.post("/auth/logout", async (req, res) => {
  const sessionId = req.sessionID;

  req.session.destroy(async (err) => {
    if (err) return res.status(500).json({ message: "Logout failed" });

    // Update the session document to mark the user as offline
    await SessionModel.findByIdAndUpdate(sessionId, {
      $set: { "session.isOnline": false },
    });

    res.json({ message: "Logout successful" });
  });
});
```

---

### **4. Query or Manage Sessions**

You can now use `SessionModel` to query or manage sessions in your application, for example:

#### Get All Active Sessions for a User
```ts
const activeSessions = await SessionModel.find({
  "session.userId": userId,
  "session.isOnline": true,
});
```

#### Invalidate All User Sessions (e.g., Force Logout)
```ts
await SessionModel.updateMany(
  { "session.userId": userId },
  { $set: { "session.isOnline": false } }
);
```

---

### **Advantages of This Approach**

1. **Unified Session Management**: All session data, including custom fields, is stored in the same document in the `sessions` collection.
2. **Manual Control**: You can manually query, update, or delete session documents using Mongoose.
3. **Compatibility**: Works seamlessly with `connect-mongo` while extending its functionality.

---

Let me know if you need help integrating this further!


---



To ensure the session lasts longer while keeping authentication secure and implementing rate-limiting based on IP, follow these steps:

---

## **1. Extend Session Lifetime Automatically**
Instead of setting a fixed session expiration (1 day), you can refresh the session expiration time with user activity. This can be done by updating the session expiration time whenever the user interacts with your application.

### Update Session on Activity
```ts
app.use((req, res, next) => {
  if (req.session) {
    req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // Reset expiration to 1 day
    req.session.touch(); // Refresh the session in MongoDB
  }
  next();
});
```

This ensures the session lifetime is extended for active users. Inactive users' sessions will still expire after the set duration (1 day).

---

## **2. Ensure Authentication Security**
Use secure practices to protect sessions:

1. **Set Secure Cookies:**
    - `secure: true` ensures cookies are only sent over HTTPS in production.
    - `httpOnly: true` prevents JavaScript from accessing cookies.
    - `sameSite: 'strict'` or `'lax'` helps mitigate cross-site request forgery (CSRF).

2. **Regenerate Session ID After Login:**
   Regenerate the session ID upon login to prevent session fixation attacks.
   ```ts
   req.session.regenerate((err) => {
     if (err) throw err;
     req.session.userId = user._id; // Store user data in the new session
     res.json({ message: "Login successful" });
   });
   ```

3. **Store Sessions in Secure MongoDB:**
   Ensure `MongoStore` is configured with strong credentials and IP whitelisting (if possible).

---

## **3. Add Rate Limiting with Redis**

Use the `express-rate-limit` and `ioredis` libraries to implement a Redis-backed rate limiter.

### Install Dependencies
```bash
npm install express-rate-limit ioredis rate-limit-redis
```

### Set Up Redis Connection
```ts
import Redis from "ioredis";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";

const redisClient = new Redis(process.env.REDIS_URI); // Connect to Redis
```

### Configure Rate Limiting Middleware
```ts
const apiRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  keyGenerator: (req) => req.ip, // Use IP as the key
});

app.use("/api", apiRateLimiter); // Apply to all API routes
```

---

## **4. Combine Rate Limiting with Login Protection**
To protect sensitive routes like login, you can use a stricter rate limiter:

### Example for Login Route
```ts
const loginRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  windowMs: 5 * 60 * 1000, // 5 minutes window
  max: 5, // Limit each IP to 5 login attempts per 5 minutes
  message: "Too many login attempts, please try again later.",
});

app.post("/auth/login", loginRateLimiter, (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    req.logIn(user, (err) => {
      if (err) return next(err);
      res.json({ message: "Login successful" });
    });
  })(req, res, next);
});
```

---

## **5. Monitor and Secure Redis**

### Secure Redis:
1. **Set a Strong Password**: Configure `requirepass` in `redis.conf`.
2. **Bind to Localhost**: Update `bind 127.0.0.1` in `redis.conf`.
3. **Enable TLS (Optional)**: Use Redis with TLS for secure communication.

### Monitor Redis:
Use tools like `RedisInsight` or the Redis CLI to monitor the rate-limiting keys.

---

## **6. Example of Complete Code**
Here’s the combined implementation for session refresh, rate limiting, and Redis security:

```ts
import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import passport from "passport";
import Redis from "ioredis";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";

const app = express();
const redisClient = new Redis(process.env.REDIS_URI);

// Configure Sessions
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
      stringify: false,
    }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      sameSite: "strict",
    },
  })
);

// Refresh Session on Activity
app.use((req, res, next) => {
  if (req.session) {
    req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // Reset expiration to 1 day
    req.session.touch();
  }
  next();
});

// API Rate Limiter
const apiRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  keyGenerator: (req) => req.ip,
  message: "Too many requests, please try again later.",
});

// Login Rate Limiter
const loginRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 login attempts per 5 minutes
  message: "Too many login attempts, please try again later.",
});

// Apply Rate Limiter to APIs
app.use("/api", apiRateLimiter);

// Login Route with Rate Limiter
app.post("/auth/login", loginRateLimiter, (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    req.logIn(user, (err) => {
      if (err) return next(err);
      res.json({ message: "Login successful" });
    });
  })(req, res, next);
});

// Logout Route
app.post("/auth/logout", (req, res) => {
  const sessionId = req.sessionID;

  req.session.destroy(async (err) => {
    if (err) return res.status(500).json({ message: "Logout failed" });

    await redisClient.del(sessionId); // Clean Redis rate-limit keys if needed
    res.json({ message: "Logout successful" });
  });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
```

---

This setup ensures:
1. Secure session handling with automatic expiration refresh.
2. Rate-limiting for APIs and login attempts.
3. Redis-backed rate-limiting for better performance.
4. Secure Redis configuration for sensitive data.


---


To implement **Two-Factor Authentication (2FA)** and **WebAuthn** in your Node.js + React application, you can follow this comprehensive plan:

---

## **1. Two-Factor Authentication (2FA)**

2FA can be implemented using TOTP (Time-Based One-Time Password), commonly used by apps like Google Authenticator or Authy.

### **Step 1: Install Required Packages**
Install libraries for generating and validating 2FA tokens:
```bash
npm install speakeasy qrcode
```

### **Step 2: Backend Implementation for TOTP**
Add endpoints to enable and verify 2FA using the `speakeasy` library.

#### Enable 2FA: Generate a Secret
```ts
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import UserModel from "./models/User"; // User model

app.post("/api/enable-2fa", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  // Generate a 2FA secret
  const secret = speakeasy.generateSecret({ name: "YourAppName" });

  // Save the secret in the user's profile (hashed for security)
  await UserModel.findByIdAndUpdate(userId, { twoFactorSecret: secret.base32 });

  // Generate a QR code for the user to scan
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

  res.json({ qrCodeUrl });
});
```

#### Verify 2FA Token
```ts
app.post("/api/verify-2fa", async (req, res) => {
  const { token } = req.body;
  const userId = req.session.userId;

  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const user = await UserModel.findById(userId);
  if (!user || !user.twoFactorSecret) {
    return res.status(400).json({ message: "2FA is not enabled for this user." });
  }

  const isValid = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: "base32",
    token,
  });

  if (!isValid) return res.status(401).json({ message: "Invalid token." });

  res.json({ message: "2FA verification successful." });
});
```

---

### **Step 3: React Frontend for 2FA**

#### Scan QR Code
Display the QR code generated by `/api/enable-2fa` in the frontend using the `img` tag:
```tsx
import React, { useState, useEffect } from "react";
import axios from "axios";

const Enable2FA = () => {
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  useEffect(() => {
    axios.post("/api/enable-2fa").then((res) => setQrCodeUrl(res.data.qrCodeUrl));
  }, []);

  return qrCodeUrl ? (
    <div>
      <h1>Enable Two-Factor Authentication</h1>
      <img src={qrCodeUrl} alt="Scan QR Code" />
      <p>Scan the QR code using Google Authenticator or Authy.</p>
    </div>
  ) : (
    <p>Loading...</p>
  );
};

export default Enable2FA;
```

#### Verify Token
Create a form to submit the 2FA token:
```tsx
const Verify2FA = () => {
  const [token, setToken] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const response = await axios.post("/api/verify-2fa", { token });
    alert(response.data.message);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Enter 2FA token"
        required
      />
      <button type="submit">Verify</button>
    </form>
  );
};
```

---

## **2. WebAuthn Authentication**

WebAuthn is a passwordless authentication mechanism that uses hardware security keys or biometric devices.

### **Step 1: Install Required Libraries**
Install the `@simplewebauthn/server` library for backend and `@simplewebauthn/browser` for frontend:
```bash
npm install @simplewebauthn/server @simplewebauthn/browser
```

---

### **Step 2: Backend Implementation for WebAuthn**

#### Generate Registration Options
```ts
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";

app.post("/api/webauthn/register-options", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const user = await UserModel.findById(userId);

  const options = generateRegistrationOptions({
    rpName: "YourAppName",
    rpID: "yourdomain.com",
    userID: user._id.toString(),
    userName: user.email,
  });

  // Save challenge in user record
  user.webauthnChallenge = options.challenge;
  await user.save();

  res.json(options);
});
```

#### Verify Registration
```ts
app.post("/api/webauthn/register", async (req, res) => {
  const { body } = req;
  const userId = req.session.userId;

  const user = await UserModel.findById(userId);

  const verification = await verifyRegistrationResponse({
    response: body,
    expectedChallenge: user.webauthnChallenge,
    expectedOrigin: "https://yourdomain.com",
    expectedRPID: "yourdomain.com",
  });

  if (!verification.verified) {
    return res.status(400).json({ message: "Verification failed" });
  }

  user.webauthnDevices.push(verification.registrationInfo);
  user.webauthnChallenge = null; // Clear the challenge
  await user.save();

  res.json({ message: "Registration successful" });
});
```

---

### **Step 3: Frontend Implementation for WebAuthn**

#### Registration
```tsx
import { startRegistration } from "@simplewebauthn/browser";
import axios from "axios";

const RegisterWebAuthn = () => {
  const handleRegister = async () => {
    const options = await axios.post("/api/webauthn/register-options").then((res) => res.data);

    const attestationResponse = await startRegistration(options);

    const result = await axios.post("/api/webauthn/register", attestationResponse);
    alert(result.data.message);
  };

  return <button onClick={handleRegister}>Register WebAuthn</button>;
};

export default RegisterWebAuthn;
```

---

### **Step 4: Add WebAuthn Authentication**
Once registration is complete, add a similar process for login using:
- `generateAuthenticationOptions` (backend).
- `startAuthentication` (frontend).

---

## **3. Combine WebAuthn with 2FA**

- After login, enforce **both 2FA and WebAuthn** if enabled for the user.
- Store flags like `is2FAEnabled` or `isWebAuthnEnabled` in the user document.
- During login, prompt the user to complete both 2FA and WebAuthn authentication steps.

---

## **4. Rate-Limiting for 2FA and WebAuthn**
To secure 2FA and WebAuthn endpoints:
- Use stricter rate limits (e.g., 3 attempts per minute).
- Apply Redis-based rate limits for `/api/verify-2fa` and `/api/webauthn`.

---

This setup ensures:
1. **Strong 2FA using TOTP.**
2. **Passwordless authentication with WebAuthn.**
3. **Secure endpoints with rate limits.**

---


Here's a complete implementation of **User Model**, **Session Model**, and **Authentication** system using **Node.js**, **TypeScript**, **Passport.js**, **MongoDB**, **Bull** for handling heavy tasks (e.g., email sending), and support for **2FA** and **WebAuthn**. This will cover both **client-side** and **server-side** functionality.

---

### **1. User Model**
```ts
import mongoose, { Schema, Document, Types } from "mongoose";

export interface IUser extends Document {
  email: string;
  password?: string; // Not needed for OAuth users
  roles: string[]; // ['user', 'admin', 'moderator']
  twoFactorSecret?: string; // For 2FA (TOTP)
  is2FAEnabled: boolean; // Whether 2FA is enabled
  webauthnDevices: Array<{
    credentialID: string;
    publicKey: string;
    counter: number;
  }>; // For WebAuthn
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Optional for OAuth
    roles: { type: [String], default: ["user"] }, // Default role: 'user'
    twoFactorSecret: { type: String }, // Hashed 2FA secret
    is2FAEnabled: { type: Boolean, default: false },
    webauthnDevices: [
      {
        credentialID: { type: String, required: true },
        publicKey: { type: String, required: true },
        counter: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true }
);

const UserModel = mongoose.model<IUser>("User", UserSchema);
export default UserModel;
```

---

### **2. Session Model**
```ts
import mongoose, { Schema, Document, Types } from "mongoose";

export interface ISession extends Document {
  userId: Types.ObjectId;
  sessionId: string;
  ip: string;
  userAgent: string;
  location: { city: string; country: string };
  isOnline: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sessionId: { type: String, required: true, unique: true },
    ip: { type: String, required: true },
    userAgent: { type: String, required: true },
    location: {
      city: { type: String, default: "Unknown" },
      country: { type: String, default: "Unknown" },
    },
    isOnline: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const SessionModel = mongoose.model<ISession>("Session", SessionSchema);
export default SessionModel;
```

---

### **3. Authentication Implementation**

#### **a. Passport.js Setup**
1. **Local Strategy**:
    - Use for email/password authentication.
    - Hash passwords using `bcrypt`.

2. **Google/GitHub Strategy**:
    - Use OAuth to link accounts.

#### Passport Config:
```ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import bcrypt from "bcrypt";
import UserModel, { IUser } from "./models/User";

// Serialize and Deserialize User
passport.serializeUser((user: IUser, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await UserModel.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Local Strategy
passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const user = await UserModel.findOne({ email });
        if (!user) return done(null, false, { message: "User not found" });

        if (!user.password) return done(null, false, { message: "Use OAuth to login." });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return done(null, false, { message: "Incorrect password" });

        done(null, user);
      } catch (err) {
        done(err);
      }
    }
  )
);

// Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const existingUser = await UserModel.findOne({ email: profile.emails[0].value });
        if (existingUser) return done(null, existingUser);

        const newUser = await UserModel.create({
          email: profile.emails[0].value,
        });

        done(null, newUser);
      } catch (err) {
        done(err);
      }
    }
  )
);

// GitHub Strategy
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      callbackURL: "/auth/github/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const existingUser = await UserModel.findOne({ email: profile.emails[0].value });
        if (existingUser) return done(null, existingUser);

        const newUser = await UserModel.create({
          email: profile.emails[0].value,
        });

        done(null, newUser);
      } catch (err) {
        done(err);
      }
    }
  )
);
```

---

#### **b. Session Creation**
When a user logs in, create a session document in MongoDB:
```ts
import geoip from "geoip-lite";
import SessionModel from "./models/Session";

app.post("/auth/login", async (req, res, next) => {
  passport.authenticate("local", async (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ message: info.message });

    req.logIn(user, async (err) => {
      if (err) return next(err);

      const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
      const userAgent = req.headers["user-agent"];
      const location = geoip.lookup(ip) || { city: "Unknown", country: "Unknown" };

      await SessionModel.create({
        userId: user._id,
        sessionId: req.sessionID,
        ip,
        userAgent,
        location,
        isOnline: true,
      });

      res.json({ message: "Login successful" });
    });
  })(req, res, next);
});
```

---

### **4. Rate Limiting with Redis**
Use `express-rate-limit` and `ioredis` for Redis-based rate limiting:
```ts
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";

const limiter = rateLimit({
  store: new RedisStore({ client: redisClient }), // Use Redis for storing limits
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
  message: "Too many requests, please try again later.",
});

app.use("/api", limiter);
```

---

### **5. Two-Factor Authentication**
Refer to the earlier steps to implement **2FA**.

---

### **6. WebAuthn**
Refer to the earlier implementation for **WebAuthn** for passwordless authentication.

---

### **Next Steps**
1. Use **HTTPS** with secure cookies in production.
2. Use **Bull** to send emails (e.g., for login notifications or 2FA recovery codes).
3. Allow **role-based access control** by checking user roles in your endpoints.

---


To authenticate a user in **WebSocket (Socket.IO)** and ensure secure session management, you can use token-based verification or session sharing between your WebSocket and HTTP servers. Here’s how to implement **Socket.IO authentication** with token verification and session sharing in your **Node.js** application:

---

### **1. Overview of Authentication Options**
- **Token-based authentication**:
    - Use JSON Web Tokens (JWT) or session tokens passed during the WebSocket handshake.
    - Validate the token during the WebSocket connection.

- **Session-based authentication**:
    - Share session data (e.g., from `express-session` or MongoDB) between HTTP requests and WebSocket connections.
    - Use the same session middleware for both HTTP and WebSocket.

---

### **2. Implementation Using Token-Based Authentication**
In this approach, the client passes a token (JWT or session ID) when establishing a WebSocket connection. The server validates the token before allowing the connection.

#### **Server-Side Implementation**
Here’s how to implement authentication in a Socket.IO server:

```ts
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import SessionModel from "./models/Session";

const app = require("express")();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Replace with your client URL for production
    methods: ["GET", "POST"],
  },
});

// Middleware to authenticate token during WebSocket connection
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error("Authentication error: Token is missing"));
  }

  try {
    // Verify token (JWT example)
    const payload = jwt.verify(token, process.env.JWT_SECRET!);

    // Optional: Check session validity in DB
    const session = await SessionModel.findOne({ sessionId: payload.sessionId });
    if (!session || !session.isOnline) {
      return next(new Error("Authentication error: Invalid session"));
    }

    // Attach user data to the socket for further use
    socket.data.user = {
      userId: payload.userId,
      sessionId: payload.sessionId,
    };

    next();
  } catch (err) {
    return next(new Error("Authentication error: Invalid token"));
  }
});

// Handle WebSocket events
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.data.user.userId}`);

  socket.on("message", (data) => {
    console.log(`Message from ${socket.data.user.userId}:`, data);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.data.user.userId}`);
  });
});

// Start the server
server.listen(3000, () => {
  console.log("Socket.IO server running on port 3000");
});
```

---

#### **Client-Side Implementation**
On the client side, pass the token during the WebSocket handshake:

```ts
import { io } from "socket.io-client";

// Get the token (e.g., from localStorage or cookies)
const token = localStorage.getItem("authToken");

const socket = io("http://localhost:3000", {
  auth: {
    token, // Pass the token in the handshake
  },
});

socket.on("connect", () => {
  console.log("Connected to WebSocket server");
});

socket.on("message", (data) => {
  console.log("Message received:", data);
});

socket.on("disconnect", () => {
  console.log("Disconnected from WebSocket server");
});
```

---

### **3. Implementation Using Session Sharing**
If you’re using `express-session` to manage sessions, you can share the session data between HTTP and WebSocket requests. This approach ensures consistency between HTTP and WebSocket sessions.

#### **Server-Side Implementation**
Use `passport` and `express-session` with Socket.IO:

```ts
import session from "express-session";
import MongoStore from "connect-mongo";
import passport from "passport";
import { Server } from "socket.io";
import sharedSession from "express-socket.io-session";

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "your-secret",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI!,
    collectionName: "sessions",
  }),
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  },
});

// Use session middleware in Express
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

// Attach the same session middleware to Socket.IO
io.use(sharedSession(sessionMiddleware, {
  autoSave: true, // Automatically save session changes
}));

io.on("connection", (socket) => {
  const session = socket.handshake.session;

  if (!session || !session.passport?.user) {
    console.log("Unauthenticated socket connection attempt");
    socket.disconnect();
    return;
  }

  console.log(`User connected: ${session.passport.user}`);

  socket.on("message", (data) => {
    console.log(`Message from user ${session.passport.user}:`, data);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${session.passport.user}`);
  });
});
```

---

### **4. Rate Limiting Socket.IO Connections**
To prevent abuse, you can add rate limiting for WebSocket events using a library like `socket.io-rate-limiter`.

Example:
```ts
import { createRateLimiter } from "socket.io-rate-limiter";

const rateLimiter = createRateLimiter({
  interval: 60 * 1000, // 1 minute
  max: 100, // Max 100 events per minute
});

io.on("connection", (socket) => {
  socket.on("message", async (data) => {
    const limited = await rateLimiter(socket.id);
    if (limited) {
      console.log("Rate limit exceeded for", socket.id);
      socket.emit("error", "Rate limit exceeded. Please slow down.");
      return;
    }

    console.log("Message received:", data);
  });
});
```

---

### **5. Two-Factor Authentication in WebSocket**
If 2FA is enabled for a user, ensure they authenticate using their TOTP or WebAuthn before connecting.

Example:
- Send a 2FA challenge after token validation.
- Disconnect users who fail the challenge.

---

### **6. Security Best Practices**
- Use **HTTPS** with secure WebSocket (`wss://`).
- Validate and sanitize all incoming data.
- Implement proper error handling and logging.
- Use Redis for session and rate limiting to scale effectively.

---

Would you like further assistance with setting up WebAuthn or handling specific WebSocket events?



---


To use **Passport.js** with **access tokens** and **refresh tokens** for authentication without using sessions (stateless authentication), you'll follow these steps:

---

### **1. Overview**
- **Access Token**: Used to authenticate API requests. It has a short expiration time (e.g., 15 minutes).
- **Refresh Token**: Used to obtain a new access token when the current one expires. It has a longer expiration time (e.g., 7 days).
- **Bearer Token**: The client sends the access token in the `Authorization` header for every API request.
- **No Sessions**: Instead of storing sessions on the server, all authentication is stateless.

---

### **2. Server Setup**
Here’s how to set up Passport.js for token-based authentication:

#### **Install Dependencies**
```bash
npm install passport passport-jwt passport-local jsonwebtoken bcrypt
```

#### **User Model (TypeScript)**

```ts
import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  email: string;
  password: string;
  roles: string[];
  comparePassword: (password: string) => Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  roles: { type: [String], default: ["user"] }, // Example: ["admin", "moderator", "user"]
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const bcrypt = await import("bcrypt");
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  const bcrypt = await import("bcrypt");
  return bcrypt.compare(password, this.password);
};

export default mongoose.model<IUser>("User", userSchema);
```

---

#### **JWT Strategy (Passport.js)**

```ts
import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import User, { IUser } from "./models/User";

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET!, // Use a secure secret key
};

// JWT Strategy for Passport
passport.use(
  new JwtStrategy(opts, async (payload, done) => {
    try {
      const user = await User.findById(payload.userId);
      if (!user) return done(null, false); // User not found
      return done(null, user); // Attach user to req.user
    } catch (err) {
      return done(err, false);
    }
  })
);

export default passport;
```

---

#### **Token Generation**

```ts
import jwt from "jsonwebtoken";

export const generateAccessToken = (userId: string) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: "15m" });
};

export const generateRefreshToken = (userId: string) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: "7d" });
};
```

---

#### **Auth Routes**

```ts
import express from "express";
import passport from "./passport";
import User from "./models/User";
import { generateAccessToken, generateRefreshToken } from "./utils/token";

const router = express.Router();

// Login route
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Send tokens to the client
    res.json({ accessToken, refreshToken });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// Refresh token route
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) return res.status(401).json({ message: "Refresh token required" });

  try {
    const payload: any = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!);

    const user = await User.findById(payload.userId);
    if (!user) return res.status(401).json({ message: "Invalid refresh token" });

    // Generate new access token
    const accessToken = generateAccessToken(user.id);
    res.json({ accessToken });
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired refresh token" });
  }
});

// Protected route example
router.get(
  "/protected",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    res.json({ message: "Access granted", user: req.user });
  }
);

export default router;
```

---

### **3. Rate Limiting (Using Redis)**
Use a library like `rate-limiter-flexible` to limit requests based on the IP address:

#### **Install Dependencies**
```bash
npm install rate-limiter-flexible ioredis
```

#### **Rate Limiter Implementation**
```ts
import { RateLimiterRedis } from "rate-limiter-flexible";
import Redis from "ioredis";

const redisClient = new Redis(process.env.REDIS_URL!);

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  points: 10, // 10 requests
  duration: 60, // per 60 seconds
});

export const rateLimiterMiddleware = async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch {
    res.status(429).json({ message: "Too many requests. Please try again later." });
  }
};
```

#### **Apply Middleware**
```ts
import { rateLimiterMiddleware } from "./middlewares/rateLimiter";

app.use(rateLimiterMiddleware);
```

---

### **4. Two-Factor Authentication (2FA)**
#### **Setup TOTP with `speakeasy`**
```bash
npm install speakeasy qrcode
```

#### **Generate 2FA Secret**
```ts
import speakeasy from "speakeasy";
import QRCode from "qrcode";

// Generate a secret for a user
export const generate2FASecret = async (userId: string) => {
  const secret = speakeasy.generateSecret({ length: 20, name: "YourAppName" });

  // Optionally, generate a QR code for the user to scan
  const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

  return { secret, qrCode };
};

// Verify TOTP token
export const verify2FAToken = (token: string, secret: string) => {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
  });
};
```

---

### **5. Secure Socket Authentication**
To authenticate WebSocket connections:
- Pass the `accessToken` as a query parameter or in the handshake headers.
- Verify the token on the server before allowing the connection.

#### **Socket.IO Example**
```ts
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Authentication error"));

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    socket.data.user = payload; // Attach user data to the socket
    next();
  } catch (err) {
    next(new Error("Authentication error: Invalid token"));
  }
});
```

---

### **6. Client Implementation**
Pass the tokens in the `Authorization` header or during the WebSocket handshake.

---

Would you like help with testing this implementation or adding WebAuthn for enhanced security?


---


To implement invalidation of refresh tokens on logout or when a new token is generated, you need to store the refresh tokens in a database. This ensures that you can manage them securely and revoke them when necessary.

Here’s how to achieve this:

---

### **1. Update the User Model**

Add a field to the user schema for storing refresh tokens. This can be an array to support multiple devices.

#### **User Model (TypeScript)**
```ts
import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  email: string;
  password: string;
  roles: string[];
  refreshTokens: string[]; // Store refresh tokens for the user
  comparePassword: (password: string) => Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  roles: { type: [String], default: ["user"] }, // Example: ["admin", "moderator", "user"]
  refreshTokens: { type: [String], default: [] }, // Array of refresh tokens
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const bcrypt = await import("bcrypt");
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  const bcrypt = await import("bcrypt");
  return bcrypt.compare(password, this.password);
};

export default mongoose.model<IUser>("User", userSchema);
```

---

### **2. Generate Refresh Tokens and Save to DB**

When a refresh token is generated, save it to the user's document in the database.

#### **Token Generation Utils**
```ts
import jwt from "jsonwebtoken";
import User, { IUser } from "./models/User";

export const generateAccessToken = (userId: string): string => {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: "15m" });
};

export const generateRefreshToken = async (userId: string): Promise<string> => {
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: "7d" });

  // Save the refresh token to the user's document
  const user = await User.findById(userId);
  if (user) {
    user.refreshTokens.push(refreshToken);
    await user.save();
  }

  return refreshToken;
};
```

---

### **3. Logout Route**

When the user logs out, remove the refresh token from the database.

#### **Logout Route**
```ts
router.post("/logout", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) return res.status(400).json({ message: "Refresh token is required" });

  try {
    const payload: any = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!);

    // Find the user and remove the refresh token
    const user = await User.findById(payload.userId);
    if (user) {
      user.refreshTokens = user.refreshTokens.filter((token) => token !== refreshToken);
      await user.save();
    }

    res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    res.status(401).json({ message: "Invalid refresh token" });
  }
});
```

---

### **4. Refresh Token Route**

When a new access token is generated, invalidate the previous refresh token and issue a new one.

#### **Refresh Token Route**
```ts
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) return res.status(400).json({ message: "Refresh token is required" });

  try {
    const payload: any = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!);

    const user = await User.findById(payload.userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    // Check if the refresh token is valid
    const tokenIndex = user.refreshTokens.indexOf(refreshToken);
    if (tokenIndex === -1) return res.status(401).json({ message: "Invalid refresh token" });

    // Invalidate the current refresh token
    user.refreshTokens.splice(tokenIndex, 1);

    // Generate new tokens
    const newAccessToken = generateAccessToken(user.id);
    const newRefreshToken = await generateRefreshToken(user.id);

    await user.save();

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired refresh token" });
  }
});
```

---

### **5. Middleware for Securing Routes**

Use the access token to secure your routes.

#### **Secure Route Example**
```ts
import passport from "passport";

router.get(
  "/protected",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    res.json({ message: "Access granted", user: req.user });
  }
);
```

---

### **6. Secure WebSocket Authentication**

For WebSocket connections:
- Pass the **access token** in the handshake query.
- Validate the token during the connection.

#### **Socket.IO Example**
```ts
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) return next(new Error("Authentication error"));

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    socket.data.user = payload; // Attach user data to the socket
    next();
  } catch (err) {
    next(new Error("Authentication error: Invalid token"));
  }
});
```

---

### **7. Summary**
1. Store **refresh tokens** in the database for each user.
2. Remove the refresh token from the database when logging out or refreshing the access token.
3. Secure your routes and WebSocket connections with the **access token**.
4. Rotate refresh tokens on every use to improve security.

---

Would you like assistance with WebAuthn or 2FA integration on top of this setup?



---



Below is a `Token` model in TypeScript designed to store details such as the `refreshToken`, `IP`, `userAgent`, and `location` for each token generated. This allows detailed tracking and management of tokens in the database.

---

### **Tokens Model (TypeScript)**

```ts
import mongoose, { Schema, Document } from "mongoose";

export interface IToken extends Document {
  userId: string; // Reference to the user
  refreshToken: string; // Refresh token string
  ip: string; // IP address of the user
  userAgent: string; // User-Agent string
  location: {
    city: string;
    country: string;
  }; // Geo-location of the user
  createdAt: Date; // Token creation time
  expiresAt: Date; // Token expiry time
}

const tokenSchema = new Schema<IToken>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true }, // Reference to the user model
  refreshToken: { type: String, required: true, unique: true }, // Unique refresh token
  ip: { type: String, required: true }, // IP address
  userAgent: { type: String, required: true }, // User agent
  location: {
    city: { type: String, default: "Unknown" },
    country: { type: String, default: "Unknown" },
  },
  createdAt: { type: Date, default: Date.now }, // When the token was created
  expiresAt: { type: Date, required: true }, // When the token expires
});

// Automatically remove expired tokens from the database
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IToken>("Token", tokenSchema);
```

---

### **How It Works**
1. **`userId`**: Links the token to a specific user.
2. **`refreshToken`**: Stores the refresh token securely.
3. **`ip` & `userAgent`**: Captures the user's device and location details.
4. **`expiresAt`**: Specifies when the token should expire.
5. **MongoDB TTL Index**:
    - The index on `expiresAt` automatically deletes expired tokens.
    - No manual cleanup is required for expired tokens.

---

### **Token Generation and Saving**

Here's how you can generate and save a token to the database.

#### **Token Generation Function**
```ts
import jwt from "jsonwebtoken";
import TokenModel, { IToken } from "./models/Token";

export const generateRefreshToken = async (
  userId: string,
  ip: string,
  userAgent: string,
  location: { city: string; country: string }
): Promise<string> => {
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET!, { expiresIn: "7d" });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Token expiration (7 days)

  // Save token details to the database
  await TokenModel.create({
    userId,
    refreshToken,
    ip,
    userAgent,
    location,
    expiresAt,
  });

  return refreshToken;
};
```

---

### **Revoke Refresh Token**

To revoke a specific refresh token, simply remove it from the database.

#### **Revoke Token Function**
```ts
export const revokeRefreshToken = async (refreshToken: string): Promise<void> => {
  await TokenModel.findOneAndDelete({ refreshToken });
};
```

---

### **Validate Refresh Token**

Before generating a new access token, validate the refresh token and check its associated details.

#### **Validate Refresh Token Function**
```ts
export const validateRefreshToken = async (refreshToken: string): Promise<IToken | null> => {
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!);
    const token = await TokenModel.findOne({ refreshToken });

    if (!token) return null; // Token not found (possibly revoked)
    return token; // Valid token
  } catch (err) {
    return null; // Invalid or expired token
  }
};
```

---

### **Refresh Token Route**

Here’s how to handle refreshing access tokens while revoking old refresh tokens.

#### **Refresh Token Endpoint**
```ts
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) return res.status(400).json({ message: "Refresh token is required" });

  const token = await validateRefreshToken(refreshToken);
  if (!token) return res.status(401).json({ message: "Invalid or expired refresh token" });

  const { userId, ip, userAgent, location } = token;

  // Revoke the old token
  await revokeRefreshToken(refreshToken);

  // Generate new tokens
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: "15m" });
  const newRefreshToken = await generateRefreshToken(userId, ip, userAgent, location);

  res.json({ accessToken, refreshToken: newRefreshToken });
});
```

---

### **Logout Route**

Revoke all tokens for a user when they log out.

#### **Logout Endpoint**
```ts
router.post("/logout", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) return res.status(400).json({ message: "Refresh token is required" });

  await revokeRefreshToken(refreshToken);

  res.status(200).json({ message: "Logged out successfully" });
});
```

---

### **Usage in WebSockets**

For socket authentication, pass the `accessToken` during the connection handshake. Validate it on connection.

#### **Socket.IO Middleware**
```ts
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) return next(new Error("Authentication error"));

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    socket.data.user = payload;
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
});
```

---

### **Rate Limiting**

Add a Redis-based rate limiter to APIs to prevent abuse.

#### **Rate Limiter Middleware**
```ts
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import Redis from "ioredis";

const redisClient = new Redis(process.env.REDIS_URI!);

const apiRateLimiter = rateLimit({
  store: new RedisStore({ sendCommand: (...args: string[]) => redisClient.call(...args) }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests, please try again later.",
});

app.use("/api", apiRateLimiter);
```

---

### **Conclusion**
This implementation ensures:
1. Secure storage of refresh tokens with IP, userAgent, and location tracking.
2. Automatic expiration of tokens.
3. Revocation of old refresh tokens on logout or refresh.
4. Token-based WebSocket authentication.
5. API rate limiting with Redis.

Let me know if you'd like to expand this further with 2FA or WebAuthn!


---


To handle token expiration in a WebSocket (e.g., Socket.IO) environment and refresh it seamlessly, you can follow the steps below:

---

### **Solution Overview**
1. **Initial Authentication**: Validate the `accessToken` during the WebSocket connection handshake.
2. **Handle Expired Tokens**:
    - Send a `401`-like error or specific event to the client when the token expires.
    - Allow the client to request a new `accessToken` using a valid `refreshToken`.
3. **Refresh Token Workflow**:
    - Implement an endpoint for refreshing tokens over HTTP.
    - The client uses the `refreshToken` to get a new `accessToken` and resumes socket communication.
4. **Reauthenticate Socket**:
    - The client sends the new `accessToken` to reauthenticate the WebSocket connection.

---

### **Implementation**

#### **1. Middleware for Initial Authentication**
In the WebSocket server, verify the `accessToken` when the client connects.

```ts
import jwt from "jsonwebtoken";
import { Socket } from "socket.io";

const authenticateSocket = (socket: Socket, next: any) => {
  const token = socket.handshake.auth.token; // Access token sent by client

  if (!token) {
    return next(new Error("Authentication error: Token missing"));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!); // Verify access token
    socket.data.user = payload; // Attach user data to socket
    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      return next(new Error("Authentication error: Token expired")); // Handle expired token
    }
    return next(new Error("Authentication error: Invalid token"));
  }
};

io.use(authenticateSocket);
```

---

#### **2. Handle Token Expiration**
When the token expires, notify the client so it can refresh the token.

```ts
io.on("connection", (socket) => {
  socket.on("secure-event", (data) => {
    if (!socket.data.user) {
      socket.emit("error", { message: "Token expired. Please refresh your token." });
      return;
    }

    // Handle secure event
    console.log(`User ID: ${socket.data.user.id} performed secure action.`);
  });
});
```

---

#### **3. Refresh Token Workflow**

**HTTP Refresh Token Endpoint**: The client refreshes the `accessToken` via an HTTP request.

```ts
router.post("/refresh-token", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) return res.status(400).json({ message: "Refresh token is required" });

  try {
    const token = await validateRefreshToken(refreshToken);
    if (!token) return res.status(401).json({ message: "Invalid or expired refresh token" });

    const { userId, ip, userAgent, location } = token;

    // Revoke old token and generate new ones
    await revokeRefreshToken(refreshToken);

    const newAccessToken = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: "15m" });
    const newRefreshToken = await generateRefreshToken(userId, ip, userAgent, location);

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
});
```

---

#### **4. Client Workflow**

On the client side:
1. **Reconnect on Token Expiration**: Detect `error` events from the server when the `accessToken` expires.
2. **Refresh the Token**: Use the `refreshToken` to get a new `accessToken` via the HTTP endpoint.
3. **Reconnect with New Token**: Reauthenticate the WebSocket connection.

**Example Client-Side Code**:

```ts
import io from "socket.io-client";
import axios from "axios";

let socket: any;
let accessToken = "initial-access-token";
let refreshToken = "initial-refresh-token";

const connectSocket = () => {
  socket = io("http://localhost:3000", {
    auth: { token: accessToken },
  });

  // Handle token expiration
  socket.on("error", async (error: any) => {
    if (error.message === "Token expired. Please refresh your token.") {
      try {
        const response = await axios.post("http://localhost:3000/api/refresh-token", {
          refreshToken,
        });

        accessToken = response.data.accessToken;
        refreshToken = response.data.refreshToken;

        // Reconnect with the new token
        socket.auth.token = accessToken;
        socket.connect();
      } catch (err) {
        console.error("Failed to refresh token:", err);
      }
    }
  });

  // Handle secure events
  socket.on("secure-event-response", (data: any) => {
    console.log("Secure event response:", data);
  });
};

// Connect to the WebSocket server
connectSocket();
```

---

#### **5. Secure Reconnection**
After refreshing the token, reconnect the socket with the updated `accessToken`.

```ts
socket.auth.token = newAccessToken;
socket.connect();
```

---

### **Advantages of This Approach**
1. **Security**: Access tokens have short lifetimes (e.g., 15 minutes), while refresh tokens remain secure.
2. **Resilience**: Tokens are refreshed seamlessly without disrupting the WebSocket connection significantly.
3. **Scalability**: Token management is handled efficiently, with support for multiple devices and sessions.

---

Let me know if you'd like further clarification or implementation details!