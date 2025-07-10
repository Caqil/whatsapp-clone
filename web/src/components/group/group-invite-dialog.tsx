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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Link,
  Copy,
  Share,
  Trash2,
  Plus,
  Calendar,
  Users,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import type { GroupInvite, CreateInviteRequest } from "@/types/group";

interface GroupInviteDialogProps {
  groupId: string;
  trigger: React.ReactNode;
}

export function GroupInviteDialog({
  groupId,
  trigger,
}: GroupInviteDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState<CreateInviteRequest>({
    maxUses: 0, // 0 means unlimited
    requiresApproval: false,
  });

  const {
    invites,
    isLoading,
    error,
    loadGroupInvites,
    createInvite,
    revokeInvite,
  } = useGroupManagement();

  useEffect(() => {
    if (isOpen) {
      loadGroupInvites(groupId);
    }
  }, [isOpen, groupId, loadGroupInvites]);

  const handleCreateInvite = async () => {
    try {
      await createInvite(groupId, createForm);
      setShowCreateForm(false);
      setCreateForm({
        maxUses: 0,
        requiresApproval: false,
      });
      // Reload invites
      await loadGroupInvites(groupId);
      toast.success("Invite created successfully");
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      await revokeInvite(groupId, inviteId);
      toast.success("Invite revoked successfully");
    } catch (error) {
      // Error is already handled in the hook
    }
  };

  const handleCopyInvite = (inviteLink: string) => {
    navigator.clipboard.writeText(inviteLink);
    toast.success("Invite link copied to clipboard");
  };

  const handleShareInvite = (inviteLink: string) => {
    if (navigator.share) {
      navigator.share({
        title: "Join our group",
        text: "You have been invited to join our group",
        url: inviteLink,
      });
    } else {
      handleCopyInvite(inviteLink);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Group Invites
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Create New Invite */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Invite Links</h3>
              <Button
                onClick={() => setShowCreateForm(!showCreateForm)}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New
              </Button>
            </div>

            {showCreateForm && (
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle>Create New Invite</CardTitle>
                  <CardDescription>
                    Configure your invite link settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="maxUses">
                        Maximum uses (0 for unlimited)
                      </Label>
                      <Input
                        id="maxUses"
                        type="number"
                        min="0"
                        value={createForm.maxUses}
                        onChange={(e) =>
                          setCreateForm((prev) => ({
                            ...prev,
                            maxUses: parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expiresAt">Expires at (optional)</Label>
                      <Input
                        id="expiresAt"
                        type="datetime-local"
                        value={createForm.expiresAt || ""}
                        onChange={(e) =>
                          setCreateForm((prev) => ({
                            ...prev,
                            expiresAt: e.target.value || undefined,
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="requiresApproval"
                        checked={createForm.requiresApproval}
                        onCheckedChange={(checked) =>
                          setCreateForm((prev) => ({
                            ...prev,
                            requiresApproval: checked,
                          }))
                        }
                      />
                      <Label htmlFor="requiresApproval">
                        Require admin approval
                      </Label>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleCreateInvite} disabled={isLoading}>
                        {isLoading ? "Creating..." : "Create Invite"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowCreateForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Separator />

          {/* Existing Invites */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Active Invites</h3>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : invites.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No active invites. Create one to get started.
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {invites.map((invite) => (
                    <Card key={invite.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">
                                {invite.currentUses}/{invite.maxUses || "∞"}{" "}
                                uses
                              </Badge>
                              {invite.requiresApproval && (
                                <Badge variant="secondary">
                                  Requires Approval
                                </Badge>
                              )}
                              {invite.expiresAt && (
                                <Badge variant="outline">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Expires {formatDate(invite.expiresAt)}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <code className="text-sm bg-muted px-2 py-1 rounded">
                                {invite.inviteCode}
                              </code>
                              <p className="text-sm text-muted-foreground">
                                Created {formatDate(invite.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleCopyInvite(invite.inviteLink)
                              }
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                handleShareInvite(invite.inviteLink)
                              }
                            >
                              <Share className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRevokeInvite(invite.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
