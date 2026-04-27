import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useUsers, useUsage, useSetPremium, useDeleteUser, useResetUsage, useBlockUser, UserProfile } from "@/hooks/use-api";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { 
  Search, MoreHorizontal, Crown, Trash2, RotateCcw, Copy, Activity, ArrowUpDown, Pencil, Ban, ShieldCheck 
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { EditUserDialog } from "@/components/EditUserDialog";

export default function Users() {
  const { data: users, isLoading: usersLoading } = useUsers();
  const { data: usage, isLoading: usageLoading } = useUsage();
  const setPremium = useSetPremium();
  const deleteUser = useDeleteUser();
  const resetUsage = useResetUsage();
  const blockUser = useBlockUser();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "premium" | "free" | "blocked">("all");
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc'|'desc'}>({ key: 'created_at', direction: 'desc' });
  
  const [deleteDialog, setDeleteDialog] = useState<{open: boolean, user: UserProfile | null}>({ open: false, user: null });
  const [resetDialog, setResetDialog] = useState<{open: boolean, user: UserProfile | null}>({ open: false, user: null });
  const [editDialog, setEditDialog] = useState<{open: boolean, user: UserProfile | null}>({ open: false, user: null });
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const usageMap = useMemo(() => {
    if (!usage) return {};
    const map: Record<string, number> = {};
    usage.forEach(u => {
      map[u.user_id] = (map[u.user_id] || 0) + (Number(u.count) || 1);
    });
    return map;
  }, [usage]);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    let result = users;

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(u => 
        u.id.toLowerCase().includes(q) || 
        (u.email as string)?.toLowerCase().includes(q) || 
        (u.username as string)?.toLowerCase().includes(q) ||
        (u.full_name as string)?.toLowerCase().includes(q)
      );
    }

    // Filter
    if (filter === "premium") {
      result = result.filter(u => u.is_premium);
    } else if (filter === "free") {
      result = result.filter(u => !u.is_premium);
    } else if (filter === "blocked") {
      result = result.filter(u => u.blocked);
    }

    // Sort
    result = [...result].sort((a, b) => {
      let valA, valB;
      
      if (sortConfig.key === 'created_at') {
        valA = new Date((a.created_at as string) || 0).getTime();
        valB = new Date((b.created_at as string) || 0).getTime();
      } else if (sortConfig.key === 'premium') {
        valA = a.is_premium ? 1 : 0;
        valB = b.is_premium ? 1 : 0;
      } else if (sortConfig.key === 'usage') {
        valA = usageMap[a.id] || 0;
        valB = usageMap[b.id] || 0;
      }

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [users, search, filter, sortConfig, usageMap]);

  const toggleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleDelete = async () => {
    if (!deleteDialog.user) return;
    try {
      await deleteUser.mutateAsync({ user_id: deleteDialog.user.id });
      toast.success("User deleted successfully");
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(deleteDialog.user!.id);
        return next;
      });
    } catch (e) {
      toast.error("Failed to delete user");
    } finally {
      setDeleteDialog({ open: false, user: null });
    }
  };

  const handleReset = async () => {
    if (!resetDialog.user) return;
    try {
      await resetUsage.mutateAsync({ user_id: resetDialog.user.id });
      toast.success("Usage reset successfully");
    } catch (e) {
      toast.error("Failed to reset usage");
    } finally {
      setResetDialog({ open: false, user: null });
    }
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredUsers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkPremium = async (is_premium: boolean) => {
    const ids = Array.from(selectedIds);
    toast.promise(
      Promise.all(ids.map(id => setPremium.mutateAsync({ user_id: id, is_premium }))),
      {
        loading: `Updating ${ids.length} users...`,
        success: `Updated ${ids.length} users to ${is_premium ? 'Premium' : 'Free'}`,
        error: 'Failed to update some users'
      }
    );
  };

  const handleBulkReset = async () => {
    const ids = Array.from(selectedIds);
    toast.promise(
      Promise.all(ids.map(id => resetUsage.mutateAsync({ user_id: id }))),
      {
        loading: `Resetting usage for ${ids.length} users...`,
        success: `Reset usage for ${ids.length} users`,
        error: 'Failed to reset usage for some users'
      }
    );
  };

  const handleBlockToggle = async (user: UserProfile) => {
    const username = user.username as string | undefined;
    if (!username) {
      toast.error("This user has no username, cannot block by username");
      return;
    }
    const nextBlocked = !user.blocked;
    try {
      await blockUser.mutateAsync({ username, blocked: nextBlocked });
      toast.success(nextBlocked ? `Blocked ${username}` : `Unblocked ${username}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update block status");
    }
  };

  const handleBulkBlock = async (blocked: boolean) => {
    const targets = filteredUsers.filter(u => selectedIds.has(u.id) && u.username);
    const skipped = selectedIds.size - targets.length;
    if (targets.length === 0) {
      toast.error("None of the selected users have a username");
      return;
    }
    toast.promise(
      Promise.all(targets.map(u => blockUser.mutateAsync({ username: u.username as string, blocked }))),
      {
        loading: `${blocked ? "Blocking" : "Unblocking"} ${targets.length} users...`,
        success: `${blocked ? "Blocked" : "Unblocked"} ${targets.length} users${skipped ? ` (${skipped} skipped, no username)` : ""}`,
        error: `Failed to ${blocked ? "block" : "unblock"} some users`,
      }
    );
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (confirm(`Are you SURE you want to delete ${ids.length} users? This cannot be undone.`)) {
      toast.promise(
        Promise.all(ids.map(id => deleteUser.mutateAsync({ user_id: id }))),
        {
          loading: `Deleting ${ids.length} users...`,
          success: `Deleted ${ids.length} users`,
          error: 'Failed to delete some users'
        }
      );
      setSelectedIds(new Set());
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage user accounts, premium status, and usage limits.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-card p-4 border rounded-lg shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email, name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 bg-background border-input"
            />
          </div>
          <div className="flex gap-1 border rounded-md p-1 bg-background">
            <Button 
              variant={filter === "all" ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setFilter("all")}
              className="h-7"
            >
              All
            </Button>
            <Button 
              variant={filter === "premium" ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setFilter("premium")}
              className="h-7 text-primary"
            >
              Premium
            </Button>
            <Button 
              variant={filter === "free" ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setFilter("free")}
              className="h-7"
            >
              Free
            </Button>
            <Button 
              variant={filter === "blocked" ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setFilter("blocked")}
              className="h-7 text-destructive"
            >
              Blocked
            </Button>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-md border text-sm animate-in fade-in slide-in-from-bottom-2">
            <span className="font-medium mr-2">{selectedIds.size} selected</span>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleBulkPremium(true)}>Make Premium</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleBulkPremium(false)}>Make Free</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleBulkReset}>Reset Usage</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs text-destructive" onClick={() => handleBulkBlock(true)}>Block</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleBulkBlock(false)}>Unblock</Button>
            <Button variant="destructive" size="sm" className="h-7 text-xs ml-1" onClick={handleBulkDelete}>Delete</Button>
          </div>
        )}
      </div>

      <div className="border rounded-md bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px] px-4">
                <Checkbox 
                  checked={filteredUsers.length > 0 && selectedIds.size === filteredUsers.length}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>User</TableHead>
              <TableHead>ID</TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => toggleSort('premium')}>
                <div className="flex items-center gap-1">Status <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => toggleSort('usage')}>
                <div className="flex items-center gap-1">Usage <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => toggleSort('created_at')}>
                <div className="flex items-center gap-1">Joined <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usersLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4 rounded" /></TableCell>
                  <TableCell><div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><div className="space-y-2"><Skeleton className="h-4 w-[150px]" /><Skeleton className="h-3 w-[100px]" /></div></div></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-md" /></TableCell>
                </TableRow>
              ))
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  No users found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id} className="group transition-colors data-[state=selected]:bg-muted/50">
                  <TableCell className="px-4">
                    <Checkbox 
                      checked={selectedIds.has(user.id)}
                      onCheckedChange={() => toggleSelection(user.id)}
                      aria-label={`Select ${user.email}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border border-border">
                        <AvatarImage src={user.avatar_url as string} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {(user.email as string)?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col max-w-[200px] truncate">
                        <span className="font-medium text-sm truncate">
                          {(user.full_name as string) || (user.username as string) || (user.email as string) || 'Unknown'}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {user.email as string}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 group-hover:text-foreground text-muted-foreground transition-colors">
                      <span className="font-mono text-xs">{user.id.substring(0, 8)}</span>
                      <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => copyToClipboard(user.id)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={!!user.is_premium} 
                        onCheckedChange={(checked) => {
                          setPremium.mutate({ user_id: user.id, is_premium: checked });
                        }}
                        aria-label="Toggle premium"
                      />
                      {user.is_premium ? (
                        <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10">Premium</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Free</Badge>
                      )}
                      {user.blocked && (
                        <Badge variant="outline" className="border-destructive/50 text-destructive bg-destructive/10">Blocked</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-mono text-sm">
                      {usageLoading ? <Skeleton className="h-4 w-8" /> : (usageMap[user.id] || 0).toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {user.created_at ? format(new Date(user.created_at as string), "MMM d, yyyy") : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[170px]">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <Link href={`/users/${user.id}`}>
                          <DropdownMenuItem className="cursor-pointer">
                            <Activity className="mr-2 h-4 w-4" /> View Details
                          </DropdownMenuItem>
                        </Link>
                        <DropdownMenuItem className="cursor-pointer" onClick={() => setEditDialog({ open: true, user })}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit User
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="cursor-pointer"
                          onClick={() => setPremium.mutate({ user_id: user.id, is_premium: !user.is_premium })}
                        >
                          <Crown className={`mr-2 h-4 w-4 ${user.is_premium ? 'text-muted-foreground' : 'text-primary'}`} /> 
                          {user.is_premium ? 'Remove Premium' : 'Make Premium'}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" onClick={() => setResetDialog({ open: true, user })}>
                          <RotateCcw className="mr-2 h-4 w-4" /> Reset Usage
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="cursor-pointer"
                          disabled={!user.username || blockUser.isPending}
                          onClick={() => handleBlockToggle(user)}
                        >
                          {user.blocked ? (
                            <><ShieldCheck className="mr-2 h-4 w-4 text-primary" /> Unblock User</>
                          ) : (
                            <><Ban className="mr-2 h-4 w-4 text-destructive" /> Block User</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => setDeleteDialog({ open: true, user })}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, user: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user account for <strong className="text-foreground">{deleteDialog.user?.email as string}</strong> and remove their data from the servers.
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

      {/* Edit Dialog */}
      <EditUserDialog
        user={editDialog.user}
        open={editDialog.open}
        onOpenChange={(open) => setEditDialog({ open, user: open ? editDialog.user : null })}
      />

      {/* Reset Dialog */}
      <AlertDialog open={resetDialog.open} onOpenChange={(open) => !open && setResetDialog({ open: false, user: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset usage quotas?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all usage history for <strong className="text-foreground">{resetDialog.user?.email as string}</strong>. Their current usage count will be set to 0.
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
    </div>
  );
}
