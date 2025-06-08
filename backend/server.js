const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');
const { URL } = require('url');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/archives', express.static('archives'));

// In-memory storage for demo (use database in production)
let archives = [];

// Utility functions
const generateId = () => crypto.randomBytes(16).toString('hex');

const sanitizeFilename = (filename) => {
  return filename.replace(/[^a-z0-9.-]/gi, '_');
};

const getArchiveDir = (archiveId) => {
  return path.join(__dirname, 'archives', archiveId);
};

const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

const isSameDomain = (url1, url2) => {
  try {
    const domain1 = new URL(url1).hostname;
    const domain2 = new URL(url2).hostname;
    return domain1 === domain2;
  } catch (_) {
    return false;
  }
};

// Download and save a resource (HTML, CSS, JS, images)
const downloadResource = async (url, archiveDir, resourcePath = '') => {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'Web-Archiver/1.0'
      }
    });

    const urlObj = new URL(url);
    const filename = sanitizeFilename(urlObj.pathname === '/' ? 'index.html' : urlObj.pathname);
    const filePath = path.join(archiveDir, resourcePath, filename);
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    // Save the file
    await fs.writeFile(filePath, response.data);
    
    return {
      success: true,
      localPath: path.join(resourcePath, filename),
      contentType: response.headers['content-type'],
      size: response.data.length
    };
  } catch (error) {
    console.error(`Failed to download ${url}:`, error.message);
    return { success: false, error: error.message };
  }
};

// Extract and download all assets from HTML
const processHtmlContent = async (html, baseUrl, archiveDir) => {
  const $ = cheerio.load(html);
  const assets = [];
  const links = [];

  // Extract same-domain links
  $('a[href]').each((i, el) => {
    const href = $(el).attr('href');
    if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
      try {
        const fullUrl = new URL(href, baseUrl).toString();
        if (isSameDomain(fullUrl, baseUrl)) {
          links.push(fullUrl);
        }
      } catch (e) {
        // Invalid URL, skip
      }
    }
  });

  // Extract and download CSS files
  $('link[rel="stylesheet"]').each(async (i, el) => {
    const href = $(el).attr('href');
    if (href) {
      try {
        const fullUrl = new URL(href, baseUrl).toString();
        const result = await downloadResource(fullUrl, archiveDir, 'css');
        if (result.success) {
          $(el).attr('href', `/archives/${path.basename(archiveDir)}/css/${path.basename(result.localPath)}`);
          assets.push({ type: 'css', url: fullUrl, status: 'downloaded' });
        }
      } catch (e) {
        assets.push({ type: 'css', url: href, status: 'failed' });
      }
    }
  });

  // Extract and download JavaScript files
  $('script[src]').each(async (i, el) => {
    const src = $(el).attr('src');
    if (src) {
      try {
        const fullUrl = new URL(src, baseUrl).toString();
        const result = await downloadResource(fullUrl, archiveDir, 'js');
        if (result.success) {
          $(el).attr('src', `/archives/${path.basename(archiveDir)}/js/${path.basename(result.localPath)}`);
          assets.push({ type: 'js', url: fullUrl, status: 'downloaded' });
        }
      } catch (e) {
        assets.push({ type: 'js', url: src, status: 'failed' });
      }
    }
  });

  // Extract and download images
  $('img[src]').each(async (i, el) => {
    const src = $(el).attr('src');
    if (src) {
      try {
        const fullUrl = new URL(src, baseUrl).toString();
        const result = await downloadResource(fullUrl, archiveDir, 'images');
        if (result.success) {
          $(el).attr('src', `/archives/${path.basename(archiveDir)}/images/${path.basename(result.localPath)}`);
          assets.push({ type: 'image', url: fullUrl, status: 'downloaded' });
        }
      } catch (e) {
        assets.push({ type: 'image', url: src, status: 'failed' });
      }
    }
  });

  return {
    processedHtml: $.html(),
    assets,
    links: [...new Set(links)] // Remove duplicates
  };
};

// Recursively archive pages
const archivePage = async (url, archiveDir, visited = new Set(), maxDepth = 2, currentDepth = 0) => {
  if (visited.has(url) || currentDepth > maxDepth) {
    return { pages: [], assets: [] };
  }

  visited.add(url);
  console.log(`Archiving page: ${url} (depth: ${currentDepth})`);

  try {
    // Download the main HTML
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Web-Archiver/1.0'
      }
    });

    const html = response.data;
    const { processedHtml, assets, links } = await processHtmlContent(html, url, archiveDir);

    // Save the processed HTML
    const urlObj = new URL(url);
    const filename = sanitizeFilename(urlObj.pathname === '/' ? 'index.html' : urlObj.pathname.split('/').pop() || 'page.html');
    const htmlPath = path.join(archiveDir, 'pages', filename);
    
    await fs.mkdir(path.dirname(htmlPath), { recursive: true });
    await fs.writeFile(htmlPath, processedHtml);

    let allPages = [{
      url,
      filename,
      size: html.length,
      timestamp: new Date().toISOString()
    }];
    let allAssets = assets;

    // Recursively archive linked pages
    if (currentDepth < maxDepth) {
      for (const link of links.slice(0, 10)) { // Limit to 10 links to prevent infinite recursion
        const result = await archivePage(link, archiveDir, visited, maxDepth, currentDepth + 1);
        allPages = allPages.concat(result.pages);
        allAssets = allAssets.concat(result.assets);
      }
    }

    return { pages: allPages, assets: allAssets };
  } catch (error) {
    console.error(`Failed to archive ${url}:`, error.message);
    return { pages: [], assets: [] };
  }
};

// API Routes

// Get all archives
app.get('/api/archives', (req, res) => {
  res.json(archives);
});

// Create new archive
app.post('/api/archives', async (req, res) => {
  const { url } = req.body;

  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: 'Invalid URL provided' });
  }

  const archiveId = generateId();
  const timestamp = new Date().toISOString();
  const archiveDir = getArchiveDir(archiveId);

  try {
    // Create archive directory
    await fs.mkdir(archiveDir, { recursive: true });

    // Start archiving process
    const result = await archivePage(url, archiveDir);

    // Calculate total size
    const totalSize = result.pages.reduce((sum, page) => sum + page.size, 0) +
                     result.assets.reduce((sum, asset) => sum + (asset.size || 0), 0);

    const archive = {
      id: archiveId,
      url,
      timestamp,
      status: 'completed',
      pagesArchived: result.pages.length,
      assetsArchived: result.assets.length,
      totalSize: Math.round(totalSize / 1024) + 'KB',
      pages: result.pages,
      assets: result.assets
    };

    // Save archive metadata
    await fs.writeFile(
      path.join(archiveDir, 'metadata.json'),
      JSON.stringify(archive, null, 2)
    );

    archives.unshift(archive);
    res.json(archive);

  } catch (error) {
    console.error('Archive creation failed:', error);
    res.status(500).json({ error: 'Failed to create archive' });
  }
});

// Get specific archive
app.get('/api/archives/:id', (req, res) => {
  const { id } = req.params;
  const archive = archives.find(a => a.id === id);
  
  if (!archive) {
    return res.status(404).json({ error: 'Archive not found' });
  }
  
  res.json(archive);
});

// Serve archived pages
app.get('/api/archives/:id/pages/:filename', async (req, res) => {
  const { id, filename } = req.params;
  const archiveDir = getArchiveDir(id);
  const filePath = path.join(archiveDir, 'pages', filename);

  try {
    const content = await fs.readFile(filePath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.send(content);
  } catch (error) {
    res.status(404).json({ error: 'Page not found' });
  }
});

// Delete archive
app.delete('/api/archives/:id', async (req, res) => {
  const { id } = req.params;
  const archiveIndex = archives.findIndex(a => a.id === id);
  
  if (archiveIndex === -1) {
    return res.status(404).json({ error: 'Archive not found' });
  }

  try {
    // Remove archive directory
    const archiveDir = getArchiveDir(id);
    await fs.rmdir(archiveDir, { recursive: true });
    
    // Remove from memory
    archives.splice(archiveIndex, 1);
    
    res.json({ message: 'Archive deleted successfully' });
  } catch (error) {
    console.error('Failed to delete archive:', error);
    res.status(500).json({ error: 'Failed to delete archive' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Web Archiver API running on port ${PORT}`);
  console.log(`Archives will be stored in: ${path.join(__dirname, 'archives')}`);
});

module.exports = app;
