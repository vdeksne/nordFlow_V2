"use client";

import { ListTodo } from "lucide-react";

import { StatCard } from "@/components/Crm/StatCard";

import { useTasks } from "./TasksContext";

export function OpenTasksStatCard() {
  const { tasks } = useTasks();
  const openTasks = tasks.filter((t) => !t.done).length;

  return (
    <StatCard
      title="Open commitments"
      value={`${openTasks}`}
      hint="Loops you still owe yourself or someone else—not a verdict, just clarity."
      icon={ListTodo}
      trend={{ label: "Small closes build trust over time", positive: true }}
      className="border-white/[0.05]"
    />
  );
}
