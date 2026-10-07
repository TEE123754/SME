import { randomUUID } from 'node:crypto';
import {
  withScope,
  createCommerce,
  createRepositories,
  createOperations,
  DataError,
} from '@customerbuddy/db';
import type { Pool } from '@customerbuddy/db';
import type { TrustedScope } from '@customerbuddy/contracts';
import { matchIntent, scriptReply, scriptVersion } from '@customerbuddy/demo-assistant';
export function createScripted(pool: Pool) {
  const commerce = createCommerce(pool),
    repos = createRepositories(pool),
    ops = createOperations(pool);
  return {
    async respond(scope: TrustedScope, conversationId: string, messageId: string) {
      if (scope.role !== 'customer' || !scope.customerId) throw new DataError('CUSTOMER_ONLY', 403);
      const claim = await withScope(pool, scope, async (c) => {
        await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,3003))', [
          scope.businessId,
        ]);
        const conversation = (
          await c.query('SELECT * FROM app.conversations WHERE id=$1 FOR UPDATE', [conversationId])
        ).rows[0];
        const input = (
          await c.query(
            "SELECT * FROM app.messages WHERE id=$1 AND conversation_id=$2 AND role='customer'",
            [messageId, conversationId],
          )
        ).rows[0];
        if (!conversation || !input) throw new DataError('NOT_FOUND', 404);
        const old = (
          await c.query('SELECT * FROM app.agent_runs WHERE input_message_id=$1', [messageId])
        ).rows[0];
        if (old?.state === 'completed' || old?.state === 'failed')
          return { result: old.result_json };
        if (old?.state === 'running' && Date.now() - new Date(old.started_at).getTime() < 30000)
          throw new DataError('SCRIPT_BUSY', 409);
        if (
          conversation.human_takeover ||
          conversation.state !== 'active' ||
          (
            await c.query('SELECT automation_paused FROM app.businesses WHERE id=$1', [
              scope.businessId,
            ])
          ).rows[0].automation_paused
        )
          return {
            result: {
              mode: 'scripted',
              intent: 'paused',
              reply: 'Waiting for the owner. Your message is saved.',
            },
          };
        const intent = matchIntent(input.content),
          id = old?.id ?? randomUUID();
        await c.query(
          `INSERT INTO app.agent_runs(id,business_id,customer_id,conversation_id,input_message_id,adapter,matched_intent,script_version,state,started_at) VALUES($1,$2,$3,$4,$5,'scripted',$6,$7,'running',clock_timestamp()) ON CONFLICT(business_id,input_message_id) DO UPDATE SET state='running',started_at=clock_timestamp()`,
          [
            id,
            scope.businessId,
            scope.customerId,
            conversationId,
            messageId,
            intent,
            scriptVersion,
          ],
        );
        return {
          id,
          intent,
          text: input.content,
          bm:
            (
              await c.query('SELECT preferred_language FROM app.customers WHERE id=$1', [
                scope.customerId,
              ])
            ).rows[0].preferred_language === 'bm',
        };
      });
      if ('result' in claim) return claim.result;
      let payload: unknown = null,
        error: string | null = null;
      try {
        if (claim.intent === 'catalogue') payload = await repos.catalogue(scope);
        if (claim.intent === 'faq') payload = (await repos.knowledge(scope)).entries;
        if (claim.intent === 'order_status' || claim.intent === 'repeat_order')
          payload = await repos.orders(scope);
        if (claim.intent === 'preference_proposal') payload = await repos.preferences(scope);
        if (claim.intent === 'recommendation') payload = await ops.recommendation(scope);
        if (claim.intent === 'human_handoff' || claim.intent === 'after_sales')
          payload = await commerce.exception(
            scope,
            { kind: 'complaint', conversationId, note: claim.text },
            `script-handoff-${messageId}`,
          );
      } catch (e) {
        error = e instanceof DataError ? e.code : 'SCRIPT_SERVICE_FAILED';
      }
      return withScope(pool, scope, async (c) => {
        await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,3003))', [
          scope.businessId,
        ]);
        const conversation = (
          await c.query('SELECT * FROM app.conversations WHERE id=$1 FOR UPDATE', [conversationId])
        ).rows[0];
        const suppressed =
          !['human_handoff', 'after_sales'].includes(claim.intent) &&
          (conversation.human_takeover ||
            conversation.state !== 'active' ||
            (
              await c.query('SELECT automation_paused FROM app.businesses WHERE id=$1', [
                scope.businessId,
              ])
            ).rows[0].automation_paused);
        let detail = '';
        if (claim.intent === 'recommendation' && payload && !error && !suppressed) {
          const r = payload as {
            product: { label: string; unit_price_sen: number };
            reason: string;
          };
          detail = `${r.product.label}: RM ${(r.product.unit_price_sen / 100).toFixed(2)}. ${r.reason}`;
        }
        if (Array.isArray(payload) && !error && !suppressed) {
          if (claim.intent === 'catalogue')
            detail = payload
              .map((p) => `${p.label}: RM ${(p.unit_price_sen / 100).toFixed(2)}`)
              .join(' · ');
          if (claim.intent === 'faq')
            detail = payload.map((p) => (claim.bm ? p.content_bm : p.content_en)).join(' ');
          if (claim.intent === 'order_status' || claim.intent === 'repeat_order')
            detail = payload.length
              ? payload
                  .slice(0, claim.intent === 'repeat_order' ? 1 : 5)
                  .map(
                    (p) =>
                      `${p.display_code}: ${p.state}, RM ${(p.total_sen / 100).toFixed(2)}, verified paid RM ${(p.verified_paid_sen / 100).toFixed(2)}`,
                  )
                  .join(' · ')
              : claim.bm
                ? 'Belum ada pesanan.'
                : 'No saved orders yet.';
        }
        const base = error
          ? 'The saved service could not complete this request. Retry or ask the owner.'
          : suppressed
            ? 'Waiting for the owner. Your message is saved.'
            : scriptReply(claim.intent, claim.bm);
        const reply = base + (detail ? '\n' + detail : '');
        const result = {
          mode: 'scripted',
          intent: claim.intent,
          scriptVersion,
          reply,
          payload,
          error,
          suppressed,
        };
        if (!suppressed)
          await c.query(
            `INSERT INTO app.messages(id,business_id,customer_id,conversation_id,role,content,created_at) VALUES($1,$2,$3,$4,'assistant',$5,GREATEST(app.business_now(),COALESCE((SELECT MAX(created_at)+interval '1 millisecond' FROM app.messages WHERE conversation_id=$4),app.business_now())))`,
            [randomUUID(), scope.businessId, scope.customerId, conversationId, reply],
          );
        await c.query(
          'UPDATE app.agent_runs SET state=$2,result_json=$3,tool_calls=$4,error_code=$5,finished_at=clock_timestamp() WHERE id=$1',
          [
            claim.id,
            error ? 'failed' : 'completed',
            JSON.stringify(result),
            JSON.stringify([
              { intent: claim.intent, outcome: error ?? (suppressed ? 'suppressed' : 'completed') },
            ]),
            error,
          ],
        );
        return result;
      });
    },
  };
}
