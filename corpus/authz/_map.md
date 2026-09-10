# authz

How the system decides who's allowed to do what.

- [[permissions]] — named `can_` checks, server-is-the-boundary, and the widen-once ripple ⚠️ hazard
- [[capability-switches]] — runtime feature toggles read like plan and role; a missing switch fails closed ⚠️
- [[return-destination]] — where sign-in sends you back to, taken from an unauthenticated param ⚠️
