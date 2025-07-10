"use client";

import React from "react";
import { MessageCircle, Users, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NewChatDialog } from "@/components/chat/new-chat-dialog";
import { useAuth } from "@/hooks/use-auth";

export default function ChatDashboard() {
  const { user } = useAuth();

  const features = [
    {
      icon: MessageCircle,
      title: "Real-time Messaging",
      description:
        "Send and receive messages instantly with read receipts and typing indicators.",
    },
    {
      icon: Users,
      title: "Group Chats",
      description:
        "Create group conversations with multiple participants and manage permissions.",
    },
    {
      icon: Zap,
      title: "Fast & Reliable",
      description:
        "Lightning-fast message delivery with offline support and message sync.",
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description:
        "End-to-end encryption ensures your conversations remain private.",
    },
  ];

  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-gray-900/50 dark:to-gray-800/50">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        {/* Welcome Section */}
        <div className="space-y-4">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <MessageCircle className="h-10 w-10 text-white" />
          </div>

          <h1 className="text-4xl font-bold text-foreground">
            Welcome to ChatApp{user?.firstName && `, ${user.firstName}`}!
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Connect with friends, family, and colleagues through secure,
            real-time messaging. Start a conversation or create a group chat to
            get started.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <NewChatDialog
            trigger={
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                <MessageCircle className="h-5 w-5 mr-2" />
                Start New Chat
              </Button>
            }
          />

          <Button variant="outline" size="lg">
            <Users className="h-5 w-5 mr-2" />
            Browse Contacts
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="border-2 border-border/50 hover:border-blue-200 dark:hover:border-blue-800 transition-colors"
              >
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
