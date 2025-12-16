# Full Project Analysis & Issue Report

## CRITICAL ISSUES FOUND

### 1. **BACKEND GRIDFS SERVICE - TypeScript Compilation Errors** ❌
**File:** `backend/src/services/gridfsService.ts` (Lines 87, 138)
**Severity:** CRITICAL - Prevents proper image handling
**Issue:** The `bucket.find().toArray()` callback has incorrect parameter types
```typescript
// ❌ WRONG - MongoDB has changed its API
bucket.find({ _id: fileId }).toArray((err, files) => { ... });

// ✓ CORRECT - Should use Promise-based API
const files = await bucket.find({ _id: fileId }).toArray();
```

**Fix Required:**
- Replace callback-based `toArray()` with async/await
- Properly type the returned documents
- Fix both line 87 and line 138

---

### 2. **CORE PROBLEM: REQUESTS NOT REACHING EXPRESS BACKEND** ❌
**Status:** CONFIRMED - Multer middleware not parsing FormData
**Evidence:**
- Frontend sends correct FormData with proper multipart boundary
- Backend receives 400 error from search handler (wrong endpoint)
- NO backend logs appear - request is being parsed by wrong handler
- Debug log shows only server startup, never captures incoming requests

**Root Cause:**
- Multer is NOT properly parsing the FormData text fields into `req.body`
- Request reaches Express but gets routed to `searchMoviesHandler` instead of `ingestMovieWithImageHandler`
- Suggests route ordering issue OR Multer silently failing

**Evidence Points:**
1. Error stack trace shows: `movieController.ts:40:37` = line 40 = `searchMoviesHandler`
2. Error message: "Invalid input: expected object, received undefined"
3. This is the search handler trying to parse query params as body

---

### 3. **INCONSISTENT FORM STATE IN FRONTEND** ⚠️
**File:** `frontend/src/app/admin/page.tsx` & `.next/dev/server/chunks/ssr/...`
**Issue:** Compiled chunk includes `script: ''` field that doesn't exist in source
```javascript
// In compiled version (.next chunk):
setFormData({
  title: '',
  genres: [],
  cast: [],
  director: '',
  releaseYear: undefined,
  plot: '',
  script: '',  // ❌ THIS SHOULDN'T BE HERE
  trailerUrl: '',
  posterUrl: '',
  rating: undefined
});
```

**Issue:** Source code has `plot` but compiled code has `script` instead
- Possible stale build cache
- Run `npm run build` or clear `.next` folder

---

### 4. **MULTER NOT PARSED WHEN USING JSON** ⚠️
**File:** `backend/src/middleware/upload.ts` & `backend/src/routes/movieRoutes.ts`
**Issue:** When creating movie WITHOUT image (JSON request), Multer still runs but:
- `express.json()` already parsed the body
- Then Multer overwrites it with undefined
- Result: req.body becomes undefined

**Problem:** Route uses `upload.single('posterImage')` for ALL requests
```typescript
// ❌ CURRENT - Multer runs for JSON too
router.post('/movies/ingest', upload.single('posterImage'), ingestMovieWithImageHandler);

// ✓ SHOULD BE - Only use Multer for FormData
router.post('/movies/ingest', (req, res, next) => {
  if (req.is('multipart/form-data')) {
    upload.single('posterImage')(req, res, next);
  } else {
    next();
  }
});
```

---

## MEDIUM PRIORITY ISSUES

### 5. **Missing Multer Version Compatibility** ⚠️
**File:** `backend/package.json`
**Current:** `"multer": "^2.0.2"`
**Issue:** Multer 2.0 changed callback API significantly
- Your code uses old callback style: `(err, files) => {}`
- Multer 2.0+ requires promise-based: `await bucket.find().toArray()`

**Fix:** Update `gridfsService.ts` to use async/await instead of callbacks

---

### 6. **API Response Body Mismatch** ⚠️
**Issue:** When request is made but multer fails silently:
- Frontend expects: `{ message: string }`
- Backend might return: Zod validation error array
- This causes `handleResponse()` to fail parsing

---

## ARCHITECTURAL ISSUES

### 7. **Route Handler Processing Flow** 📊
**Current Flow (BROKEN):**
```
FormData Request
    ↓
Express receives @ middleware(#1)
    ↓
express.json() - skips (not JSON)
    ↓
express.urlencoded() - runs, clears req.body
    ↓
upload.single() - tries to parse but req.body already mangled
    ↓
ingestMovieWithImageHandler receives undefined req.body
    ↓
Validation fails
```

**Should Be:**
```
FormData Request
    ↓
upload.single() - Multer parses FormData correctly
    ↓
req.body populated with text fields
req.file populated with posterImage
    ↓
ingestMovieWithImageHandler receives proper data
    ↓
Success
```

---

##  SOLUTION SUMMARY

### Immediate Fixes (Priority 1):

1. **Fix GridFS TypeScript errors**
   - Convert from callback to async/await
   - Properly type MongoDB responses

2. **Fix Multer middleware order**
   - Create conditional middleware
   - Only apply Multer for multipart/form-data
   - Let express.json() handle JSON

3. **Clear Next.js cache**
   - Delete `.next` folder
   - Rebuild frontend

### Secondary Fixes (Priority 2):

4. Fix frontend form state (script vs plot field)
5. Add proper error handling for Multer failures
6. Add logging to verify Multer is parsing fields correctly

---

## FILES NEEDING CHANGES

1. `backend/src/services/gridfsService.ts` - Fix async/await
2. `backend/src/routes/movieRoutes.ts` - Add conditional Multer
3. `backend/src/app.ts` - Reorder middleware
4. `frontend/src/app/admin/page.tsx` - Verify form fields
5. Frontend - Rebuild (clear .next cache)

---

## TESTING CHECKLIST AFTER FIXES

- [ ] POST to `/api/movies/ingest` with JSON body → Should work
- [ ] POST to `/api/movies/ingest` with FormData body → Should work
- [ ] POST to `/api/movies/ingest` with FormData + image file → Should work
- [ ] Backend logs show request received (debug log written)
- [ ] GridFS stores image files correctly
- [ ] No TypeScript compilation errors

