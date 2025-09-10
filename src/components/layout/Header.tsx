import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { LogOut, User, Menu, BookOpen, BarChart3, Settings } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function Header() {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navItems = [
    { to: '/dashboard', icon: BarChart3, label: t('dashboard') },
    { to: '/exams', icon: BookOpen, label: t('exams') },
    { to: '/profile', icon: User, label: t('profile') },
    { to: '/settings', icon: Settings, label: t('settings') },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to={user ? "/dashboard" : "/"} className="flex items-center space-x-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-foreground">YIMA</span>
          </Link>

          {user ? (
            <div className="flex items-center space-x-4">
              {/* Navigation Items */}
              <nav className="hidden md:flex items-center space-x-1">
                {navItems.map((item) => (
                  <Button
                    key={item.to}
                    variant={isActive(item.to) ? "default" : "ghost"}
                    size="sm"
                    asChild
                  >
                    <Link to={item.to} className="flex items-center space-x-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </Button>
                ))}
              </nav>

              <LanguageSwitcher />
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">{t('logout')}</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <Button
                variant="ghost"
                onClick={() => navigate('/auth')}
              >
                Sign In
              </Button>
              <Button
                onClick={() => navigate('/auth')}
              >
                Sign Up
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}