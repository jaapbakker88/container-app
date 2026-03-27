import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("about", "routes/about.tsx"),
  route("profile", "routes/profile.tsx"),
  route("register", "routes/register.tsx"),
  route(":containerId", "routes/container.tsx"),
] satisfies RouteConfig;
