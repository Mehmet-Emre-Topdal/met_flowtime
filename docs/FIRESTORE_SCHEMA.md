# Firestore Database Schema

## 1. users (Collection)
- **Document ID:** {uid} (From Firebase Auth)
- **Fields:**
    - `email`: string
    - `displayName`: string
    - `photoURL`: string
    - `flowtimeConfig`: map
        - `intervals`: array [ { min: number, max: number, break: number } ]
    - `createdAt`: timestamp

## 2. tasks (Collection)
- **Document ID:** auto-generated
- **Fields:**
    - `userId`: string (Index)
    - `title`: string
    - `description`: string
    - `status`: string ("todo" | "inprogress" | "done")
    - `totalFocusedTime`: number (minutes)
    - `order`: number (For drag & drop ranking)
    - `createdAt`: timestamp
    - `updatedAt`: timestamp

## 3. focus_logs (Collection)
- **Document ID:** auto-generated
- **Fields:**
    - `userId`: string (Index)
    - `taskId`: string | null
    - `startTime`: timestamp
    - `endTime`: timestamp
    - `duration`: number (seconds)
    - `sessionType`: string ("focus" | "break")