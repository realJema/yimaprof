import { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { NotificationModal } from '@/components/notifications/NotificationModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCheck, Trash2, Bell } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function Notifications() {
  const { t } = useLanguage();
  const {
    notifications,
    loading,
    hasMore,
    markAllAsRead,
    deleteNotification,
    loadMore,
    markAsRead,
  } = useNotifications();
  
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const handleNotificationClick = (notification: Notification) => {
    setSelectedNotification(notification);
    setModalOpen(true);
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread' && n.is_read) return false;
    if (filter === 'read' && !n.is_read) return false;
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    return true;
  });

  const notificationTypes = [
    { value: 'all', label: t('allTypes') || 'All Types' },
    { value: 'subscription_expiry', label: t('subscriptionExpiry') || 'Subscription Expiry' },
    { value: 'payment_confirmed', label: t('paymentConfirmed') || 'Payment Confirmed' },
    { value: 'admin_message', label: t('adminMessage') || 'Admin Message' },
    { value: 'account_activity', label: t('accountActivity') || 'Account Activity' },
  ];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold text-foreground">
                {t('notifications')}
              </CardTitle>
              <div className="flex gap-2">
                {notifications.some(n => !n.is_read) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={markAllAsRead}
                    className="gap-2"
                  >
                    <CheckCheck className="h-4 w-4" />
                    {t('markAllRead')}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="mb-4">
              <TabsList className="grid w-full grid-cols-3 bg-muted">
                <TabsTrigger value="all">{t('allNotifications')}</TabsTrigger>
                <TabsTrigger value="unread">{t('unreadNotifications')}</TabsTrigger>
                <TabsTrigger value="read">{t('readNotifications')}</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="mb-4">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {notificationTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <Separator className="mb-4" />

            {loading && notifications.length === 0 ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-3 p-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <Bell className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">{t('noNotifications')}</p>
                <p className="text-sm mt-2">{t('noNotificationsDesc')}</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
                  {filteredNotifications.map((notification) => (
                    <div key={notification.id} className="relative group">
                      <NotificationItem
                        notification={notification}
                        onClick={() => handleNotificationClick(notification)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>

                {hasMore && (
                  <div className="mt-6 text-center">
                    <Button
                      variant="outline"
                      onClick={loadMore}
                      disabled={loading}
                      className="w-full sm:w-auto"
                    >
                      {loading ? t('loading') : t('loadMore')}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <NotificationModal
        notification={selectedNotification}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedNotification(null);
        }}
      />
    </Layout>
  );
}
