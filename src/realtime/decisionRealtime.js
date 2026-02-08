import { supabase } from "../lib/supabaseClient";

export function subscribeDecisionRealtime({ decisionId, onEvent }) {
  if (!decisionId) throw new Error("subscribeDecisionRealtime: decisionId is required");

  const channel = supabase
    .channel(`decision:${decisionId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "tourism_features",
        table: "group_decision_votes",
        filter: `decision_id=eq.${decisionId}`,
      },
      (payload) => onEvent?.({ type: "VOTE_CHANGE", payload })
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "tourism_features",
        table: "group_decision_options",
        filter: `decision_id=eq.${decisionId}`,
      },
      (payload) => onEvent?.({ type: "OPTION_CHANGE", payload })
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "tourism_features",
        table: "group_decisions",
        filter: `id=eq.${decisionId}`,
      },
      (payload) => onEvent?.({ type: "DECISION_CHANGE", payload })
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export function applyVotePayload(payload, state) {
  const { eventType, new: newRow, old: oldRow } = payload;

  const next = { ...state, counts: { ...(state.counts || {}) } };

  const inc = (optId, delta) => {
    if (!optId) return;
    next.counts[optId] = (next.counts[optId] || 0) + delta;
    if (next.counts[optId] < 0) next.counts[optId] = 0;
  };

  if (eventType === "INSERT") {
    inc(newRow?.option_id, 1);
    if (newRow?.user_id && next.me && newRow.user_id === next.me) {
      next.myVoteOptionId = newRow.option_id;
    }
  }

  if (eventType === "UPDATE") {
    const oldOpt = oldRow?.option_id;
    const newOpt = newRow?.option_id;
    if (oldOpt && newOpt && oldOpt !== newOpt) {
      inc(oldOpt, -1);
      inc(newOpt, 1);
    }
    if (newRow?.user_id && next.me && newRow.user_id === next.me) {
      next.myVoteOptionId = newRow.option_id;
    }
  }

  if (eventType === "DELETE") {
    inc(oldRow?.option_id, -1);
    if (oldRow?.user_id && next.me && oldRow.user_id === next.me) {
      next.myVoteOptionId = null;
    }
  }

  return next;
}

export async function voteDecision({ decisionId, optionId, userId }) {
  if (!decisionId || !optionId || !userId) {
    throw new Error("voteDecision: decisionId, optionId, userId are required");
  }

  const { data, error } = await supabase
    .schema("tourism_features")
    .from("group_decision_votes")
    .upsert(
      { decision_id: decisionId, option_id: optionId, user_id: userId },
      { onConflict: "decision_id,user_id" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
