'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  MessageCircle, 
  Users, 
  Settings, 
  Archive,
  Star,
  Phone
} from 'lucide-react';

interface MobileNavProps {
  activeTab?: string;
  unreadCount?: number;
  onTabChange?: (tab: string) => void;
  className?: string;
}

const navItems = [
  {
    id: 'chats',
    label: 'Chats',
    icon: MessageCircle,
    badge: true
  },
  {
    id: 'contacts',
    label: 'Contacts',
    icon: Users,
    badge: false
  },
  {
    id: 'calls',
    label: 'Calls',
    icon: Phone,
    badge: false
  },
  {
    id: 'archived',
    label: 'Archived',
    icon: Archive,
    badge: false
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    badge: false
  }
];

export function MobileNav({ 
  activeTab = 'chats', 
  unreadCount = 0, 
  onTabChange,
  className 
}: MobileNavProps) {
  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border",
      className
    )}>
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              className={cn(
                "flex flex-col items-center space-y-1 h-auto py-2 px-3 min-w-0",
                isActive && "text-blue-600"
              )}
              onClick={() => onTabChange?.(item.id)}
            >
              <div className="relative">
                <Icon className={cn(
                  "h-5 w-5",
                  isActive && "text-blue-600"
                )} />
                {item.badge && unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-4 w-4 text-xs p-0 flex items-center justify-center"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </div>
              <span className={cn(
                "text-xs font-medium",
                isActive && "text-blue-600"
              )}>
                {item.label}
              </span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}