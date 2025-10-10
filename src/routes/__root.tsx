import { UserContext } from '@/providers/user.provider'
import { createRootRouteWithContext, Outlet} from '@tanstack/react-router'

export const Route = createRootRouteWithContext<UserContext>()({ component: () => <Outlet />})