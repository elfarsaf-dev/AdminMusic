import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export type UserProfile = Record<string, unknown> & { 
  id: string; 
  is_premium?: boolean;
  email?: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
};

export type UsageEvent = Record<string, unknown> & {
  id?: string;
  user_id: string;
  action?: string;
  type?: string;
  count?: number;
  created_at?: string;
};

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => fetchApi<UserProfile[]>("/admin/users"),
  });
}

export function useUsage() {
  return useQuery({
    queryKey: ["usage"],
    queryFn: () => fetchApi<UsageEvent[]>("/admin/usage"),
  });
}

export function useSetPremium() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { user_id: string; is_premium: boolean }) => 
      fetchApi<{ message: string }>("/admin/set-premium", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      // Optimistic cache update
      queryClient.setQueryData(["users"], (old: UserProfile[] | undefined) => {
        if (!old) return old;
        return old.map(u => u.id === variables.user_id ? { ...u, is_premium: variables.is_premium } : u);
      });
    },
  });
}

export function useResetUsage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { user_id: string }) => 
      fetchApi<{ message: string }>("/admin/reset-usage", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usage"] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { user_id: string }) => 
      fetchApi<{ message: string }>("/admin/delete-user", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.setQueryData(["users"], (old: UserProfile[] | undefined) => {
        if (!old) return old;
        return old.filter(u => u.id !== variables.user_id);
      });
      queryClient.invalidateQueries({ queryKey: ["usage"] });
    },
  });
}
