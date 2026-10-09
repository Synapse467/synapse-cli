# Incident response for small teams

This is a short, original runbook written for the Synapse demo. It is not professional advice.

## Declaring an incident

Declare an incident as soon as customers are affected, even if the cause is not yet known. Waiting for certainty costs more than a false alarm.

Always name one person as incident lead before anyone starts fixing things, because two people changing production at once makes the cause impossible to trace.

## Rolling back a release

If health checks fail after a release, follow these steps:

1. Stop the rollout so no more servers receive the new version.
2. Redeploy the previous known-good image.
3. Confirm that the health checks pass again.
4. Write down the time of each step for the review.

Roll back first and investigate afterwards. A rollback is reversible and an investigation under pressure is not.

## Communicating

Post a status update every thirty minutes while an incident is open, even when there is nothing new to say. Silence is read as trouble.

Never speculate about the cause in a customer-facing message. State what is affected, what is being done and when the next update will come.

## Retries and load

Retries without backoff are dangerous because they multiply load on a struggling service for every caller at once.

Prefer exponential backoff with random jitter, so that callers do not retry in step with each other. This does not apply to a single, human-initiated request, which can simply be repeated.

## After the incident

Hold a blameless review within five working days. The goal of the review is to change the system so the same mistake is harder to make, not to find someone to blame.

Example: a database migration locked a table during peak hours and checkout failed for eleven minutes. The team rolled back within four minutes of declaring the incident, then added a rule that migrations on large tables run only in the off-peak window.
