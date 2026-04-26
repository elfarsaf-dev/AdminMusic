import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useUsers, useUsage, useSetPremium, useDeleteUser, useResetUsage } from "@/hooks/use-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { 
  ArrowLeft, Crown, Clock, Trash2, RotateCcw, Copy, Calendar, Mail, User, Shield, BarChart3, Activity, Pencil
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EditUserDialog } from "@/components/EditUserDialog";

export default function UserDetail({ params }: { params: { id: string } }) {
  const { id } = params;
  const [, setLocation] = useLocation();
  const { data: users, isLoading: usersLoading } = useUsers();
  const { data: usage, isLoading: usageLoading } = useUsage();
  
  const setPremium = useSetPremium();
  const deleteUser = useDeleteUser();
  const resetUsage = useResetUsage();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const user = useMemo(() => users?.find(u => u.id === id), [users, id]);
  
  const userUsage = useMemo(() => {
    if (!usage) return [];
    return usage.filter(u => u.user_id === id).sort((a, b) => 
      new Date((b.created_at as string) || 0).getTime() - new Date((a.created_at as string) || 0).getTime()
    );
  }, [usage, id]);

  const totalUsage = useMemo(() => {
    return userUsage.reduce((acc, curr) => acc + (Number(curr.count) || 1), 0);
  }, [userUsage]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleDelete = async () => {
    try {
      await deleteUser.mutateAsync({ user_id: id });
      toast.success("User deleted successfully");
      setLocation("/users");
    } catch (e) {
      toast.error("Failed to delete user");
    }
  };

  const handleReset = async () => {
    try {
      await resetUsage.mutateAsync({ user_id: id });
      toast.success("Usage reset successfully");
      setResetOpen(false);
    } catch (e) {
      toast.error("Failed to reset usage");
    }
  };

  if (usersLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Card>
          <CardHeader className="flex flex-row gap-4 items-center">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <User className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold">User Not Found</h2>
        <p className="text-muted-foreground mt-2 mb-6">The user with ID {id} does not exist.</p>
        <Link href="/users">
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Users</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <Link href="/users">
          <Button variant="ghost" className="gap-2 -ml-3 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to Users
          </Button>
        </Link>
        <Button onClick={() => setEditOpen(true)} className="gap-2">
          <Pencil className="h-4 w-4" /> Edit User
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="overflow-hidden border-border shadow-sm">
            <div className="h-24 bg-gradient-to-r from-primary/20 to-accent/20 w-full" />
            <CardHeader className="relative pb-0 pt-0">
              <Avatar className="h-20 w-20 border-4 border-card absolute -top-10">
                <AvatarImage src={user.avatar_url as string} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                  {(user.email as string)?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="pt-12 pb-4">
                <CardTitle className="text-xl">
                  {(user.full_name as string) || (user.username as string) || "Unknown User"}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {user.email as string}
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-y">
                <span className="text-sm font-medium">Premium Status</span>
                <div className="flex items-center gap-2">
                  {user.is_premium && <Crown className="h-4 w-4 text-primary" />}
                  <Switch 
                    checked={!!user.is_premium} 
                    onCheckedChange={(checked) => setPremium.mutate({ user_id: id, is_premium: checked })}
                    disabled={setPremium.isPending}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2"><Shield className="h-4 w-4" /> User ID</span>
                  <div className="flex items-center gap-1 font-mono">
                    <span className="truncate w-24 text-right">{id}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(id)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                {user.created_at && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2"><Calendar className="h-4 w-4" /> Joined</span>
                    <span>{format(new Date(user.created_at as string), "MMM d, yyyy")}</span>
                  </div>
                )}
                
                {user.updated_at && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4" /> Updated</span>
                    <span>{format(new Date(user.updated_at as string), "MMM d, yyyy")}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/20 shadow-sm">
            <CardHeader>
              <CardTitle className="text-destructive text-sm font-bold uppercase tracking-wider">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Reset Usage Data</h4>
                <p className="text-xs text-muted-foreground">Clear all usage history and reset counts to 0.</p>
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setResetOpen(true)}>
                  <RotateCcw className="h-4 w-4" /> Reset Usage
                </Button>
              </div>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Delete Account</h4>
                <p className="text-xs text-muted-foreground">Permanently remove this user and all associated data.</p>
                <Button variant="destructive" className="w-full justify-start gap-2" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4" /> Delete User
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-border h-full flex flex-col">
            <CardHeader className="pb-4 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Usage History
                </CardTitle>
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className="text-muted-foreground mr-2">Total Events:</span>
                    <span className="font-mono font-bold text-lg">{usageLoading ? "..." : totalUsage.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              {usageLoading ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : userUsage.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Activity className="h-10 w-10 mb-4 opacity-20" />
                  <p>No usage events recorded for this user.</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="divide-y border-t">
                    {userUsage.map((event, i) => (
                      <div key={event.id as string || i} className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="bg-primary/10 text-primary p-2 rounded-md">
                            <Activity className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium capitalize text-sm">{(event.action as string) || (event.type as string) || 'Event'}</div>
                            {event.created_at && (
                              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(event.created_at as string), "MMM d, yyyy h:mm a")}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="font-mono font-medium text-sm bg-secondary px-2 py-1 rounded-md">
                          +{Number(event.count) || 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user account for <strong className="text-foreground">{user?.email as string}</strong> and remove their data from the servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Dialog */}
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset usage quotas?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all usage history for <strong className="text-foreground">{user?.email as string}</strong>. Their current usage count will be set to 0.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleReset(); }}
              disabled={resetUsage.isPending}
            >
              {resetUsage.isPending ? "Resetting..." : "Reset Usage"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <EditUserDialog
        user={user || null}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </div>
  );
}
