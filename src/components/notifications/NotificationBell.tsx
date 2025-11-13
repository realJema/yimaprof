import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from './NotificationItem';
import { NotificationModal } from './NotificationModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export const NotificationBell = () => {
  const { notifications, unreadCount, loading, markAsRead } = useNotifications();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const recentNotifications = notifications.slice(0, 5);

  const handleNotificationClick = (notification: any) => {
    setSelectedNotification(notification);
    setModalOpen(true);
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    setOpen(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-80 p-0 bg-background border-border shadow-lg" 
          align="end"
          sideOffset={8}
        >
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">{t('notifications')}</h3>
            {unreadCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {unreadCount} {t('unreadNotifications')}
              </span>
            )}
          </div>
          
          <ScrollArea className="h-[400px]">
            {loading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentNotifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">{t('noNotifications')}</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={() => handleNotificationClick(notification)}
                    compact
                  />
                ))}
              </div>
            )}
          </ScrollArea>

          {!loading && notifications.length > 0 && (
            <>
              <Separator />
              <div className="p-2">
                <Link to="/notifications" onClick={() => setOpen(false)}>
                  <Button variant="ghost" className="w-full text-primary">
                    {t('viewAllNotifications')}
                  </Button>
                </Link>
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>

      <NotificationModal
        notification={selectedNotification}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedNotification(null);
        }}
      />
    </>
  );
};
