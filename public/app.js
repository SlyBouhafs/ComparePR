let token = localStorage.getItem('githubToken') || '';

if (token) {
    showMainContent();
}

document.getElementById('loginBtn').addEventListener('click', () => {
    const input = document.getElementById('tokenInput');
    const newToken = input.value.trim();

    if (newToken) {
        token = newToken;
        localStorage.setItem('githubToken', token);
        showMainContent();
    }
});

document.getElementById('disconnectBtn').addEventListener('click', () => {
    token = '';
    localStorage.removeItem('githubToken');
    showLoginScreen();
});

document.getElementById('pr1Btn').addEventListener('click', () => loadPR(1));
document.getElementById('pr2Btn').addEventListener('click', () => loadPR(2));
document.getElementById('pr3Btn').addEventListener('click', () => loadPR(3));

function showMainContent() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mainContent').classList.remove('hidden');
    document.getElementById('disconnectBtn').classList.remove('hidden');
}

function showLoginScreen() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('mainContent').classList.add('hidden');
    document.getElementById('disconnectBtn').classList.add('hidden');
}

function parsePRUrl(url) {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
    if (match) {
        return { owner: match[1], repo: match[2], number: match[3] };
    }
    return null;
}

async function fetchFromGitHub(url) {
    const response = await fetch('/api/github-proxy', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url, token })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
}

async function loadPR(index) {
    const input = document.getElementById(`pr${index} Input`);
    const error = document.getElementById(`pr${index} Error`);
    const errorText = document.getElementById(`pr${index} ErrorText`);
    const loading = document.getElementById(`pr${index} Loading`);
    const content = document.getElementById(`pr${index} Content`);
    const btn = document.getElementById(`pr${index} Btn`);

    const prUrl = input.value.trim();
    const parsed = parsePRUrl(prUrl);

    if (!parsed) {
        errorText.textContent = 'Invalid PR URL format. Use: https://github.com/owner/repo/pull/123';
        error.classList.remove('hidden');
        return;
    }

    error.classList.add('hidden');
    loading.classList.remove('hidden');
    content.innerHTML = '';
    btn.disabled = true;

    try {
        const baseUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`;

        const [pr, comments, reviewComments, reviews] = await Promise.all([
            fetchFromGitHub(`${baseUrl}/pulls/${parsed.number}`),
            fetchFromGitHub(`${baseUrl}/issues/${parsed.number}/comments`),
            fetchFromGitHub(`${baseUrl}/pulls/${parsed.number}/comments`),
            fetchFromGitHub(`${baseUrl}/pulls/${parsed.number}/reviews`)
        ]);

        renderPRContent(content, pr, comments, reviewComments, reviews);
    } catch (err) {
        errorText.textContent = err.message;
        error.classList.remove('hidden');
    } finally {
        loading.classList.add('hidden');
        btn.disabled = false;
    }
}

function renderPRContent(container, pr, comments, reviewComments, reviews) {
    let html = `
    <div class="pr-info">
      <h3>${escapeHtml(pr.title)}</h3>
      <p><strong>#${pr.number}</strong> by ${escapeHtml(pr.user.login)}</p>
      <p>State: ${pr.state} • Base: ${pr.base.ref} ← Head: ${pr.head.ref}</p>
    </div>
  `;

    const generalComments = comments.filter(c => c.body);
    if (generalComments.length > 0) {
        html += `
      <div class="comment-section">
        <div class="section-header">
          <h4>💬 General Comments (${generalComments.length})</h4>
        </div>
        ${generalComments.map(c => `
          <div class="comment general">
            <div class="comment-meta">${escapeHtml(c.user.login)} • ${new Date(c.created_at).toLocaleString()}</div>
            <div class="comment-body">${escapeHtml(c.body)}</div>
          </div>
        `).join('')}
      </div>
    `;
    }

    const validReviewComments = reviewComments.filter(c => c.body).sort((a, b) => {
        const lineA = a.line ?? a.original_line ?? 0;
        const lineB = b.line ?? b.original_line ?? 0;
        return lineA - lineB;
    });;

    if (validReviewComments.length > 0) {
        html += `
    <div class="comment-section">
      <div class="section-header">
        <h4>📄 Review Comments (${validReviewComments.length})</h4>
      </div>
      ${validReviewComments.map(c => `
        <div class="comment review">
          <div class="comment-meta">${escapeHtml(c.user.login)} on ${escapeHtml(c.path)}:${c.line || c.original_line}</div>
          <div class="comment-body">${escapeHtml(c.body)}</div>
        </div>
      `).join('')}
    </div>
  `;
    }

    const validReviews = reviews.filter(r => r.body);
    if (validReviews.length > 0) {
        html += `
      <div class="comment-section">
        <div class="section-header">
          <h4>🔍 Reviews (${validReviews.length})</h4>
        </div>
        ${validReviews.map(r => `
          <div class="comment summary">
            <div class="comment-meta">${escapeHtml(r.user.login)} • ${r.state}</div>
            <div class="comment-body">${escapeHtml(r.body)}</div>
          </div>
        `).join('')}
      </div>
    `;
    }

    if (generalComments.length === 0 && validReviewComments.length === 0 && validReviews.length === 0) {
        html += '<p style="text-align: center; color: #6b7280; padding: 40px;">No comments found for this PR.</p>';
    }

    container.innerHTML = html;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
