import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route(":containerId", "routes/container.tsx"),
] satisfies RouteConfig;
