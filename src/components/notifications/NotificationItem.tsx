import { formatDistanceToNow } from 'date-fns';
import { Bell, CreditCard, AlertCircle, MessageSquare } from 'lucide-react';
import { Notification } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
  compact?: boolean;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'subscription_expiry':
      return <AlertCircle className="h-5 w-5 text-orange-500" />;
    case 'payment_confirmed':
      return <CreditCard className="h-5 w-5 text-green-500" />;
    case 'admin_message':
      return <MessageSquare className="h-5 w-5 text-blue-500" />;
    case 'account_activity':
      return <Bell className="h-5 w-5 text-purple-500" />;
    default:
      return <Bell className="h-5 w-5 text-muted-foreground" />;
  }
};

export const NotificationItem = ({ notification, onClick, compact = false }: NotificationItemProps) => {
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });
  
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex gap-3 p-3 cursor-pointer transition-colors hover:bg-accent/50",
        !notification.is_read && "bg-primary/5",
        compact && "p-2"
      )}
    >
      <div className="flex-shrink-0 mt-1">
        {getNotificationIcon(notification.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className={cn(
            "font-medium text-sm text-foreground",
            !notification.is_read && "font-semibold"
          )}>
            {notification.title}
          </h4>
          {!notification.is_read && (
            <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
          )}
        </div>
        <p className={cn(
          "text-sm text-muted-foreground mt-1",
          compact && "line-clamp-2"
        )}>
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground mt-2">{timeAgo}</p>
      </div>
    </div>
  );
};
