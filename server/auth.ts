import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends User {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "inventory-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Local Strategy (Username/Password)
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !user.password || !(await comparePasswords(password, user.password))) {
            return done(null, false, { message: "Invalid email or password" });
          }
          
          // Update last login
          await storage.updateUser(user.id, { lastLogin: new Date() });
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "/api/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            let user = await storage.getUserByGoogleId(profile.id);
            
            if (!user) {
              // Check if user exists by email
              const existingUser = await storage.getUserByEmail(profile.emails?.[0]?.value || "");
              
              if (existingUser) {
                // Link Google account to existing user
                user = await storage.updateUser(existingUser.id, {
                  googleId: profile.id,
                  profileImageUrl: profile.photos?.[0]?.value,
                  provider: "google",
                  lastLogin: new Date(),
                });
              } else {
                // Create new user
                user = await storage.createUser({
                  email: profile.emails?.[0]?.value || "",
                  firstName: profile.name?.givenName || "",
                  lastName: profile.name?.familyName || "",
                  profileImageUrl: profile.photos?.[0]?.value || "",
                  googleId: profile.id,
                  provider: "google",
                  isActive: true,
                  lastLogin: new Date(),
                });
              }
            } else {
              // Update last login
              await storage.updateUser(user.id, { lastLogin: new Date() });
            }
            
            return done(null, user);
          } catch (error) {
            return done(error);
          }
        }
      )
    );
  }

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Auth routes
  app.post("/api/register", async (req, res, next) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName: firstName || "",
        lastName: lastName || "",
        provider: "local",
        isActive: true,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.json({
      id: req.user?.id,
      email: req.user?.email,
      firstName: req.user?.firstName,
      lastName: req.user?.lastName,
      role: req.user?.role,
    });
  });

  // Google OAuth routes
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    app.get("/api/auth/google", passport.authenticate("google", { 
      scope: ["profile", "email", "https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive.file"] 
    }));

    app.get("/api/auth/google/callback", 
      passport.authenticate("google", { failureRedirect: "/auth" }),
      (req, res) => {
        // Successful authentication, redirect to dashboard
        res.redirect("/");
      }
    );
  }

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    res.json({
      id: req.user?.id,
      email: req.user?.email,
      firstName: req.user?.firstName,
      lastName: req.user?.lastName,
      role: req.user?.role,
      profileImageUrl: req.user?.profileImageUrl,
    });
  });
}

export function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}