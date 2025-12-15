import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { BookOpen, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FooterProps {
  className?: string;
}

export default function Footer({ className }: FooterProps = {}) {
  const {
    t
  } = useLanguage();
  const platformLinks = [{
    label: t('exams'),
    href: '/exams'
  }, {
    label: t('dashboard'),
    href: '/dashboard'
  }, {
    label: 'Subscriptions',
    href: '/subscriptions'
  }];
  const companyLinks = [{
    label: t('about_us'),
    href: '/about'
  }, {
    label: t('contact'),
    href: '/contact'
  }, {
    label: t('write_to_us'),
    href: '/write-to-us'
  }, {
    label: t('privacy_policy'),
    href: '/privacy'
  }, {
    label: t('terms_of_service'),
    href: '/terms'
  }];
  const sectionLinks = [{
    label: t('francophone'),
    href: '/exams?section=francophone'
  }, {
    label: t('anglophone'),
    href: '/exams?section=anglophone'
  }];
  const socialLinks = [{
    icon: Facebook,
    href: 'https://facebook.com/yima',
    label: 'Facebook'
  }, {
    icon: Twitter,
    href: 'https://twitter.com/yima',
    label: 'Twitter'
  }, {
    icon: Instagram,
    href: 'https://instagram.com/yima',
    label: 'Instagram'
  }, {
    icon: Youtube,
    href: 'https://youtube.com/yima',
    label: 'YouTube'
  }];
  return <footer className={cn("bg-primary/5 border-t border-border/50 backdrop-blur-sm", className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-foreground">YIMA</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {t('about_yima')}
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>Cameroon, Central Africa</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>support@yima.edu</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>+237 6XX XXX XXX</span>
              </div>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">{t('platform')}</h3>
            <ul className="space-y-2">
              {platformLinks.map((link, index) => <li key={index}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>)}
            </ul>
          </div>

          {/* Sections */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Sections</h3>
            <ul className="space-y-2">
              {sectionLinks.map((link, index) => <li key={index}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>)}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">{t('company')}</h3>
            <ul className="space-y-2">
              {companyLinks.map((link, index) => <li key={index}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>)}
            </ul>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="py-8 border-t border-border">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t('stay_updated')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('newsletter_desc')}
              </p>
            </div>
            <div className="flex gap-2">
              <input type="email" placeholder={t('enter_email')} className="flex-1 px-4 py-2 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              <button className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                {t('subscribe')}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="py-6 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground">
            © 2024 YIMA. {t('rights_reserved')}
          </div>
          
          {/* Social Links */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{t('follow_us')}:</span>
            <div className="flex gap-3">
              {socialLinks.map((social, index) => <a key={index} href={social.href} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" aria-label={social.label}>
                  <social.icon className="h-5 w-5" />
                </a>)}
            </div>
          </div>
        </div>
      </div>
    </footer>;
}