# Security Specification for Firestore Rules

## Data Invariants
1. A user can only read/write their own profile in `/users/{userId}`.
2. A user can only read/write their own contacts in `/users/{userId}/contacts/{contactId}`.
3. Messages are accessible to the sender and receiver.
4. Groups and Channels are restricted to members.
5. Announcements are read-only for all users.
6. SupportTickets are restricted to the owner.

## The "Dirty Dozen" Payloads (Examples)
1. Write to another user's profile: `{ "uid": "otherUser", "displayName": "Hacked" }` -> Should fail.
2. Inject ghost field into profile: `{ "uid": "myUser", "isAdmin": true }` -> Should fail.
3. Write to another user's contact: `{ "uid": "otherUserContact" }` -> Should fail.
4. Read PII of another user profile -> Should fail.

## Test Runner (firestore.rules.test.ts)
(To be implemented in testing framework if available, otherwise manual verification.)
