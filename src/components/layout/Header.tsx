import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, Menu, X, User, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center">
        <div className="mr-4 hidden md:flex">
          <Link className="mr-6 flex items-center space-x-2" to="/">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="hidden font-bold sm:inline-block">YIMA</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm lg:gap-6">
            <Link
              className="transition-colors hover:text-foreground/80 text-foreground/60"
              to="/exams"
            >
              Examens
            </Link>
            <Link
              className="transition-colors hover:text-foreground/80 text-foreground/60"
              to="/pricing"
            >
              Abonnements
            </Link>
            {user && (
              <Link
                className="transition-colors hover:text-foreground/80 text-foreground/60"
                to="/dashboard"
              >
                Tableau de bord
              </Link>
            )}
          </nav>
        </div>
        <Button
          variant="ghost"
          className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <Link className="flex items-center space-x-2 md:hidden" to="/">
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="font-bold">YIMA</span>
            </Link>
          </div>
          <nav className="flex items-center gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                    <span className="sr-only">Menu utilisateur</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/profile">Profil</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/downloads">Téléchargements</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" asChild>
                  <Link to="/auth">Connexion</Link>
                </Button>
                <Button asChild>
                  <Link to="/auth?mode=signup">Inscription</Link>
                </Button>
              </div>
            )}
          </nav>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="absolute inset-x-0 top-0 z-50 origin-top-right transform p-2 transition md:hidden">
          <div className="divide-y-2 divide-gray-50 rounded-lg bg-background shadow-lg ring-1 ring-black ring-opacity-5">
            <div className="px-5 pb-6 pt-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-8 w-8 text-primary" />
                  <span className="font-bold text-xl">YIMA</span>
                </div>
                <div className="-mr-2">
                  <Button
                    variant="ghost"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="sr-only">Fermer menu</span>
                    <X className="h-6 w-6" />
                  </Button>
                </div>
              </div>
              <div className="mt-6">
                <nav className="grid gap-y-8">
                  <Link
                    className="text-base font-medium hover:text-primary"
                    to="/exams"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Examens
                  </Link>
                  <Link
                    className="text-base font-medium hover:text-primary"
                    to="/pricing"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Abonnements
                  </Link>
                  {user && (
                    <Link
                      className="text-base font-medium hover:text-primary"
                      to="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Tableau de bord
                    </Link>
                  )}
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}