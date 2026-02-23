import { Outlet, useNavigate, useLocation } from "react-router";
import { Map, Plus, List, User, Building2 } from "lucide-react";

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  // Mock user data - in real app, this would come from auth context
  const isMunicipalUser = true; // Set to true to show municipal view

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
              <button
                onClick={() => navigate("/municipal")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  isActive("/municipal")
                    ? "bg-primary-foreground/20 backdrop-blur-sm border-2 border-primary-foreground/30 scale-105"
                    : "hover:bg-primary-foreground/10"
                }`}
              >
                <Building2 className="size-5" />
              </button>
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
            <button
              onClick={() => navigate("/")}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                isActive("/") &&
                !location.pathname.includes("/post/") &&
                !location.pathname.includes("/profile") &&
                !location.pathname.includes("/municipal")
                  ? "text-primary bg-secondary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Map className="size-6" />
              <span className="text-xs">Carte</span>
            </button>

            <button
              onClick={() => navigate("/create")}
              className={`flex flex-col items-center justify-center gap-1 px-6 py-2 rounded-full transition-all ${
                isActive("/create")
                  ? "bg-primary text-primary-foreground scale-110 shadow-lg"
                  : "bg-accent text-accent-foreground hover:bg-primary hover:text-primary-foreground"
              }`}
            >
              <Plus className="size-7" />
              <span className="text-xs">Nouveau</span>
            </button>

            <button
              onClick={() => navigate("/profile")}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                isActive("/profile")
                  ? "text-primary bg-secondary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <User className="size-6" />
              <span className="text-xs">Profil</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}