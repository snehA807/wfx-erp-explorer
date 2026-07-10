import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";

const AskPage = lazy(() => import("../pages/ask"));
const OverviewPage = lazy(() => import("../pages/overview"));
const ProductsPage = lazy(() => import("../pages/products"));
const SearchPage = lazy(() => import("../pages/search"));
const VisualSearchPage = lazy(() => import("../pages/visual"));
// M12b QA route (m12b-contract.md §12) — deleted at M12i, never linked from nav.
const DevTokensPage = lazy(() => import("../pages/dev-tokens"));

function withSuspense(Element: React.LazyExoticComponent<() => JSX.Element>) {
  return (
    <Suspense fallback={null}>
      <Element />
    </Suspense>
  );
}

const router = createBrowserRouter([
  { path: "/", element: withSuspense(AskPage) },
  { path: "/overview", element: withSuspense(OverviewPage) },
  { path: "/products", element: withSuspense(ProductsPage) },
  { path: "/search", element: withSuspense(SearchPage) },
  { path: "/visual", element: withSuspense(VisualSearchPage) },
  { path: "/dev-tokens", element: withSuspense(DevTokensPage) },
  { path: "/ask", element: <Navigate to="/" replace /> },
  { path: "*", element: <Navigate to="/" replace /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
