import React, { useState } from 'react';
import { Bell, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

// Sample notification data - in a real app, this would come from an API
const sampleNotifications = [
  {
    id: 1,
    title: 'Low Stock Alert',
    message: 'Product "Premium Widget XL" is running low on stock.',
    timestamp: new Date(Date.now() - 3600000 * 2),
    read: false,
    type: 'alert'
  },
  {
    id: 2,
    title: 'New Sale',
    message: 'New order #12345 has been placed on your marketplace.',
    timestamp: new Date(Date.now() - 3600000 * 5),
    read: false,
    type: 'info'
  },
  {
    id: 3,
    title: 'Inventory Updated',
    message: 'Product "Deluxe Package" quantity has been updated.',
    timestamp: new Date(Date.now() - 3600000 * 24),
    read: false,
    type: 'success'
  }
];

interface NotificationsDropdownProps {}

export default function NotificationsDropdown(): React.JSX.Element {
  const [notifications, setNotifications] = useState(sampleNotifications);
  const [open, setOpen] = useState(false);
  
  const unreadCount = notifications.filter(notification => !notification.read).length;
  
  const markAsRead = (id: number) => {
    setNotifications(notifications.map(notification => 
      notification.id === id ? { ...notification, read: true } : notification
    ));
  };
  
  const markAllAsRead = () => {
    setNotifications(notifications.map(notification => ({ ...notification, read: true })));
  };
  
  const deleteNotification = (id: number) => {
    setNotifications(notifications.filter(notification => notification.id !== id));
  };
  
  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
    }
  };
  
  const getNotificationTypeStyles = (type: string, read: boolean) => {
    let bgColor = '';
    let borderColor = '';
    
    if (type === 'alert') {
      bgColor = read ? 'bg-red-50 dark:bg-red-950/20' : 'bg-red-100 dark:bg-red-950/30';
      borderColor = 'border-l-red-500';
    } else if (type === 'success') {
      bgColor = read ? 'bg-green-50 dark:bg-green-950/20' : 'bg-green-100 dark:bg-green-950/30';
      borderColor = 'border-l-green-500';
    } else {
      bgColor = read ? 'bg-blue-50 dark:bg-blue-950/20' : 'bg-blue-100 dark:bg-blue-950/30';
      borderColor = 'border-l-blue-500';
    }
    
    return { bgColor, borderColor };
  };
  
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <div className="relative">
          <button 
            className="rounded-full p-2 bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full text-xs flex items-center justify-center bg-primary text-primary-foreground">
              {unreadCount}
            </div>
          )}
        </div>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-medium text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[300px]">
          {notifications.length > 0 ? (
            <div className="py-1">
              {notifications.map((notification) => {
                const { bgColor, borderColor } = getNotificationTypeStyles(
                  notification.type, 
                  notification.read
                );
                
                return (
                  <div 
                    key={notification.id}
                    className={`flex border-l-4 ${borderColor} ${bgColor} p-3 mb-1 mx-1 rounded-sm relative`}
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h4 className={`text-sm font-medium ${
                          notification.read 
                            ? 'text-muted-foreground' 
                            : 'text-foreground'
                        }`}>
                          {notification.title}
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(notification.timestamp)}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 ${
                        notification.read 
                          ? 'text-muted-foreground' 
                          : 'text-foreground/80'
                      }`}>
                        {notification.message}
                      </p>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      className="absolute top-2 right-2 opacity-60 hover:opacity-100 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          )}
        </ScrollArea>
        
        <div className="p-2 border-t border-border text-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs w-full"
            onClick={() => setOpen(false)}
          >
            View all notifications
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}