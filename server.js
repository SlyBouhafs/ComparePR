const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files with correct MIME types
app.use(express.static('public', {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        } else if (filePath.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html');
        }
    }
}));

// Proxy endpoint for GitHub API
app.post('/api/github-proxy', async (req, res) => {
    const { url, token } = req.body;

    if (!url || !token) {
        return res.status(400).json({ error: 'URL and token are required' });
    }

    try {
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });

        res.json(response.data);
    } catch (error) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || error.message;
        res.status(status).json({ error: message });
    }
});

app.patch('/api/github-comment', async (req, res) => {
    const { url, token, body } = req.body;

    if (!url || !token || !body) {
        return res.status(400).json({ error: 'URL, token, and body are required' });
    }

    try {
        const response = await axios.patch(url,
            { body }, // Request body
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'X-GitHub-Api-Version': '2022-11-28'
                }
            }
        );

        res.json(response.data);
    } catch (error) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || error.message;
        res.status(status).json({ error: message });
    }
});

// Catch-all route for SPA - must be last
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});