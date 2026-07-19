import { useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { Map, Plus, User, Building2 } from "lucide-react";
import { Button } from "./ui/button";
import { useUser } from '../context/UserContext';
import { toast } from 'sonner';
import { logSecurityEvent } from '../lib/sentry';

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, isMunicipalUser } = useUser();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (!isMunicipalUser && location.pathname.startsWith('/municipal')) {
      logSecurityEvent('Tentative d\'accès à /municipal par un compte non municipal', { userId: user.id });
      toast.error('Accès réservé aux comptes municipaux');
      navigate('/', { replace: true });
    }
  }, [user, loading, isMunicipalUser, location.pathname]);

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Municipal button on left */}
            {isMunicipalUser && (
              <Button
                onClick={() => navigate("/municipal")}
                variant={isActive("/municipal") ? "default" : "ghost"}
                size="sm"
                className="flex items-center gap-2"
                aria-label="Vue municipale"
              >
                <Building2 className="size-5" />
              </Button>
            )}

            {/* Title centered or left-aligned */}
            <h1
              className={`${isMunicipalUser ? "absolute left-1/2 transform -translate-x-1/2" : ""}`}
            >
              City Spot
            </h1>

            {/* Empty space for balance when municipal button is present */}
            {isMunicipalUser && (
              <div className="w-[120px]"></div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-card border-t border-border shadow-lg sticky bottom-0">
        <div className="container mx-auto px-4">
          <div className="flex justify-around items-center h-16">
            <Button
              onClick={() => navigate("/")}
              variant={isActive("/") && !location.pathname.includes("/post/") && !location.pathname.includes("/profile") && !location.pathname.includes("/municipal") ? "default" : "ghost"}
              size="sm"
              className="flex flex-col items-center justify-center gap-1 px-4 py-2"
            >
              <Map className="size-6" />
              <span className="text-xs">Carte</span>
            </Button>

            <Button
              onClick={() => navigate("/create")}
              variant={isActive("/create") ? "default" : "ghost"}
              size="sm"
              className={`flex flex-col items-center justify-center gap-1 px-6 py-2 rounded-full transition-all ${
                isActive("/create") ? "scale-110 shadow-lg" : ""
              }`}
            >
              <Plus className="size-7" />
              <span className="text-xs">Nouveau</span>
            </Button>

            <Button
              onClick={() => navigate("/profile")}
              variant={isActive("/profile") ? "default" : "ghost"}
              size="sm"
              className="flex flex-col items-center justify-center gap-1 px-4 py-2"
            >
              <User className="size-6" />
              <span className="text-xs">Profil</span>
            </Button>
          </div>
        </div>
      </nav>
    </div>
  );
}