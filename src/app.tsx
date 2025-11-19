import "./App.css";
import { use } from "react";
import { userContext, UserProvider } from "./providers/user.provider";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { Toaster } from "./components/ui/sonner";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "./lib/query-client";

// Create a new router instance
const router = createRouter({
  routeTree,
  context: {
    wallet: undefined,
    authenticate: async () => undefined,
    logout: () => {},
  },
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function InnerApp() {
  const userCtx = use(userContext);

  return <RouterProvider router={router} context={userCtx} />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <InnerApp />
        <Toaster />
      </UserProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
