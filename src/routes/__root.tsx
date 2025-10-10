import { UserContext } from '@/providers/user.provider'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { Header } from '@/components/Header'

function RootComponent() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <Outlet />
    </div>
  )
}

export const Route = createRootRouteWithContext<UserContext>()({ component: RootComponent })