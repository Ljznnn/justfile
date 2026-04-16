# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JustFile is a file processing toolkit with a desktop application and backend service. The desktop app provides image compression, image upload (to GitHub), PDF editing, and file sharing features.

## Project Structure

```
justfile/
├── desktop/    # Electron + Vue 3 desktop application
├── backend/    # Spring Boot backend service (file sharing)
└── mobile/     # Mobile app (placeholder, not implemented)
```

## Backend (Spring Boot 3.2.4 + Java 17)

### Build and Run

```bash
cd backend
mvn spring-boot:run                    # Run in development
mvn clean package                      # Build JAR
java -jar target/justfile-backend-1.0.0.jar
```

### Architecture

- **API Base Path**: `/justfile` (all endpoints are under this context path)
- **Database**: MySQL with MyBatis Plus ORM
- **Storage**: Strategy pattern supporting Local, Aliyun OSS, and HDFS backends
- **Upload Protocol**: TUS protocol for resumable chunked uploads

### Key Components

- `StorageStrategy` interface - Abstraction for storage backends (Local/OSS/HDFS)
- `TusService` - Manages resumable uploads with TUS protocol
- `ShareService` - Handles share creation, joining, permissions
- `FileService` - File operations (list, download, delete)

### Configuration

Configuration is in `application.yml`. Key settings:
- `storage.type` - Storage backend: `LOCAL`, `OSS`, or `HDFS`
- `tus.max-size` - Maximum upload size (default 500MB)
- `share.code-length` - Share code length (default 6 characters)

Environment variables override YAML:
- `DB_USERNAME`, `DB_PASSWORD` - Database credentials
- `STORAGE_TYPE`, `STORAGE_PATH` - Storage configuration
- `OSS_*` - Aliyun OSS credentials

## Desktop (Electron + Vue 3 + TypeScript)

### Build and Run

```bash
cd desktop
npm install
npm run dev          # Start development server with hot reload
npm run build        # Build for production (TypeScript check + Vite build + Electron builder)
npm run lint         # Run ESLint
```

### Architecture

**Main Process** (`electron/main.ts`):
- Creates frameless window with custom title bar
- Registers IPC handlers for file operations
- Handles window controls (minimize, maximize, close)

**Renderer Process** (Vue 3):
- `src/views/` - Page components (Home, ImageCompress, ImageUpload, FileShare, etc.)
- `src/stores/` - Pinia stores (settings, theme, features, share)
- `src/components/` - Reusable components
- `src/api/` - API client modules

**IPC Communication** (`electron/ipc/`):
- `index.ts` - File dialogs, settings persistence
- `image.ts` - Image processing operations
- `document.ts` - PDF operations

### Key Patterns

- Settings are persisted via IPC to `userData/settings.json`
- File operations use native dialogs through IPC
- The app uses hash-based routing (`createWebHashHistory`)

## Coding Rules

- 代码注释使用中文，Git 提交信息也使用中文
- 前端控件优先使用 Element Plus，并适配项目的 UI 风格（毛玻璃、圆角等）

## File Sharing Feature

The file sharing system allows users to create share sessions with unique codes:

1. **Create Share**: Generates a 6-character code, creator becomes first member
2. **Join Share**: Enter code + optional password to join
3. **Upload Files**: TUS protocol for resumable uploads
4. **Permissions**: Creator-only or all-members upload modes

### API Endpoints

- `POST /api/shares` - Create share
- `GET /api/shares/{code}` - Get share info
- `POST /api/shares/{code}/join` - Join share
- `POST /api/tus/{shareId}` - Create TUS upload session
- `PATCH /api/tus/{tusId}` - Upload chunk
- `GET /api/files/share/{shareId}` - List files
- `GET /api/files/{fileId}/download` - Download file

### Member Identification

Members are identified by browser fingerprint (generated client-side), passed in `X-Fingerprint` header.
