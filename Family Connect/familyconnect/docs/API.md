# 🔌 API Reference — FamilyConnect

**Base URL:** `https://api.familyconnect.app/api/v1`  
**Auth:** Bearer JWT token in `Authorization` header  
**Rate Limit:** 100 requests/min per user  

---

## Authentication

### POST `/auth/signup`
Create a new account.

```json
// Request
{
  "name": "Gokul Senthilkumar",
  "email": "gokul@example.com",
  "password": "securepassword"
}

// Response 201
{
  "user": { "id": "usr_abc123", "name": "Gokul", "email": "..." },
  "token": "eyJhbGciOiJIUzI1NiJ9..."
}
```

### POST `/auth/login`
```json
// Request
{ "email": "...", "password": "..." }

// Response 200
{ "user": {...}, "token": "..." }
```

---

## Family Trees

### POST `/trees`
Create a new family tree.

```json
// Request
{
  "name": "The Senthilkumar Family",
  "rootMemberName": "Gokul Senthilkumar"
}

// Response 201
{
  "tree": {
    "id": "tree_xyz789",
    "name": "The Senthilkumar Family",
    "rootMemberId": "mem_abc",
    "createdAt": "2026-06-17T00:00:00Z"
  }
}
```

### GET `/trees/:treeId`
Fetch complete tree with all members and relationships.

```json
// Response 200
{
  "tree": {
    "id": "tree_xyz789",
    "name": "...",
    "members": [...],
    "relationships": [...],
    "memberCount": 42
  }
}
```

### DELETE `/trees/:treeId`
Delete a family tree (Admin only).

---

## Members

### POST `/members`
Add a new member to a tree.

```json
// Request
{
  "treeId": "tree_xyz789",
  "name": "Amma",
  "birthDate": "1965-04-15",
  "birthLocation": "Chennai, Tamil Nadu",
  "gender": "female",
  "religion": "Hindu",
  "photoUrl": "https://..."
}

// Response 201
{ "member": { "id": "mem_def456", ... } }
```

### GET `/members/:memberId`
Get member details.

### PUT `/members/:memberId`
Update member profile.

### DELETE `/members/:memberId`
Remove member from tree (Editor/Admin only).

### GET `/members/search?q=name&treeId=`
Search members by name within a tree.

---

## Relationships

### PUT `/relationships`
Create or update a relationship between two members.

```json
// Request
{
  "treeId": "tree_xyz789",
  "member1Id": "mem_abc",
  "member2Id": "mem_def456",
  "type": "parent",  // parent | child | spouse | sibling | cousin | aunt_uncle | niece_nephew | inlaw
  "marriageDate": "1990-11-20",  // optional
  "label": "Amma"  // optional custom label
}
```

### DELETE `/relationships/:relationshipId`
Remove a relationship.

---

## Events

### POST `/events`
Add a family event.

```json
// Request
{
  "treeId": "tree_xyz789",
  "type": "birthday",  // birthday | marriage | death | anniversary | festival | gathering
  "memberId": "mem_abc",
  "date": "2026-12-25",
  "title": "Amma's 60th Birthday",
  "location": "Chennai",
  "description": "..."
}
```

### GET `/events?treeId=&month=&year=`
Fetch events for calendar view.

---

## Access Control

### POST `/trees/:treeId/invite`
Invite a user to the family tree.

```json
// Request
{
  "email": "relative@example.com",
  "role": "viewer"  // viewer | editor | admin
}
```

### PUT `/trees/:treeId/members/:userId/role`
Update a user's role in the tree.

---

## Error Responses

```json
// Standard error format
{
  "error": {
    "code": "MEMBER_NOT_FOUND",
    "message": "No member found with id mem_xxx",
    "status": 404
  }
}
```

| Code | Status | Description |
|---|---|---|
| `UNAUTHORIZED` | 401 | Invalid or missing token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource does not exist |
| `VALIDATION_ERROR` | 422 | Invalid request payload |
| `RATE_LIMITED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |
