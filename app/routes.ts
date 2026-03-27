import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("about", "routes/about.tsx"),
  route(":containerId", "routes/container.tsx"),
  route("profile", "routes/profile.tsx"),
] satisfies RouteConfig;
