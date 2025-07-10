"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Send,
  Paperclip,
  Mic,
  MicOff,
  Smile,
  X,
  Image,
  FileText,
  Camera,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { MessageWithUser } from "@/types/message";

interface MessageInputProps {
  onSendMessage?: (content: string, replyToId?: string) => void;
  onSendMedia?: (file: File, content?: string, replyToId?: string) => void;
  onStartTyping?: () => void;
  onStopTyping?: () => void;
  disabled?: boolean;
  placeholder?: string;
  replyTo?: MessageWithUser | null;
  onCancelReply?: () => void;
}

const EMOJIS = [
  "😀",
  "😃",
  "😄",
  "😁",
  "😆",
  "😅",
  "😂",
  "🤣",
  "😊",
  "😇",
  "🙂",
  "🙃",
  "😉",
  "😌",
  "😍",
  "🥰",
  "😘",
  "😗",
  "😙",
  "😚",
  "😋",
  "😛",
  "😝",
  "😜",
  "🤪",
  "🤨",
  "🧐",
  "🤓",
  "😎",
  "🤩",
];

export function MessageInput({
  onSendMessage,
  onSendMedia,
  onStartTyping,
  onStopTyping,
  disabled,
  placeholder = "Type a message...",
  replyTo,
  onCancelReply,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [message]);

  // Handle typing indicators
  useEffect(() => {
    if (message.trim() && onStartTyping) {
      onStartTyping();

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        onStopTyping?.();
      }, 3000);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, onStartTyping, onStopTyping]);

  const handleSend = () => {
    if (!message.trim() || disabled) return;

    onSendMessage?.(message.trim(), replyTo?.id);
    setMessage("");
    onCancelReply?.();
    onStopTyping?.();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onSendMedia) {
      onSendMedia(file, message.trim() || undefined, replyTo?.id);
      setMessage("");
      onCancelReply?.();
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // Here you would implement actual audio recording
      console.log("Recording started...", stream);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    setRecordingTime(0);

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }

    // Here you would stop recording and send the audio file
    console.log("Recording stopped");
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const insertEmoji = (emoji: string) => {
    setMessage((prev) => prev + emoji);
    textareaRef.current?.focus();
  };

  return (
    <div className="border-t border-border bg-background p-4 space-y-3">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border-l-4 border-l-blue-600">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-blue-600">
              Replying to {replyTo.senderName}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {replyTo.content}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancelReply}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div className="flex items-center justify-center space-x-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-red-600 dark:text-red-400">
            Recording... {formatRecordingTime(recordingTime)}
          </span>
          <Button variant="ghost" size="sm" onClick={stopRecording}>
            <MicOff className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end space-x-2">
        {/* Attachment menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              disabled={disabled}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <Image className="h-4 w-4 mr-2" />
              Photo & Video
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <FileText className="h-4 w-4 mr-2" />
              Document
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <Camera className="h-4 w-4 mr-2" />
              Camera
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Message input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "min-h-[40px] max-h-[120px] resize-none pr-12 py-2",
              "focus-visible:ring-1 focus-visible:ring-blue-600"
            )}
            rows={1}
          />

          {/* Emoji picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                disabled={disabled}
              >
                <Smile className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-2" align="end">
              <div className="grid grid-cols-8 gap-1">
                {EMOJIS.map((emoji, index) => (
                  <button
                    key={index}
                    className="w-8 h-8 text-lg hover:bg-muted rounded transition-colors"
                    onClick={() => insertEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Send/Voice button */}
        {message.trim() ? (
          <Button
            onClick={handleSend}
            disabled={disabled}
            className="shrink-0 bg-blue-600 hover:bg-blue-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            disabled={disabled}
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
          >
            <Mic className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
