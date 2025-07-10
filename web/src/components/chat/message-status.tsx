"use client";

import React from "react";
import { Check, CheckCheck, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MessageStatus as MessageStatusType } from "@/types/message";

interface MessageStatusProps {
  status: MessageStatusType;
  className?: string;
}

export function MessageStatus({ status, className }: MessageStatusProps) {
  const getStatusIcon = () => {
    switch (status) {
      case "sent":
        return <Check className="h-3 w-3" />;
      case "delivered":
        return <CheckCheck className="h-3 w-3" />;
      case "read":
        return <CheckCheck className="h-3 w-3 text-blue-300" />;
      case "failed":
        return <AlertCircle className="h-3 w-3 text-red-400" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  return (
    <span className={cn("inline-flex", className)}>{getStatusIcon()}</span>
  );
}
