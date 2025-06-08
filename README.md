# Web-Archiver

A complete web archiving solution similar to the Wayback Machine, built with React frontend and Node.js backend.

## Features

- **URL Archiving**: Enter any URL to create a complete snapshot
- **Recursive Crawling**: Automatically discovers and archives linked pages on the same domain
- **Asset Preservation**: Downloads and stores HTML, CSS, JavaScript, images, and other assets
- **Version History**: Maintains timestamped snapshots for each archived site
- **Manual Re-archiving**: Trigger new snapshots on demand
- **Snapshot Comparison**: Visual diff tool to compare changes between archived versions
- **Automatic Scheduling**: Optional weekly auto-archiving for important sites

## Quick Start

### Prerequisites
- Node.js 16+ and npm
- Modern web browser

### Installation

1. **Clone and setup:**
```bash
git clone <repository-url>
cd web-archiver
npm install
```

2. **Start the application:**
```bash
# Start backend server (port 3001)
npm run server

# Start frontend (port 3000) - in a new terminal
npm start
```

3. **Access the application:**
Open http://localhost:3000 in your browser

## Usage

1. **Archive a Website:**
   - Enter a URL in the input field
   - Click "Archive Site" 
   - Wait for the crawling process to complete

2. **View Archives:**
   - Select a site from the archived sites list
   - Choose a timestamp to view that specific snapshot
   - Click "View Archive" to see the preserved version

3. **Compare Versions:**
   - Select two different timestamps for the same site
   - Use the comparison tool to see what changed

4. **Re-archive:**
   - Click "Re-archive" next to any existing site to capture an updated snapshot

## Architecture

### Frontend (React)
- **Components**: Modular UI components for archiving, viewing, and comparing
- **State Management**: React hooks for managing application state
- **Styling**: Tailwind CSS for responsive design

### Backend (Node.js + Express)
- **Web Crawling**: Puppeteer for page rendering and asset extraction
- **URL Processing**: Recursive link discovery with same-domain filtering
- **Asset Management**: Downloads and stores all page dependencies
- **Data Storage**: File-based storage with JSON metadata

### Storage Structure
```
archives/
├── metadata.json          # Site and version metadata
├── site1.com/
│   ├── 2024-01-15-10-30/  # Timestamp folder
│   │   ├── index.html
│   │   ├── assets/
│   │   └── pages/
│   └── 2024-01-20-14-45/
└── site2.com/
```

## Technical Decisions

### Key Trade-offs

1. **File-based Storage vs Database**
   - **Chosen**: File-based storage for simplicity and quick setup
   - **Trade-off**: Easier development but less scalable than database solutions
   - **Production**: Would use MongoDB/PostgreSQL for metadata + S3 for assets

2. **Puppeteer vs Simple HTTP Requests**
   - **Chosen**: Puppeteer for JavaScript-heavy sites
   - **Trade-off**: Higher resource usage but better compatibility
   - **Alternative**: Cheerio for simpler sites, hybrid approach for production

3. **Recursive Crawling Depth**
   - **Chosen**: Limited to same-domain with configurable depth
   - **Trade-off**: Prevents infinite crawling but may miss some content
   - **Production**: Would add intelligent crawling limits and robots.txt respect

## Scaling for Production

### Immediate Improvements (More Time)
- **Database Integration**: PostgreSQL for metadata, Redis for caching
- **Cloud Storage**: AWS S3 or similar for archived assets
- **Queue System**: Bull/Bee-Queue for background archiving jobs
- **Error Handling**: Comprehensive retry logic and failure recovery
- **Testing**: Unit tests, integration tests, and performance benchmarks

### Production Architecture
```
Load Balancer → API Gateway → Microservices
                            ├── Crawler Service (Kubernetes pods)
                            ├── Storage Service (S3 + RDS)
                            ├── Comparison Service
                            └── Scheduler Service (Cron jobs)
```

### Scalability Features
- **Distributed Crawling**: Multiple worker nodes for large sites
- **CDN Integration**: CloudFront for fast archive delivery
- **Caching Strategy**: Multi-level caching (Redis, CDN, browser)
- **Rate Limiting**: Respect robots.txt and implement intelligent delays
- **Monitoring**: Full observability with metrics, logs, and alerts

## Development Notes

### Performance Optimizations
- Concurrent page fetching with connection pooling
- Intelligent asset deduplication
- Compressed storage for HTML/CSS/JS files
- Lazy loading for large archive lists

### Security Considerations
- Input validation and sanitization
- CORS configuration
- Rate limiting on archive requests
- Malware scanning for downloaded content

## Future Enhancements

- **Search Functionality**: Full-text search across archived content
- **API Access**: RESTful API for programmatic access
- **Browser Extension**: One-click archiving from any webpage
- **Collaborative Features**: Share archives and collaborate on important sites
- **Analytics Dashboard**: Insights on archiving patterns and site changes
