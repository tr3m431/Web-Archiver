import React, { useState, useEffect } from 'react';
import { Archive, Clock, Download, RefreshCw, Globe, Calendar, Eye, Plus } from 'lucide-react';
import axios from 'axios';

const WebArchiver = () => {
  const [url, setUrl] = useState('');
  const [archives, setArchives] = useState([]);
  const [isArchiving, setIsArchiving] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState(null);
  const [viewingArchive, setViewingArchive] = useState(false);
  const [archivedContent, setArchivedContent] = useState('');
  const [status, setStatus] = useState('');

  const API_BASE = process.env.REACT_APP_API_URL || '/api';

  // Load archives on component mount
  useEffect(() => {
    loadArchives();
  }, []);

  const loadArchives = async () => {
    try {
      const response = await axios.get(`${API_BASE}/archives`);
      setArchives(response.data);
    } catch (error) {
      console.error('Failed to load archives:', error);
      setStatus('Error: Failed to load archives');
    }
  };

  // Real backend API calls
  const archiveUrl = async (targetUrl) => {
    setIsArchiving(true);
    setStatus('Starting archive process...');
    
    try {
      const response = await axios.post(`${API_BASE}/archives`, { url: targetUrl });
      const newArchive = response.data;
      
      setArchives(prev => [newArchive, ...prev.filter(a => a.id !== newArchive.id)]);
      setStatus(`Archive completed! Captured ${newArchive.pagesArchived} pages and ${newArchive.assetsArchived} assets.`);
      setUrl(''); // Clear the input
    } catch (error) {
      console.error('Archive failed:', error);
      setStatus(`Error: ${error.response?.data?.error || 'Failed to archive URL'}`);
    } finally {
      setIsArchiving(false);
    }
  };

  const viewArchive = async (archive) => {
    setSelectedArchive(archive);
    setViewingArchive(true);
    setStatus('Loading archived content...');
    
    try {
      // Load the main page of the archive
      const mainPage = archive.pages?.[0];
      if (mainPage) {
        const response = await axios.get(`${API_BASE}/archives/${archive.id}/pages/${mainPage.filename}`);
        setArchivedContent(response.data);
      } else {
        setArchivedContent(`
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 2px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
            <h1>Archive Details for ${archive.url}</h1>
            <p><strong>Archived on:</strong> ${new Date(archive.timestamp).toLocaleString()}</p>
            <p><strong>Pages captured:</strong> ${archive.pagesArchived}</p>
            <p><strong>Assets captured:</strong> ${archive.assetsArchived || 0}</p>
            <p><strong>Total size:</strong> ${archive.totalSize}</p>
            <hr style="margin: 20px 0;"/>
            <h2>Archive Summary</h2>
            <p>This archive contains a snapshot of the website as it appeared on the capture date.</p>
            <p>All linked pages within the same domain have been preserved along with their assets.</p>
          </div>
        `);
      }
      setStatus('');
    } catch (error) {
      setStatus('Error loading archived content');
      setArchivedContent('<p>Failed to load archived content.</p>');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    
    // Basic URL validation
    try {
      new URL(url);
      archiveUrl(url);
    } catch {
      setStatus('Error: Please enter a valid URL');
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Archive className="w-8 h-8 text-indigo-600" />
            <h1 className="text-4xl font-bold text-gray-800">Web Archiver</h1>
          </div>
          <p className="text-gray-600 text-lg">Preserve websites for posterity, just like the Wayback Machine</p>
        </div>

        {!viewingArchive ? (
          <>
            {/* Archive Form */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8 max-w-2xl mx-auto">
              <div className="space-y-4">
                <div>
                  <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                    <Globe className="inline w-4 h-4 mr-1" />
                    Website URL to Archive
                  </label>
                  <input
                    type="url"
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    disabled={isArchiving}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                  />
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={isArchiving || !url.trim()}
                  className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isArchiving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Archiving...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Archive
                    </>
                  )}
                </button>
              </div>
              
              {status && (
                <div className={`mt-4 p-3 rounded-lg ${
                  status.includes('Error') 
                    ? 'bg-red-100 text-red-700 border border-red-200' 
                    : 'bg-blue-100 text-blue-700 border border-blue-200'
                }`}>
                  {status}
                </div>
              )}
            </div>

            {/* Archives List */}
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Clock className="w-6 h-6" />
                Archived Snapshots ({archives.length})
              </h2>
              
              {archives.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Archive className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">No archives yet</p>
                  <p>Enter a URL above to create your first archive</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {archives.map((archive) => (
                    <div key={archive.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-gray-800 truncate">{archive.url}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(archive.timestamp)}
                            </span>
                            <span>{archive.pagesArchived} pages</span>
                            <span>{archive.assetsArchived || 0} assets</span>
                            <span>{archive.totalSize}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => archiveUrl(archive.url)}
                            disabled={isArchiving}
                            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 flex items-center gap-1"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Re-archive
                          </button>
                          <button
                            onClick={() => viewArchive(archive)}
                            className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          /* Archive Viewer */
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Viewing Archive</h2>
              <button
                onClick={() => {setViewingArchive(false); setSelectedArchive(null);}}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                ← Back to Archives
              </button>
            </div>
            
            {selectedArchive && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span><strong>URL:</strong> {selectedArchive.url}</span>
                  <span><strong>Archived:</strong> {formatDate(selectedArchive.timestamp)}</span>
                </div>
              </div>
            )}
            
            <div 
              className="border rounded-lg p-4 bg-gray-50 min-h-96"
              dangerouslySetInnerHTML={{ __html: archivedContent }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default WebArchiver;