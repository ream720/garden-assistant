import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/about", "routes/about.tsx"),

  // Authentication routes
  route("/login", "routes/login.tsx"),
  route("/register", "routes/register.tsx"),
  route("/reset-password", "routes/reset-password.tsx"),

  // Dashboard
  route("/dashboard", "routes/dashboard.tsx"),

  // Spaces
  route("/spaces", "routes/spaces.tsx"),
  route("/spaces/:spaceId", "routes/spaces.$spaceId.tsx"),

  // Plants
  route("/plants", "routes/plants.tsx"),
  route("/plants/:plantId", "routes/plants.$plantId.tsx"),

  // Events
  route("/events", "routes/events.tsx"),

  // Profile
  route("/profile", "routes/profile.tsx"),

  // Settings
  route("/settings", "routes/settings.tsx"),
] satisfies RouteConfig;
