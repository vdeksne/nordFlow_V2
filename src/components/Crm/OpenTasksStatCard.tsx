"use client";

import { ListTodo } from "lucide-react";

import { StatCard } from "@/components/Crm/StatCard";

import { useTasks } from "./TasksContext";

export function OpenTasksStatCard() {
  const { tasks } = useTasks();
  const openTasks = tasks.filter((t) => !t.done).length;

  return (
    <StatCard
      title="Open loops"
      value={`${openTasks}`}
      hint="Still yours until the checkbox says otherwise."
      icon={ListTodo}
      trend={{ label: "Done beats perfect", positive: true }}
      className="border-white/[0.05]"
    />
  );
}
