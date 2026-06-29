import { useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { Map, Plus, User, Building2 } from "lucide-react";
import { Button } from "./ui/button";
import { useUser } from '../context/UserContext';

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, isMunicipalUser } = useUser();

  useEffect(() => {
    if (!loading && !user) navigate('/login', { replace: true });
  }, [user, loading]);

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Municipal button on left */}
            {isMunicipalUser && (
              <Button
                onClick={() => navigate("/municipal")}
                variant={isActive("/municipal") ? "secondary" : "ghost"}
                size="sm"
                className="flex items-center gap-2"
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
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-card border-t border-border shadow-lg sticky bottom-0">
        <div className="container mx-auto px-4">
          <div className="flex justify-around items-center h-16">
            <Button
              onClick={() => navigate("/")}
              variant={isActive("/") && !location.pathname.includes("/post/") && !location.pathname.includes("/profile") && !location.pathname.includes("/municipal") ? "secondary" : "ghost"}
              size="sm"
              className="flex flex-col items-center justify-center gap-1 px-4 py-2"
            >
              <Map className="size-6" />
              <span className="text-xs">Carte</span>
            </Button>

            <Button
              onClick={() => navigate("/create")}
              variant={isActive("/create") ? "default" : "secondary"}
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
              variant={isActive("/profile") ? "secondary" : "ghost"}
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