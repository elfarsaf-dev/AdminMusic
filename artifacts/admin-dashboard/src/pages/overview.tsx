import { useMemo } from "react";
import { Link } from "wouter";
import { useUsers, useUsage } from "@/hooks/use-api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Crown, Activity, ArrowUpRight, BarChart3, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

export default function Overview() {
  const { data: users, isLoading: usersLoading, error: usersError } = useUsers();
  const { data: usage, isLoading: usageLoading } = useUsage();

  const stats = useMemo(() => {
    if (!users || !usage) return null;

    const totalUsers = users.length;
    const premiumUsers = users.filter((u) => u.is_premium).length;
    const freeUsers = totalUsers - premiumUsers;
    const conversionRate = totalUsers ? ((premiumUsers / totalUsers) * 100).toFixed(1) : "0";

    const totalEvents = usage.reduce((acc, curr) => acc + (Number(curr.count) || 1), 0);
    const uniqueUsersWithUsage = new Set(usage.map((u) => u.user_id)).size;
    const avgUsagePerUser = uniqueUsersWithUsage ? (totalEvents / uniqueUsersWithUsage).toFixed(1) : "0";

    return { totalUsers, premiumUsers, freeUsers, conversionRate, totalEvents, uniqueUsersWithUsage, avgUsagePerUser };
  }, [users, usage]);

  const recentUsers = useMemo(() => {
    if (!users) return [];
    return [...users]
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 8);
  }, [users]);

  const topUsageUsers = useMemo(() => {
    if (!users || !usage) return [];
    const counts: Record<string, number> = {};
    usage.forEach((u) => {
      counts[u.user_id] = (counts[u.user_id] || 0) + (Number(u.count) || 1);
    });
    
    return Object.entries(counts)
      .map(([id, count]) => ({ id, count, user: users.find(u => u.id === id) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [users, usage]);

  if (usersError) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Activity className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold">Failed to load data</h2>
        <p className="text-muted-foreground mt-2 mb-6">There was an error communicating with the API.</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-1">High-level metrics and recent activity across your user base.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Users" 
          value={stats?.totalUsers ?? 0} 
          icon={Users} 
          loading={usersLoading} 
        />
        <StatCard 
          title="Premium Conversion" 
          value={stats ? `${stats.conversionRate}%` : "0%"} 
          subtitle={`${stats?.premiumUsers ?? 0} premium / ${stats?.freeUsers ?? 0} free`}
          icon={Crown} 
          iconColor="text-primary"
          loading={usersLoading} 
        />
        <StatCard 
          title="Total Usage Events" 
          value={stats?.totalEvents ?? 0} 
          icon={BarChart3} 
          loading={usageLoading} 
        />
        <StatCard 
          title="Avg Usage / Active User" 
          value={stats?.avgUsagePerUser ?? 0} 
          subtitle={`Across ${stats?.uniqueUsersWithUsage ?? 0} active users`}
          icon={Activity} 
          loading={usageLoading} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle>Recent Users</CardTitle>
              <CardDescription>Newest accounts on the platform</CardDescription>
            </div>
            <Link href="/users">
              <Button variant="ghost" size="sm" className="h-8 gap-1">
                View all <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[150px]" />
                      <Skeleton className="h-3 w-[100px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentUsers.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No users found</div>
            ) : (
              <div className="space-y-4">
                {recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between hover:bg-muted/50 p-2 -mx-2 rounded-md transition-colors group">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-border">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {user.email?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium leading-none flex items-center gap-2">
                          {user.full_name || user.username || user.email || 'Unknown User'}
                          {user.is_premium && <Crown className="h-3 w-3 text-primary" />}
                        </span>
                        <span className="text-xs text-muted-foreground mt-1">
                          {user.email}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {user.created_at && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                        </div>
                      )}
                      <Link href={`/users/${user.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Usage Leaderboard */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle>Usage Leaderboard</CardTitle>
              <CardDescription>Most active users by event count</CardDescription>
            </div>
            <Link href="/usage">
              <Button variant="ghost" size="sm" className="h-8 gap-1">
                Explorer <ArrowUpRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {usageLoading || usersLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[150px]" />
                        <Skeleton className="h-3 w-[100px]" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : topUsageUsers.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No usage data found</div>
            ) : (
              <div className="space-y-4">
                {topUsageUsers.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between hover:bg-muted/50 p-2 -mx-2 rounded-md transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-6 text-center font-mono text-muted-foreground font-bold">
                        {index + 1}
                      </div>
                      <Avatar className="h-9 w-9 border border-border">
                        <AvatarImage src={item.user?.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {item.user?.email?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <Link href={`/users/${item.id}`} className="text-sm font-medium hover:underline flex items-center gap-1">
                          {item.user?.full_name || item.user?.email || item.id.substring(0,8)}
                        </Link>
                        {item.user?.is_premium && (
                          <Badge variant="outline" className="w-fit text-[10px] h-4 px-1 mt-1 font-normal border-primary/20 text-primary bg-primary/5">Premium</Badge>
                        )}
                      </div>
                    </div>
                    <div className="font-mono font-medium text-sm bg-secondary px-2 py-1 rounded-md">
                      {item.count.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  loading,
  iconColor = "text-muted-foreground"
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string; 
  icon: any; 
  loading: boolean;
  iconColor?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2 mt-1">
            <Skeleton className="h-8 w-20" />
            {subtitle && <Skeleton className="h-3 w-32" />}
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
