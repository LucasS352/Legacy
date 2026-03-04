import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi, Task, CreateTaskBody } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

export function useTasks(params?: Record<string, unknown>) {
    return useQuery({
        queryKey: ['tasks', params],
        queryFn: async () => {
            const response = await tasksApi.getAll(params);
            return response.data.data;
        },
        staleTime: 30_000,
    });
}

export function useCreateTask() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: (data: CreateTaskBody) => tasksApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            toast({ title: 'Tarefa criada com sucesso!' });
        },
        onError: () => {
            toast({ title: 'Erro ao criar tarefa', variant: 'destructive' });
        },
    });
}

export function useUpdateTask() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: Partial<Task> }) =>
            tasksApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        },
        onError: () => {
            toast({ title: 'Erro ao atualizar tarefa', variant: 'destructive' });
        },
    });
}

export function useToggleTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => tasksApi.toggleStatus(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        },
    });
}

export function useDeleteTask() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: (id: number) => tasksApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast({ title: 'Tarefa excluída' });
        },
        onError: () => {
            toast({ title: 'Erro ao excluir tarefa', variant: 'destructive' });
        },
    });
}
