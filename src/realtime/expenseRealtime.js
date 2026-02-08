import { supabase } from "../lib/supabaseClient";

export function subscribeGroupExpensesRealtime({ groupId, onEvent }) {
  if (!groupId) throw new Error("subscribeGroupExpensesRealtime: groupId is required");

  const channel = supabase
    .channel(`group-expenses:${groupId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "tourism_features",
        table: "group_expenses",
        filter: `group_id=eq.${groupId}`,
      },
      (payload) => onEvent?.({ type: "EXPENSE_CHANGE", payload })
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export function applyExpensePayload(payload, state) {
  const { eventType, new: newRow, old: oldRow } = payload;

  const next = {
    ...state,
    expenses: Array.isArray(state.expenses) ? [...state.expenses] : [],
    totalSpent: Number(state.totalSpent || 0),
  };

  if (eventType === "INSERT") {
    next.expenses = [newRow, ...next.expenses];
    next.totalSpent += Number(newRow?.amount || 0);
  }

  if (eventType === "UPDATE") {
    next.expenses = next.expenses.map((e) => (e.id === newRow.id ? newRow : e));
    next.totalSpent += Number(newRow?.amount || 0) - Number(oldRow?.amount || 0);
  }

  if (eventType === "DELETE") {
    next.expenses = next.expenses.filter((e) => e.id !== oldRow.id);
    next.totalSpent -= Number(oldRow?.amount || 0);
    if (next.totalSpent < 0) next.totalSpent = 0;
  }

  return next;
}

export async function addGroupExpense({ groupId, item, amount, occurred_on, paid_by }) {
  if (!groupId || !item || !Number.isFinite(Number(amount))) {
    throw new Error("addGroupExpense: groupId, item, amount are required");
  }

  const { data, error } = await supabase
    .schema("tourism_features")
    .from("group_expenses")
    .insert({
      group_id: groupId,
      item,
      amount: Number(amount),
      occurred_on: occurred_on || null,
      paid_by: paid_by || null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
