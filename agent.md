# Agent Registry

Documentation of active AI agents in the Ebook Creator Studio ecosystem.

## 1. Agent A (The Architect)
**Role**: Structural Designer. Creates the blueprint and chapter outline for the book.
**Integration**: Notion (Status Trigger: "Generating Content").
**Key Functions**:
- Generates a complete 10-chapter outline based on the book idea.
- Creates individual chapter pages in Notion.
- Sets the foundation for Agent B to write content.

## 2. Agent B (The Content Generator)
**Role**: Generates ebook content, structures chapters, and manages Google Drive permissions for images.
**Integration**: Notion, n8n.
**Key Functions**:
- Generates content for 3-chapter test ebooks and full 10-chapter books.
- Automates public permission settings for Google Drive images.

## 2. Agent D (The Book Binder)
**Role**: Compiles ebook content into a formatted Google Doc.
**Integration**: n8n Webhook.
**Webhook Endpoint**: `https://flow.supralawyer.com/webhook/book-binder` (Environment Variable: `N8N_BOOK_BINDER_WEBHOOK`)
**Key Functions**:
- Receives `projectId` via webhook.
- Fetches all chapter content from Notion.
- Generates an editable Google Doc with formatting, TOC, and page numbers.
- Embeds images (converting Notion/Drive links).

## 3. Webmaster Agent
**Role**: Manages WordPress content and site health.
**Integration**: n8n, WordPress, CEO Brain.
**Key Functions**:
- Writes and posts articles to WordPress.
- Performs SEO audits and health checks.
- Edits pages based on instructions.

## 4. AI Influencer Agent
**Role**: Creates social media content and manages influencer personas.
**Integration**: Kie.ai (Image Gen), n8n.
**Key Functions**:
- Generates image prompts and video scripts.
- Creates visual content based on product and persona data.

## 5. CEO Brain
**Role**: Strategic planning and task orchestration.
**Key Functions**:
- Analyzes product stage and sales strategy.
- Assigns tasks to the Webmaster Agent and others.
