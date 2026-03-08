import { formatDistanceToNow } from 'date-fns';
import { X, ExternalLink } from 'lucide-react';
import { Notification } from '@/hooks/useNotifications';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

interface NotificationModalProps {
  notification: Notification | null;
  open: boolean;
  onClose: () => void;
}

export const NotificationModal = ({ notification, open, onClose }: NotificationModalProps) => {
  const navigate = useNavigate();

  if (!notification) return null;

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { addSuffix: true });

  const handleAction = () => {
    if (notification.action_url) {
      navigate(notification.action_url);
      onClose();
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'normal':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-background border-border">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <DialogTitle className="text-xl font-semibold text-foreground pr-8">
              {notification.title}
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Badge variant={getPriorityColor(notification.priority)}>
              {notification.priority}
            </Badge>
            <Badge variant="outline">{notification.type.replace('_', ' ')}</Badge>
          </div>
          
          <div className="text-sm text-muted-foreground">
            {timeAgo}
          </div>

          <div className="prose prose-sm max-w-none">
            <p className="text-foreground whitespace-pre-wrap">{notification.message}</p>
          </div>


          <div className="flex gap-2 pt-4">
            {notification.action_url && (
              <Button onClick={handleAction} className="flex-1">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Details
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
