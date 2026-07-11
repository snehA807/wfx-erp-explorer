import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";

import { AppShell } from "../components/shell/AppShell";

const AskPage = lazy(() => import("../pages/ask"));
const OverviewPage = lazy(() => import("../pages/overview"));
const ProductsPage = lazy(() => import("../pages/products"));
const SearchPage = lazy(() => import("../pages/search"));
const VisualSearchPage = lazy(() => import("../pages/visual"));

function withSuspense(Element: React.LazyExoticComponent<() => JSX.Element>) {
  return (
    <Suspense fallback={null}>
      <Element />
    </Suspense>
  );
}

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: "/", element: withSuspense(AskPage) },
      { path: "/overview", element: withSuspense(OverviewPage) },
      { path: "/products", element: withSuspense(ProductsPage) },
      { path: "/search", element: withSuspense(SearchPage) },
      { path: "/visual", element: withSuspense(VisualSearchPage) },
    ],
  },
  { path: "/ask", element: <Navigate to="/" replace /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
