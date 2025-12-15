import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, User, Menu, BookOpen, BarChart3, Settings, CreditCard, Shield, ChevronDown, Moon, Sun, Share2, Search, MessageCircle } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { NotificationBell } from '@/components/notifications/NotificationBell';

// Header component for YIMA platform
export default function Header() {
  const { user, signOut } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    setIsDarkMode(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    if (user) {
      checkAdminStatus();
      fetchProfile();
    } else {
      setIsAdmin(false);
      setProfile(null);
    }
  }, [user]);

  const checkAdminStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('is_admin', {
        user_id: user?.id
      });
      
      if (error) throw error;
      setIsAdmin(data === true);
    } catch (error) {
      setIsAdmin(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, profile_photo_url')
        .eq('id', user?.id)
        .single();
      
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const navItems = [
    { to: '/dashboard', icon: BarChart3, label: t('dashboard') },
    { to: '/subscriptions', icon: CreditCard, label: 'Subscriptions' },
    { to: '/affiliate', icon: Share2, label: language === 'fr' ? 'Affiliation' : 'Affiliate' },
    { to: '/settings', icon: Settings, label: t('settings') },
  ];

  if (isAdmin) {
    navItems.push({ to: '/admin', icon: Shield, label: 'Admin' });
  }

  const getUserInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`;
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  const getUserDisplayName = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return user?.email || 'User';
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="border-b border-border/50 bg-primary/10 shadow-sm backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-6">
            <Link to="/" className="flex items-center space-x-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-foreground">YIMA</span>
            </Link>
            
            {/* Prominent Exams link - always visible */}
            <Button
              variant={isActive('/exams') ? "default" : "ghost"}
              size="sm"
              asChild
              className="hidden md:flex"
            >
              <Link to="/exams" className="flex items-center space-x-2">
                <BookOpen className="h-4 w-4" />
                <span>{t('exams')}</span>
              </Link>
            </Button>
            
            {/* Browse All Exams link */}
            <Button
              variant={isActive('/exams2') ? "default" : "ghost"}
              size="sm"
              asChild
              className="hidden md:flex"
            >
              <Link to="/exams2" className="flex items-center space-x-2">
                <Search className="h-4 w-4" />
                <span>{language === 'fr' ? 'Parcourir' : 'Browse'}</span>
              </Link>
            </Button>
            
            {/* Forum link */}
            <Button
              variant={isActive('/forum') ? "default" : "ghost"}
              size="sm"
              asChild
              className="hidden md:flex"
            >
              <Link to="/forum" className="flex items-center space-x-2">
                <MessageCircle className="h-4 w-4" />
                <span>Forum</span>
              </Link>
            </Button>
            
            {/* Write to Us link */}
            <Button
              variant={isActive('/write-to-us') ? "default" : "ghost"}
              size="sm"
              asChild
              className="hidden md:flex"
            >
              <Link to="/write-to-us">
                <span>{t('write_to_us')}</span>
              </Link>
            </Button>
            
            {/* More dropdown - subtle navigation links */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="hidden lg:flex items-center space-x-1">
                  <Menu className="h-4 w-4" />
                  <span className="text-muted-foreground">{t('more')}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-card border-border z-50">
                <DropdownMenuItem asChild>
                  <Link to="/about" className="cursor-pointer">
                    {t('about')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/contact" className="cursor-pointer">
                    {t('contact_us')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/privacy" className="cursor-pointer text-muted-foreground">
                    {t('privacy_policy')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/terms" className="cursor-pointer text-muted-foreground">
                    {t('terms_of_service')}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {user ? (
            <div className="flex items-center space-x-4">
              {/* Dark Mode Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDarkMode}
                className="h-9 w-9"
              >
                {isDarkMode ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
              
              <LanguageSwitcher />
              
              {/* Notification Bell */}
              <NotificationBell />
              
              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 p-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.profile_photo_url} />
                      <AvatarFallback className="text-sm">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline text-sm font-medium">
                      {getUserDisplayName()}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{getUserDisplayName()}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  
                  {navItems.map((item) => (
                    <DropdownMenuItem key={item.to} asChild>
                      <Link to={item.to} className="flex items-center space-x-2 cursor-pointer">
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="flex items-center space-x-2 cursor-pointer">
                    <LogOut className="h-4 w-4" />
                    <span>{t('logout')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              {/* Dark Mode Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDarkMode}
                className="h-9 w-9"
              >
                {isDarkMode ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
              
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