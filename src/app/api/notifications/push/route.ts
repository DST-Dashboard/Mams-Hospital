import { PushSubscriptionBody } from "@/contracts/auth";
import { requireRole } from "@/server/auth/guard";
import { fail, handle, ok } from "@/server/http";
import { audit } from "@/server/repos/audit";
import { removePushSubscription, savePushSubscription } from "@/server/repos/push-subscriptions";
import {
  createPushEndpointAgent,
  PushEndpointRejectedError,
  PushEndpointResolutionError,
} from "@/server/notify/push-endpoint";

export const dynamic = "force-dynamic";

export const POST = handle(async (req: Request) => {
  const session = await requireRole("viewer");
  const input = PushSubscriptionBody.parse(await req.json());
  let validationAgent: Awaited<ReturnType<typeof createPushEndpointAgent>>;
  try {
    validationAgent = await createPushEndpointAgent(input.endpoint);
  } catch (error) {
    if (error instanceof PushEndpointRejectedError) return fail(400, "Push endpoint is not allowed");
    if (error instanceof PushEndpointResolutionError) return fail(503, "Push endpoint could not be verified");
    throw error;
  }
  validationAgent.destroy();
  const id = savePushSubscription(session.uid, {
    endpoint: input.endpoint,
    p256dh: input.keys.p256dh,
    auth: input.keys.auth,
  });
  audit({ userId: session.uid, action: "push.subscribe", entity: "push_subscription", entityId: id });
  return ok({ id, subscribed: true }, { status: 201 });
});

export const DELETE = handle(async (req: Request) => {
  const session = await requireRole("viewer");
  const input = PushSubscriptionBody.pick({ endpoint: true }).parse(await req.json());
  if (!removePushSubscription(session.uid, input.endpoint)) return fail(404, "Push subscription not found");
  audit({ userId: session.uid, action: "push.unsubscribe", entity: "push_subscription", entityId: session.uid });
  return ok({ subscribed: false });
});
