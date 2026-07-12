# Security Specification for Ulfah Chat Firestore Rules

## 1. Data Invariants

- **User Profiles (`/users/{userId}`)**:
  - A user profile can only be created or modified by the authenticated user whose `uid` matches the document's path parameter `{userId}`.
  - The `email` field must match the user's authentic token email (`request.auth.token.email`).
  - The `role` field cannot be elevated to `admin` by regular users. It must either default to `user` or be managed exclusively by existing administrators.
  - The email must be verified (`request.auth.token.email_verified == true`).

- **Contacts (`/users/{userId}/contacts/{contactId}`)**:
  - Saved contacts are private to the owner `{userId}`.
  - Only the authenticated owner `{userId}` can read, list, or write contacts.

- **Bookmarks (`/users/{userId}/bookmarks/{bookmarkId}`)**:
  - Private to the user `{userId}`. Only the authenticated `{userId}` can read, list, write.

- **Messages (`/messages/{messageId}`)**:
  - Messages must have `senderId` equal to the sender's authentic `uid`.
  - Only the sender or the intended recipient (or group members) can read a message.
  - Messages cannot be modified or deleted once sent, ensuring chat history integrity.

- **Groups and Channels (`/groups/{groupId}`)**:
  - Anyone signed in can read public groups or channels.
  - Only members or admins can read private groups/channels.
  - Only group admins can write, edit settings, or send messages to muted channels.

- **Statuses (`/statuses/{statusId}`)**:
  - Users can only create status updates for themselves (`userId == request.auth.uid`).
  - Updates must be immutable once posted.

- **Follows (`/follows/{followId}`)**:
  - Follow relationships can only be created where the `followerId` is the authentic user `uid`.

- **Typing Indicators (`/chats/{chatId}/status/{userId}`)**:
  - A user can only write/delete their own typing indicator (`userId == request.auth.uid`).

- **Support Tickets (`/supportTickets/{ticketId}`)**:
  - Users can create and read their own support tickets.
  - Support staff/admins can read and write all tickets.

- **Activity Logs (`/activityLogs/{logId}`)**:
  - Read-only for admins.
  - Written when specific user actions occur.

- **Madrasa Hierarchy (`/classes`, `/book_categories`, `/books`, `/sharahs`)**:
  - Publicly readable by all authenticated and verified users.
  - Only administrators can create, update, or delete.

---

## 2. The "Dirty Dozen" Payloads

Here are 12 malicious payloads designed to breach integrity and access control boundaries. All of these must be rejected with `PERMISSION_DENIED`.

### Payload 1: Admin Promotion Spoofing
- **Path**: `/users/malicious_user`
- **Action**: Create / Update
- **Payload**: `{"uid": "malicious_user", "email": "attacker@gmail.com", "role": "admin"}`
- **Vulnerability Targeted**: Self-assigned role elevation.

### Payload 2: Email Spoofing on Registration
- **Path**: `/users/legit_user`
- **Action**: Create
- **Payload**: `{"uid": "legit_user", "email": "victim@gmail.com", "role": "user"}`
- **Vulnerability Targeted**: Impersonation of other users' emails.

### Payload 3: Shadow Contact Insertion
- **Path**: `/users/victim_user/contacts/some_contact`
- **Action**: Create
- **Payload**: `{"uid": "attacker_user", "displayName": "Attacker"}`
- **Vulnerability Targeted**: Accessing or writing to other users' private contact lists.

### Payload 4: Fake Sender ID in Message
- **Path**: `/messages/msg_123`
- **Action**: Create
- **Payload**: `{"senderId": "victim_user", "receiverId": "another_user", "text": "I agree to transfer my balance."}`
- **Vulnerability Targeted**: Identity spoofing in peer-to-peer messaging.

### Payload 5: Rogue Channel Administrator Addition
- **Path**: `/groups/channel_abc`
- **Action**: Update
- **Payload**: `{"uid": "channel_abc", "admins": ["victim_admin", "attacker_user"], "creatorId": "victim_admin"}`
- **Vulnerability Targeted**: Unauthorized configuration updates to groups/channels.

### Payload 6: Rogue Status Update
- **Path**: `/statuses/status_123`
- **Action**: Create
- **Payload**: `{"userId": "victim_user", "imageUrl": "https://attacker.com/exploit.jpg"}`
- **Vulnerability Targeted**: Impersonation in story/status postings.

### Payload 7: Unauthorized Typing Indicator Spoofing
- **Path**: `/chats/room_xyz/status/victim_user`
- **Action**: Create / Update
- **Payload**: `{"isTyping": true}`
- **Vulnerability Targeted**: Injecting state updates on behalf of other chat participants.

### Payload 8: Fake Ticket Submission on Behalf of Admin
- **Path**: `/supportTickets/ticket_123`
- **Action**: Create
- **Payload**: `{"userId": "victim_user", "userName": "Victim", "status": "resolved", "lastMessage": "Admin note: closed"}`
- **Vulnerability Targeted**: Bypassing ticket submission validation.

### Payload 9: Unauthorized Book Insertion to Madrasa
- **Path**: `/books/book_123`
- **Action**: Create
- **Payload**: `{"name": "Exploit Manual", "classId": "class_abc"}`
- **Vulnerability Targeted**: Unauthorized writing to curriculum content.

### Payload 10: Unverified User Write Attempt
- **Path**: `/messages/msg_abc`
- **Action**: Create
- **Payload**: `{"senderId": "unverified_user", "receiverId": "user_xyz", "text": "Spam message"}`
- **Condition**: User has `email_verified == false`.
- **Vulnerability Targeted**: Bypassing mandatory verification.

### Payload 11: Shadow Modification of Message Text
- **Path**: `/messages/msg_123`
- **Action**: Update
- **Payload**: `{"senderId": "sender_abc", "receiverId": "receiver_xyz", "text": "Altered original text."}`
- **Vulnerability Targeted**: Modification of immutable chat history.

### Payload 12: Rogue Activity Log Insertion
- **Path**: `/activityLogs/log_abc`
- **Action**: Create
- **Payload**: `{"userId": "victim_user", "action": "Rogue Action"}`
- **Vulnerability Targeted**: Injecting fraudulent logs to confuse system auditing.

---

## 3. The Test Runner (`firestore.rules.test.ts`)

A mockup of the test script to run against the rules:

```typescript
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

// Test setup and validation runner logic would reside here, asserting that each
// of the Dirty Dozen payloads fails, and standard authentic payloads succeed.
```
