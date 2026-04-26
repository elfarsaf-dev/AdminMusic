import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useUsage, useUsers, useResetUsage } from "@/hooks/use-api";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Search, Activity, RotateCcw, ArrowUpDown, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function Usage() {
  const { data: usage, isLoading: usageLoading } = useUsage();
  const { data: users, isLoading: usersLoading } = useUsers();
  const resetUsage = useResetUsage();

  const [search, setSearch] = useState("");
  const [view, setView] = useState("raw"); // 'raw' or 'grouped'
  const [resetDialog, setResetDialog] = useState<{open: boolean, userId: string, name: string}>({ open: false, userId: "", name: "" });

  const userMap = useMemo(() => {
    if (!users) return {};
    const map: Record<string, any> = {};
    users.forEach(u => {
      map[u.id] = u;
    });
    return map;
  }, [users]);

  // View 1: Raw events
  const filteredEvents = useMemo(() => {
    if (!usage) return [];
    let result = usage;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(u => {
        const user = userMap[u.user_id];
        const email = (user?.email as string || "").toLowerCase();
        const type = ((u.type as string) || (u.action as string) || "").toLowerCase();
        return email.includes(q) || type.includes(q) || u.user_id.toLowerCase().includes(q) || (u.id as string)?.toLowerCase().includes(q);
      });
    }

    // Sort newest first
    return result.sort((a, b) => 
      new Date((b.created_at as string) || 0).getTime() - new Date((a.created_at as string) || 0).getTime()
    );
  }, [usage, userMap, search]);

  // View 2: Grouped by user
  const groupedUsage = useMemo(() => {
    if (!usage) return [];
    
    const counts: Record<string, { total: number, lastEvent: string | null, eventTypes: Set<string> }> = {};
    
    usage.forEach((u) => {
      const uid = u.user_id;
      if (!counts[uid]) {
        counts[uid] = { total: 0, lastEvent: null, eventTypes: new Set() };
      }
      
      counts[uid].total += (Number(u.count) || 1);
      
      const type = (u.action as string) || (u.type as string);
      if (type) counts[uid].eventTypes.add(type);
      
      if (u.created_at) {
        if (!counts[uid].lastEvent || new Date(u.created_at as string) > new Date(counts[uid].lastEvent!)) {
          counts[uid].lastEvent = u.created_at as string;
        }
      }
    });
    
    let result = Object.entries(counts).map(([id, data]) => ({
      id,
      user: userMap[id],
      ...data
    }));

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(u => 
        u.id.toLowerCase().includes(q) || 
        (u.user?.email as string)?.toLowerCase().includes(q) ||
        (u.user?.username as string)?.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => b.total - a.total);
  }, [usage, userMap, search]);

  const handleReset = async () => {
    if (!resetDialog.userId) return;
    try {
      await resetUsage.mutateAsync({ user_id: resetDialog.userId });
      toast.success("Usage reset successfully");
    } catch (e) {
      toast.error("Failed to reset usage");
    } finally {
      setResetDialog({ open: false, userId: "", name: "" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usage Explorer</h1>
          <p className="text-muted-foreground text-sm mt-1">Monitor API and platform usage events across all users.</p>
        </div>
      </div>

      <Tabs value={view} onValueChange={setView} className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-card p-4 border rounded-lg shadow-sm">
          <TabsList className="grid w-full sm:w-[300px] grid-cols-2">
            <TabsTrigger value="raw">Raw Events</TabsTrigger>
            <TabsTrigger value="grouped">By User</TabsTrigger>
          </TabsList>
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user, email or type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 bg-background border-input"
            />
          </div>
        </div>

        <TabsContent value="raw" className="mt-4">
          <div className="border rounded-md bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Type/Action</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usageLoading || usersLoading ? (
                  [...Array(10)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-20 font-mono" /></TableCell>
                      <TableCell><div className="flex items-center gap-2"><Skeleton className="h-6 w-6 rounded-full" /><Skeleton className="h-4 w-32" /></div></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No events found matching your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEvents.map((event, i) => {
                    const user = userMap[event.user_id];
                    return (
                      <TableRow key={(event.id as string) || i}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {(event.id as string)?.substring(0, 8) || '-'}
                        </TableCell>
                        <TableCell>
                          <Link href={`/users/${event.user_id}`} className="flex items-center gap-2 hover:underline group">
                            <Avatar className="h-6 w-6 border border-border">
                              <AvatarImage src={user?.avatar_url as string} />
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                {(user?.email as string)?.charAt(0).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">
                              {(user?.full_name as string) || (user?.email as string) || event.user_id.substring(0,8)}
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize font-normal text-xs">
                            {(event.action as string) || (event.type as string) || 'Event'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {Number(event.count) || 1}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {event.created_at ? format(new Date(event.created_at as string), "MMM d, HH:mm:ss") : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="grouped" className="mt-4">
          <div className="border rounded-md bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Premium Status</TableHead>
                  <TableHead>Event Types</TableHead>
                  <TableHead className="text-right">Total Count</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usageLoading || usersLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="flex items-center gap-3"><Skeleton className="h-8 w-8 rounded-full" /><div className="space-y-2"><Skeleton className="h-4 w-[150px]" /><Skeleton className="h-3 w-[100px]" /></div></div></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                      <TableCell><div className="flex gap-1"><Skeleton className="h-5 w-12 rounded-full" /><Skeleton className="h-5 w-16 rounded-full" /></div></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto rounded-md" /></TableCell>
                    </TableRow>
                  ))
                ) : groupedUsage.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No aggregated usage found.
                    </TableCell>
                  </TableRow>
                ) : (
                  groupedUsage.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell>
                        <Link href={`/users/${group.id}`} className="flex items-center gap-3 hover:bg-muted/30 p-1 -ml-1 rounded transition-colors group">
                          <Avatar className="h-8 w-8 border border-border">
                            <AvatarImage src={group.user?.avatar_url as string} />
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {(group.user?.email as string)?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm group-hover:underline">
                              {(group.user?.full_name as string) || (group.user?.username as string) || (group.user?.email as string) || group.id.substring(0,8)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {group.user?.email as string || group.id}
                            </span>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        {group.user?.is_premium ? (
                          <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10">Premium</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">Free</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {Array.from(group.eventTypes).map(type => (
                            <Badge key={type} variant="secondary" className="text-[10px] font-normal px-1.5 h-4">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono font-medium text-sm bg-secondary px-2 py-1 rounded-md">
                          {group.total.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {group.lastEvent ? format(new Date(group.lastEvent), "MMM d, yyyy") : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-xs"
                          onClick={() => setResetDialog({ 
                            open: true, 
                            userId: group.id, 
                            name: (group.user?.email as string) || group.id 
                          })}
                        >
                          <RotateCcw className="mr-2 h-3 w-3" /> Reset
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Reset Dialog */}
      <AlertDialog open={resetDialog.open} onOpenChange={(open) => !open && setResetDialog({ open: false, userId: "", name: "" })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset usage for this user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all usage history for <strong className="text-foreground">{resetDialog.name}</strong> and reset their count to 0. This cannot be undone.
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
