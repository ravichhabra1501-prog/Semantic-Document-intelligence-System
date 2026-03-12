# Semantic Document Intelligence System

## Project Overview
A full-stack TypeScript/Node.js application for intelligent document processing with AI-powered analysis (summary, classification, entity extraction) and custom organization tags.

## Architecture

### Tech Stack
- **Frontend:** React + TypeScript, Vite, TailwindCSS, shadcn UI, TanStack Query, Wouter
- **Backend:** Express.js, TypeScript, tsx runtime
- **Database:** PostgreSQL + Drizzle ORM
- **AI:** OpenAI (gpt-4o) via Replit AI Integrations
- **Deployment:** Replit hosting

### Key Features

#### 1. Document Upload & Processing
- Supports: PDF, DOCX, TXT, and Images (JPG, PNG)
- Synchronous processing with immediate AI analysis
- Text extraction via:
  - PDF: `pdf-parse` library with Vision API fallback
  - DOCX: `mammoth` library
  - TXT: Native Buffer parsing
  - Images: GPT-4o Vision API for OCR

#### 2. AI Analysis (GPT-4o)
- **Summary:** 2-3 sentence concise overview
- **Classification:** Document category (Invoice, Contract, Resume, etc.)
- **Entity Extraction:** Named entities (Person, Organization, Location, Date, Other)
- Stores extracted content in PostgreSQL for search

#### 3. Custom Tags Feature (NEW)
- Users can add multiple custom tags to documents
- 6 color options: red, blue, green, purple, yellow, gray
- Tag management UI in DocumentDetail page
- Real-time cache invalidation with TanStack Query
- Database schema includes `tags` table with relationships

### Database Schema

#### Tables
- **documents:** Core document metadata + AI results
  - id, filename, originalName, mimeType, size, content, summary, classification, status, error, createdAt

- **entities:** Extracted entities linked to documents
  - id, documentId, entityType, value

- **tags:** Custom organization tags (NEW)
  - id, documentId, name, color, createdAt

#### Relations
- documents → many entities
- documents → many tags
- One-to-many relationships with foreign keys

### API Endpoints

#### Documents
- `GET /api/documents` - List all documents (with semantic search via query param)
- `GET /api/documents/:id` - Get document details with entities and tags
- `POST /api/documents` - Upload and process document
- `DELETE /api/documents/:id` - Delete document

#### Tags (NEW)
- `POST /api/documents/:id/tags` - Add tag to document
- `DELETE /api/tags/:tagId` - Remove tag from document

### Frontend Components

#### Pages
- **Dashboard.tsx** - Main page with document list, search, upload button
- **DocumentDetail.tsx** - Full document view with AI analysis and tag management

#### Components
- **DocumentCard.tsx** - Preview card in list (shows first 3 tags + count)
- **UploadDialog.tsx** - Drag-and-drop upload interface
- **TagManager.tsx** (NEW) - Tag creation and management UI

### File Structure
```
/server
  - index.ts (Express server setup)
  - routes.ts (API endpoints)
  - storage.ts (Database abstraction)
  - processor.ts (AI analysis)
  - db.ts (Drizzle setup)
  - vite.ts (Vite server integration)

/shared
  - schema.ts (Drizzle schema + Zod types)
  - routes.ts (API route definitions)

/client/src
  - pages/ (Dashboard, DocumentDetail, NotFound)
  - components/ (DocumentCard, UploadDialog, TagManager, UI)
  - hooks/ (useDocuments, useDocument, useUploadDocument, useDeleteDocument)
  - lib/ (queryClient, utils)
```

## Known Implementation Details

### PDF Processing Fallback
- Primary: pdf-parse CJS library
- Fallback: GPT-4o Vision API if pdf-parse fails
- Ensures robustness for various PDF formats

### Storage
- Document content (extracted text) stored in PostgreSQL
- Tags attached to documents via document ID
- Entities linked to documents via document ID

### Query Caching
- TanStack Query caches documents by path and ID
- Cache invalidation on create/delete/update operations
- Semantic search cache key includes query parameter

### Tag UI
- 6 color presets with light/dark mode variants
- Tag display with X button for deletion
- Add via input field or Enter key
- Real-time form validation (non-empty tag names)

## Recent Additions (Session 3)

### Custom Tags System
1. **Database:** Added `tags` table with documentId, name, color, createdAt
2. **Storage:** 4 new methods - createTag, deleteTag, getTagsForDocument
3. **API:** POST/DELETE routes for tag management
4. **Frontend:** TagManager component with color picker and inline add/remove
5. **Integration:** Tags displayed on DocumentCard (preview) and DocumentDetail (full management)

### Modern UI/UX Enhancements (Session 3)
1. **Animations:** 
   - Fade-in-up and fade-in-down entrance animations
   - Shimmer loading skeleton effect
   - Pulse-glow effect on interactive elements
   - Staggered card animations with animation delays

2. **Visual Polish:**
   - Enhanced shadow system (shadow-elevation, shadow-elevation-lg)
   - Smooth transitions throughout (transition-smooth class)
   - Improved spacing and padding (p-6 header, larger gaps)
   - Better rounded corners (rounded-2xl, rounded-3xl)
   - Gradient text and background effects

3. **Component Updates:**
   - Header: Animated sparkles icon, gradient text, larger typography
   - Search: Better focus states with ring focus indicators
   - DocumentCard: Hover lift effect, icon scale animation, improved shadows
   - UploadDialog: Smooth animations, better drag-drop visual feedback
   - Empty state: Improved icon containers with gradient backgrounds

4. **Interactive Feedback:**
   - Card hover states with scale and elevation changes
   - Icon scaling on hover
   - Smooth button transitions with shadow elevation
   - Visual feedback on drag-over areas
   - Better error and loading state presentations

### Code Quality
- Test IDs added to interactive elements for testing
- Type-safe with TypeScript throughout
- Zod schema validation on backend
- Error handling with user-friendly toasts

## Environment Variables
- `AI_INTEGRATIONS_OPENAI_API_KEY` - Replit AI Integration
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - Replit AI Integration
- `DATABASE_URL` - PostgreSQL connection string

## Deployment Status
- ✅ Database migrated with `npm run db:push`
- ✅ API routes implemented
- ✅ Frontend components created
- ✅ PDF processing with fallback
- ✅ Custom tags feature complete
- Ready for production deployment
