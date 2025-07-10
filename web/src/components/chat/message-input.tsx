// src/components/chat/message-input.tsx
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Paperclip,
  Smile,
  Mic,
  X,
  Image,
  FileText,
  Video,
  Plus,
  Square,
  Pause,
  Play,
} from "lucide-react";
import { useMessages } from "@/hooks/use-messages";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, getInitials, formatDuration } from "@/lib/utils";
import type { MessageWithUser } from "@/types/message";

interface MessageInputProps {
  chatId: string;
  replyTo?: MessageWithUser | null;
  onReplyCancel?: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

interface VoiceRecording {
  isRecording: boolean;
  duration: number;
  mediaRecorder?: MediaRecorder;
  audioChunks: Blob[];
}

export function MessageInput({
  chatId,
  replyTo,
  onReplyCancel,
  disabled = false,
  placeholder = "Type a message...",
  className,
}: MessageInputProps) {
  const { user } = useAuth();
  const {
    sendTextMessage,
    sendMediaMessage,
    startTyping,
    stopTyping,
    isUploading,
  } = useMessages();

  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [voiceRecording, setVoiceRecording] = useState<VoiceRecording>({
    isRecording: false,
    duration: 0,
    audioChunks: [],
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  // Handle typing indicators
  useEffect(() => {
    if (message.trim() && !isTyping) {
      setIsTyping(true);
      startTyping(chatId);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        stopTyping(chatId);
      }
    }, 3000);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, chatId, startTyping, stopTyping, isTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isTyping) {
        stopTyping(chatId);
      }
    };
  }, [chatId, stopTyping, isTyping]);

  const handleSendMessage = useCallback(async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage && attachments.length === 0) return;

    try {
      // Send text message if there's content
      if (trimmedMessage) {
        await sendTextMessage(chatId, trimmedMessage, replyTo?.id);
      }

      // Send attachments
      for (const file of attachments) {
        await sendMediaMessage(file, chatId, "", replyTo?.id);
      }

      // Clear input
      setMessage("");
      setAttachments([]);
      onReplyCancel?.();

      // Stop typing indicator
      if (isTyping) {
        setIsTyping(false);
        stopTyping(chatId);
      }

      // Focus back to textarea
      textareaRef.current?.focus();
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  }, [
    message,
    attachments,
    chatId,
    replyTo,
    sendTextMessage,
    sendMediaMessage,
    onReplyCancel,
    isTyping,
    stopTyping,
  ]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files).filter((file) => {
      // Check file size (100MB limit)
      if (file.size > 100 * 1024 * 1024) {
        console.error(`File ${file.name} is too large`);
        return false;
      }
      return true;
    });

    setAttachments((prev) => [...prev, ...newFiles]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        const audioFile = new File([audioBlob], "voice-message.webm", {
          type: "audio/webm",
        });

        try {
          await sendMediaMessage(audioFile, chatId);
        } catch (error) {
          console.error("Failed to send voice message:", error);
        }

        // Cleanup
        stream.getTracks().forEach((track) => track.stop());
        setVoiceRecording({
          isRecording: false,
          duration: 0,
          audioChunks: [],
        });
      };

      mediaRecorder.start();

      setVoiceRecording({
        isRecording: true,
        duration: 0,
        mediaRecorder,
        audioChunks,
      });

      // Start duration counter
      recordingIntervalRef.current = setInterval(() => {
        setVoiceRecording((prev) => ({
          ...prev,
          duration: prev.duration + 1,
        }));
      }, 1000);
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  };

  const stopVoiceRecording = () => {
    if (voiceRecording.mediaRecorder) {
      voiceRecording.mediaRecorder.stop();
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
  };

  const cancelVoiceRecording = () => {
    if (voiceRecording.mediaRecorder) {
      voiceRecording.mediaRecorder.stop();
    }
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }

    setVoiceRecording({
      isRecording: false,
      duration: 0,
      audioChunks: [],
    });
  };

  const canSend = message.trim().length > 0 || attachments.length > 0;

  return (
    <div className={cn("flex flex-col bg-background border-t", className)}>
      {/* Reply indicator */}
      {replyTo && (
        <div className="flex items-center gap-3 p-3 bg-accent/50 border-b">
          <div className="w-1 h-12 bg-primary rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-primary">
              Replying to {replyTo.sender.firstName} {replyTo.sender.lastName}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {replyTo.content}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onReplyCancel}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="flex gap-2 p-3 overflow-x-auto">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="relative flex-shrink-0 w-20 h-20 bg-accent rounded-lg flex items-center justify-center"
            >
              {file.type.startsWith("image/") ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <FileText className="h-8 w-8 text-muted-foreground" />
              )}
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6"
                onClick={() => removeAttachment(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Voice recording UI */}
      {voiceRecording.isRecording && (
        <div className="flex items-center gap-3 p-4 bg-accent/50">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">
              Recording {formatDuration(voiceRecording.duration)}
            </span>
          </div>

          <div className="flex-1" />

          <Button variant="ghost" size="icon" onClick={cancelVoiceRecording}>
            <X className="h-4 w-4" />
          </Button>

          <Button variant="default" size="icon" onClick={stopVoiceRecording}>
            <Square className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Main input area */}
      <div className="flex items-end gap-2 p-3">
        {/* Attachment menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={disabled || voiceRecording.isRecording}
              className="flex-shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top">
            <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
              <Image className="h-4 w-4 mr-2" />
              Photo
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => videoInputRef.current?.click()}>
              <Video className="h-4 w-4 mr-2" />
              Video
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <FileText className="h-4 w-4 mr-2" />
              Document
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Text input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              voiceRecording.isRecording ? "Recording..." : placeholder
            }
            disabled={disabled || voiceRecording.isRecording}
            className="min-h-[40px] max-h-[120px] resize-none pr-12"
            rows={1}
          />

          {/* Emoji button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 bottom-1 h-8 w-8"
            disabled={disabled || voiceRecording.isRecording}
          >
            <Smile className="h-4 w-4" />
          </Button>
        </div>

        {/* Send/Mic button */}
        {canSend ? (
          <Button
            onClick={handleSendMessage}
            disabled={disabled || isUploading}
            className="flex-shrink-0"
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onMouseDown={startVoiceRecording}
                disabled={disabled}
                className="flex-shrink-0"
                size="icon"
                variant={voiceRecording.isRecording ? "destructive" : "default"}
              >
                <Mic className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Hold to record voice message</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      <input
        ref={imageInputRef}
        type="file"
        className="hidden"
        multiple
        accept="image/*"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      <input
        ref={videoInputRef}
        type="file"
        className="hidden"
        multiple
        accept="video/*"
        onChange={(e) => handleFileSelect(e.target.files)}
      />
    </div>
  );
}
