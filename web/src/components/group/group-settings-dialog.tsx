"use client";

import { useState, useEffect } from "react";
import { useGroupManagement } from "@/hooks/use-group-management";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Settings, Users, MessageSquare, UserPlus, Clock } from "lucide-react";
import { toast } from "sonner";
import type { GroupSettings } from "@/types/group";

interface GroupSettingsDialogProps {
  groupId: string;
  trigger: React.ReactNode;
  currentSettings?: GroupSettings;
}

export function GroupSettingsDialog({
  groupId,
  trigger,
  currentSettings,
}: GroupSettingsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<GroupSettings>({
    whoCanSendMessages: "everyone",
    whoCanEditInfo: "admins",
    whoCanAddMembers: "admins",
    disappearingMessages: false,
    disappearingTime: 604800, // 1 week in seconds
  });

  const { updateGroupSettings, isLoading, error } = useGroupManagement();

  useEffect(() => {
    if (currentSettings) {
      setSettings(currentSettings);
    }
  }, [currentSettings]);

  const handleSave = async () => {
    try {
      await updateGroupSettings(groupId, settings);
      setIsOpen(false);
      toast.success("Group settings updated successfully");
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const handleSettingChange = (key: keyof GroupSettings, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const disappearingTimeOptions = [
    { value: 3600, label: "1 Hour" },
    { value: 86400, label: "24 Hours" },
    { value: 604800, label: "7 Days" },
    { value: 2629746, label: "30 Days" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Group Settings
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Messaging Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Messaging Permissions
              </CardTitle>
              <CardDescription>
                Control who can send messages in this group
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="whoCanSendMessages">
                    Who can send messages
                  </Label>
                  <Select
                    value={settings.whoCanSendMessages}
                    onValueChange={(value) =>
                      handleSettingChange("whoCanSendMessages", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="everyone">Everyone</SelectItem>
                      <SelectItem value="admins">Only Admins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Group Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Group Management
              </CardTitle>
              <CardDescription>
                Control who can manage group information and members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="whoCanEditInfo">
                    Who can edit group info
                  </Label>
                  <Select
                    value={settings.whoCanEditInfo}
                    onValueChange={(value) =>
                      handleSettingChange("whoCanEditInfo", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="everyone">Everyone</SelectItem>
                      <SelectItem value="admins">Only Admins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whoCanAddMembers">Who can add members</Label>
                  <Select
                    value={settings.whoCanAddMembers}
                    onValueChange={(value) =>
                      handleSettingChange("whoCanAddMembers", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="everyone">Everyone</SelectItem>
                      <SelectItem value="admins">Only Admins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Disappearing Messages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Disappearing Messages
              </CardTitle>
              <CardDescription>
                Messages will automatically disappear after the specified time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="disappearingMessages"
                    checked={settings.disappearingMessages}
                    onCheckedChange={(checked) =>
                      handleSettingChange("disappearingMessages", checked)
                    }
                  />
                  <Label htmlFor="disappearingMessages">
                    Enable disappearing messages
                  </Label>
                </div>

                {settings.disappearingMessages && (
                  <div className="space-y-2">
                    <Label htmlFor="disappearingTime">Disappear after</Label>
                    <Select
                      value={settings.disappearingTime?.toString()}
                      onValueChange={(value) =>
                        handleSettingChange("disappearingTime", parseInt(value))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {disappearingTimeOptions.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value.toString()}
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
