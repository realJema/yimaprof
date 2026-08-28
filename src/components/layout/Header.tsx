import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, User, Menu, BookOpen, BarChart3, Settings, CreditCard, Shield, ChevronDown, Moon, Sun, Share2, Search, MessageCircle, X, Mail, Info, FileText, School } from 'lucide-react';
import { useEstablishment } from '@/hooks/useEstablishment';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Logo } from '@/components/ui/logo';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Separator } from '@/components/ui/separator';

// Header component for YIMA platform
export default function Header() {
  const {
    user,
    signOut
  } = useAuth();
  const {
    t,
    language
  } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { establishment, isSchoolAdmin } = useEstablishment();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || !savedTheme && prefersDark;
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
      checkEditorStatus();
      fetchProfile();
    } else {
      setIsAdmin(false);
      setIsEditor(false);
      setProfile(null);
    }
  }, [user]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);
  const checkAdminStatus = async () => {
    try {
      const {
        data,
        error
      } = await supabase.rpc('is_admin', {
        user_id: user?.id
      });
      if (error) throw error;
      setIsAdmin(data === true);
    } catch (error) {
      setIsAdmin(false);
    }
  };
  const checkEditorStatus = async () => {
    try {
      const {
        data,
        error
      } = await supabase.rpc('has_role', {
        _user_id: user?.id,
        _role: 'editor'
      });
      if (error) throw error;
      setIsEditor(data === true);
    } catch (error) {
      setIsEditor(false);
    }
  };
  const fetchProfile = async () => {
    try {
      const {
        data
      } = await supabase.from('profiles').select('first_name, last_name, profile_photo_url').eq('id', user?.id).single();
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };
  const handleSignOut = async () => {
    await signOut();
    setMobileMenuOpen(false);
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
  const navItems = [];
  // School profiles use the school space instead of the personal dashboard
  if (!isSchoolAdmin) {
    navItems.push({
      to: '/dashboard',
      icon: BarChart3,
      label: t('dashboard')
    });
    navItems.push({
      to: '/progress',
      icon: TrendingUp,
      label: language === 'fr' ? 'Ma progression' : 'My progress'
    });
  }

  if (isSchoolAdmin) {
    navItems.push({
      to: '/school',
      icon: School,
      label: language === 'fr' ? 'Espace École' : 'School Space'
    });
  }
  // Schools manage students, not personal subscriptions
  if (!isSchoolAdmin || isAdmin) {
    navItems.push({
      to: '/subscriptions',
      icon: CreditCard,
      label: language === 'fr' ? 'Abonnements' : 'Subscriptions'
    });
  }
  navItems.push({
    to: '/affiliate',
    icon: Share2,
    label: language === 'fr' ? 'Affiliation' : 'Affiliate'
  }, {
    to: '/settings',
    icon: Settings,
    label: t('settings')
  });
  if (isAdmin) {
    navItems.push({
      to: '/admin',
      icon: Shield,
      label: 'Admin'
    });
  }
  if (isEditor && !isAdmin) {
    navItems.push({
      to: '/admin/exams',
      icon: FileText,
      label: language === 'fr' ? 'Éditeur' : 'Editor'
    });
  }

  // Mobile navigation links
  const mobileNavLinks = [{
    to: '/exams',
    icon: BookOpen,
    label: t('exams')
  }, {
    to: '/exams2',
    icon: Search,
    label: language === 'fr' ? 'Épreuves' : 'Papers'
  }, {
    to: '/lessons',
    icon: BookOpen,
    label: language === 'fr' ? 'Leçons' : 'Lessons'
  }, {
    to: '/schools',
    icon: Info,
    label: language === 'fr' ? 'Établissements' : 'Schools'
  }, {
    to: '/forum',
    icon: MessageCircle,
    label: 'Forum'
  }, {
    to: '/write-to-us',
    icon: Mail,
    label: t('write_to_us')
  }, {
    to: '/about',
    icon: Info,
    label: t('about')
  }, {
    to: '/contact',
    icon: Mail,
    label: t('contact_us')
  }];
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
  return <header className="border-b border-border/50 bg-primary/10 shadow-sm backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-6">
            {/* Mobile Menu Trigger */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 bg-card">
                <SheetHeader className="text-left">
                  <SheetTitle>
                    <Logo size="md" />
                  </SheetTitle>
                </SheetHeader>
                
                <div className="mt-6 space-y-1">
                  {/* Main Navigation */}
                  {mobileNavLinks.map(item => <Link key={item.to} to={item.to} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive(item.to) ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                      <item.icon className="h-4 w-4" />
                      <span className="font-medium">{item.label}</span>
                    </Link>)}
                  
                  <Separator className="my-4" />
                  
                  {/* User Navigation (if logged in) */}
                  {user && <>
                      <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        {language === 'fr' ? 'Mon Compte' : 'My Account'}
                      </p>
                      {navItems.map(item => <Link key={item.to} to={item.to} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive(item.to) ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                          <item.icon className="h-4 w-4" />
                          <span className="font-medium">{item.label}</span>
                        </Link>)}
                      <Separator className="my-4" />
                    </>}
                  
                  {/* Settings Section */}
                  <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {t('settings')}
                  </p>
                  
                  {/* Theme Toggle */}
                  <button onClick={toggleDarkMode} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors">
                    {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    <span className="font-medium">
                      {isDarkMode ? language === 'fr' ? 'Mode clair' : 'Light Mode' : language === 'fr' ? 'Mode sombre' : 'Dark Mode'}
                    </span>
                  </button>
                  
                  {/* Language Toggle */}
                  <button onClick={() => window.dispatchEvent(new CustomEvent('toggle-language'))} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors">
                    <span className="h-4 w-4 flex items-center justify-center text-sm">
                      {language === 'fr' ? '🇬🇧' : '🇫🇷'}
                    </span>
                    <span className="font-medium">{language === 'fr' ? 'English' : 'Français'}</span>
                  </button>
                  
                  <Separator className="my-4" />
                  
                  {/* Legal Links */}
                  <Link to="/privacy" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground text-sm">
                    <FileText className="h-4 w-4" />
                    {t('privacy_policy')}
                  </Link>
                  <Link to="/terms" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground text-sm">
                    <FileText className="h-4 w-4" />
                    {t('terms_of_service')}
                  </Link>
                  
                  {/* Auth Actions */}
                  {user ? <>
                      <Separator className="my-4" />
                      <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
                        <LogOut className="h-4 w-4" />
                        <span className="font-medium">{t('logout')}</span>
                      </button>
                    </> : <>
                      <Separator className="my-4" />
                      <div className="space-y-2 px-3">
                        <Button className="w-full" onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/auth');
                    }}>
                          {t('login')}
                        </Button>
                        <Button variant="outline" className="w-full" onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/auth');
                    }}>
                          {t('register')}
                        </Button>
                      </div>
                    </>}
                </div>
              </SheetContent>
            </Sheet>
            
            <Link to="/" className="flex items-center">
              <Logo size="lg" />
            </Link>
            
            {/* Prominent Exams link - always visible */}
            <Button variant={isActive('/exams') ? "default" : "ghost"} size="sm" asChild className="hidden md:flex">
              
            </Button>
            
            {/* Browse All Exams link */}
            <Button variant={isActive('/exams2') ? "default" : "ghost"} size="sm" asChild className="hidden md:flex">
              <Link to="/exams2" className="flex items-center space-x-2">
                <Search className="h-4 w-4" />
                <span>{language === 'fr' ? 'Épreuves' : 'Papers'}</span>
              </Link>
            </Button>
            
            {/* Forum link */}
            <Button variant={isActive('/lessons') ? "default" : "ghost"} size="sm" asChild className="hidden md:flex">
              <Link to="/lessons" className="flex items-center space-x-2">
                <BookOpen className="h-4 w-4" />
                <span>{language === 'fr' ? 'Leçons' : 'Lessons'}</span>
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
                  <Link to="/forum" className="cursor-pointer flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Forum
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/write-to-us" className="cursor-pointer flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {t('write_to_us')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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

          {user ? <div className="flex items-center space-x-3">
              {/* School account indicator */}
              {isSchoolAdmin && <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link to="/school" className="hidden sm:flex items-center gap-1.5 rounded-full border border-secondary/40 bg-secondary/10 px-2.5 py-1 text-xs font-medium text-secondary">
                        <School className="h-3.5 w-3.5" />
                        <span className="hidden md:inline">{language === 'fr' ? 'École' : 'School'}</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>{establishment?.name || (language === 'fr' ? 'Compte établissement' : 'School account')}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>}

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
                    <ChevronDown className="h-4 w-4 hidden md:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-card border-border z-50" align="end">
                  {profile?.first_name && <>
                      <div className="px-2 py-1.5">
                        <p className="text-sm font-medium">{getUserDisplayName()}</p>
                        {isSchoolAdmin && establishment && <p className="text-xs text-muted-foreground flex items-center gap-1"><School className="h-3 w-3" />{establishment.name}</p>}
                      </div>
                      <DropdownMenuSeparator />
                    </>}
                  
                  {navItems.map(item => <DropdownMenuItem key={item.to} asChild>
                      <Link to={item.to} className="flex items-center space-x-2 cursor-pointer">
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </DropdownMenuItem>)}
                  
                  <DropdownMenuSeparator />
                  
                  {/* Theme Toggle */}
                  <DropdownMenuItem onClick={toggleDarkMode} className="flex items-center space-x-2 cursor-pointer">
                    {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    <span>{isDarkMode ? language === 'fr' ? 'Mode clair' : 'Light Mode' : language === 'fr' ? 'Mode sombre' : 'Dark Mode'}</span>
                  </DropdownMenuItem>
                  
                  {/* Language Toggle */}
                  <DropdownMenuItem onClick={() => {
                window.dispatchEvent(new CustomEvent('toggle-language'));
              }} className="flex items-center space-x-2 cursor-pointer">
                    <span className="h-4 w-4 flex items-center justify-center text-xs font-medium">
                      {language === 'fr' ? '🇬🇧' : '🇫🇷'}
                    </span>
                    <span>{language === 'fr' ? 'English' : 'Français'}</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="flex items-center space-x-2 cursor-pointer text-destructive">
                    <LogOut className="h-4 w-4" />
                    <span>{t('logout')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div> : <div className="flex items-center space-x-3">
              {/* Settings Dropdown for non-logged in users - hidden on mobile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 hidden md:flex">
                    <Settings className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48 bg-card border-border z-50" align="end">
                  {/* Theme Toggle */}
                  <DropdownMenuItem onClick={toggleDarkMode} className="flex items-center space-x-2 cursor-pointer">
                    {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    <span>{isDarkMode ? language === 'fr' ? 'Mode clair' : 'Light Mode' : language === 'fr' ? 'Mode sombre' : 'Dark Mode'}</span>
                  </DropdownMenuItem>
                  
                  {/* Language Toggle */}
                  <DropdownMenuItem onClick={() => {
                window.dispatchEvent(new CustomEvent('toggle-language'));
              }} className="flex items-center space-x-2 cursor-pointer">
                    <span className="h-4 w-4 flex items-center justify-center text-xs font-medium">
                      {language === 'fr' ? '🇬🇧' : '🇫🇷'}
                    </span>
                    <span>{language === 'fr' ? 'English' : 'Français'}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button variant="ghost" onClick={() => navigate('/auth')} className="hidden md:inline-flex">
                {t('login')}
              </Button>
              <Button onClick={() => navigate('/auth')} className="hidden md:inline-flex">
                {t('register')}
              </Button>
            </div>}
        </div>
      </div>
    </header>;
}