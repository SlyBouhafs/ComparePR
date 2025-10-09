
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



function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    if (type === 'info') notification.innerHTML = `<i class="bx bx-info-circle"></i> <span>${message}</span>`;
    if (type === 'success') notification.innerHTML = `<i class="bx bx-check-circle"></i> <span>${message}</span>`;
    if (type === 'error') notification.innerHTML = `<i class="bx bx-x-circle"></i> <span>${message}</span>`;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}


async function copyToClipboard(content, element) {
    try {
        await navigator.clipboard.writeText(content);
        const span = element.querySelector('span');
        span.style.visibility = 'visible';
        span.style.opacity = '1';
        setTimeout(() => {
            span.style.visibility = 'hidden';
            span.style.opacity = '0';
        }, 500);
    } catch (err) {
        console.error('Failed to copy text:', err);
    }
}

function setupCopyButtons() {
    document.addEventListener('click', e => {
        const btn = e.target.closest('.copy-btn');
        if (!btn) return;
        const content = btn.dataset.copy;
        copyToClipboard(content, btn);
    });
}


function setupEditButtons(container) {

    const editButtons = container.querySelectorAll('.edit-btn');

    editButtons.forEach((btn, index) => {

        // Remove any existing listeners
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const commentDiv = this.closest('.comment');
            if (!commentDiv) {
                console.error('Could not find comment div');
                return;
            }

            const commentBody = commentDiv.querySelector('.comment-body');
            if (!commentBody) {
                console.error('Could not find comment body');
                return;
            }

            const originalText = this.dataset.text;
            const commentId = this.dataset.commentId;
            const commentType = this.dataset.commentType;

            console.log('Comment data:', { originalText, commentId, commentType });

            // Check if already editing
            if (commentBody.querySelector('textarea')) {
                console.log('Already editing');
                return;
            }

            // Create textarea
            const textarea = document.createElement('textarea');
            textarea.className = 'edit-textarea';
            textarea.value = originalText;

            // Create button container
            const btnContainer = document.createElement('div');
            btnContainer.className = 'edit-actions';

            const saveBtn = document.createElement('button');
            saveBtn.className = 'save-btn';
            saveBtn.innerHTML = '<i class="bx bxs-save"></i>';

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'cancel-btn';
            cancelBtn.innerHTML = '<i class="bx bxs-x"></i>';

            btnContainer.appendChild(saveBtn);
            btnContainer.appendChild(cancelBtn);

            // Replace content with textarea
            commentBody.innerHTML = '';
            commentBody.appendChild(textarea);
            commentBody.appendChild(btnContainer);

            // Focus textarea
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);

            // Cancel button
            cancelBtn.addEventListener('click', () => {
                commentBody.innerHTML = `<md-block>${escapeHtml(originalText)}</md-block>`;
            });

            // Save button - sync with GitHub
            saveBtn.addEventListener('click', async () => {
                const newText = textarea.value.trim();

                if (!newText) {
                    alert('Comment cannot be empty');
                    return;
                }

                if (newText === originalText) {
                    commentBody.innerHTML = `<md-block>${escapeHtml(originalText)}</md-block>`;
                    return;
                }

                // Disable button and show loading
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i class="bx bx-loader-dots bx-spin"></i>';

                try {
                    // Determine the API URL based on comment type
                    const prUrlMatch = window.currentPRUrl.match(/github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
                    if (!prUrlMatch) {
                        throw new Error('Invalid PR URL');
                    }

                    const [, owner, repo] = prUrlMatch;
                    let apiUrl;

                    if (commentType === 'issue') {
                        apiUrl = `https://api.github.com/repos/${owner}/${repo}/issues/comments/${commentId}`;
                    } else if (commentType === 'review') {
                        apiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/comments/${commentId}`;
                    } else {
                        throw new Error('Unknown comment type');
                    }

                    const response = await fetch('/api/github-comment', {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            url: apiUrl,
                            token: token,
                            body: newText
                        })
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to update comment');
                    }

                    // Success - update UI
                    newBtn.dataset.text = newText;
                    commentBody.innerHTML = `<md-block>${escapeHtml(newText)}</md-block>`;

                    // Add edited indicator
                    const commentMeta = commentDiv.querySelector('.comment-meta');
                    if (commentMeta && !commentMeta.querySelector('.edited-badge')) {
                        const editedBadge = document.createElement('span');
                        editedBadge.className = 'edited-badge';
                        editedBadge.textContent = '(edited)';
                        commentMeta.appendChild(editedBadge);
                    }

                    // Show success message
                    showNotification('Comment updated successfully!', 'success');

                } catch (error) {
                    console.error('Error updating comment:', error);
                    alert('Failed to update comment: ' + error.message);
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = '<i class="bx bxs-save"></i>';
                }
            });
        });
    });
}


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
    const input = document.getElementById(`pr${index}Input`);
    const error = document.getElementById(`pr${index}Error`);
    const errorText = document.getElementById(`pr${index}ErrorText`);
    const loading = document.getElementById(`pr${index}Loading`);
    const content = document.getElementById(`pr${index}Content`);
    const btn = document.getElementById(`pr${index}Btn`);

    const prUrl = input.value;
    const parsed = parsePRUrl(prUrl);
    window.currentPRUrl = prUrl; // Store for edit function


    if (!parsed) {
        content.innerHTML = '';
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
    console.log(pr);
    let html = `
        <div class="pr-info">
            <div class="pr-header">
                <h3>${escapeHtml(pr.title)}</h3>
                <a href="${pr.html_url}" target="_blank" rel="noopener noreferrer"> <i class='bx  bx-git-pull-request'  ></i></a> 
            </div>
            <div class="changes">
                <p>${pr.changed_files <= 1 ? pr.changed_files + " file" : pr.changed_files + " files"} changed</p>
                <div class="lines">
                    <p> ± </p>
                    <p><span class="add"> +${pr.additions}</span><span class="rem"> -${pr.deletions}</span></p>
                    <p class="blocks">
                        ${pr.additions >= pr.deletions ?
            "<i class='bx bxs-square add'></i><i class='bx bxs-square add'></i><i class='bx bxs-square rem'></i>" :
            "<i class='bx bxs-square add'></i><i class='bx bxs-square rem'></i><i class='bx bxs-square red'></i>"}
                    </p>
                </div>
                <!-- <p><strong>#${pr.number}</strong> by ${escapeHtml(pr.user.login)}</p> -->
                <!-- <p>State: ${pr.state} • Base: ${pr.base.ref} ← Head: ${pr.head.ref}</p> -->
            </div>
        </div>
    `;

    const generalComments = comments.filter(c => c.body);
    if (generalComments.length > 0) {
        html += `
            <div class="comment-section">
                    <details open>
                    <summary class="section-header">
                    General Comments (${generalComments.length})
                    </summary>
                ${generalComments.map(c => `
                <div class="comment general">
                <details open>
                    <div class="shortcuts">
                        <button class="copy-btn" title="Copy comment" data-copy="${escapeHtml(c.body)}"><i class='bx bxs-copy'></i><span>Copied!</span></button>
                        <a href="${c.html_url}" target="_blank" rel="noopener noreferrer" title="Comment link"><i class='bx bx-link'></i></a>
                        <button class="edit-btn" title="Edit comment" data-text="${escapeHtml(c.body)}" data-comment-id="${c.id}" data-comment-type="issue">
                        <i class='bx bxs-edit'></i>
                        </button>
                    </div>
                    <summary class="comment-meta">${escapeHtml(c.user.login)} • ${new Date(c.created_at).toLocaleString()}</summary>
                    <div class="comment-body"><md-block>${escapeHtml(c.body)}</md-block></div>
                </details>
                </div>

                `).join('')}
            </details>
        </div>


    `;
    }
    const validReviewComments = reviewComments.filter(c => c.body);
    if (validReviewComments.length > 0) {
        // Group comments by file path
        const commentsByFile = validReviewComments.reduce((acc, comment) => {
            const path = comment.path;
            if (!acc[path]) {
                acc[path] = [];
            }
            acc[path].push(comment);
            return acc;
        }, {});

        // Sort files alphabetically and sort comments within each file by line number
        const sortedFiles = Object.keys(commentsByFile).sort();

        html += `
        <div class="comment-section">
            <details open>
                <summary class="section-header">
                    Review Comments (${validReviewComments.length})
                </summary>
                ${sortedFiles.map(filePath => {
            const fileComments = commentsByFile[filePath].sort((a, b) =>
                (a.line ?? a.original_line ?? 0) - (b.line ?? b.original_line ?? 0)
            );

            return `
                        <div class="file-group">
                            <details open>
                                    <summary class="file-header">
                                        <span class="file-path" title="${escapeHtml(filePath)}">
                                            ${escapeHtml(filePath.length <= 50 ? filePath : '...' + filePath.slice(filePath.length - 47))} (${fileComments.length})
                                        </span>
                                </summary>
                                <div class="file-comments">
                                    ${fileComments.map(c => `
                                        <div class="comment review ${escapeHtml(c.body).includes(" bad") ? "negative" : "positive"}">
                                            <details open>
                                                <div class="shortcuts">
                                                    <button class="copy-btn" title="Copy comment" data-copy="${escapeHtml(c.body)}">
                                                        <i class='bx bxs-copy'></i><span>Copied!</span>
                                                    </button>
                                                    <a href="${c.html_url}" target="_blank" rel="noopener noreferrer" title="Comment link">
                                                        <i class='bx bx-link'></i>
                                                    </a>
                                                    <button class="edit-btn" title="Edit comment" data-text="${escapeHtml(c.body)}" data-comment-id="${c.id}" data-comment-type="review">
                                                    <i class='bx bxs-edit'></i>
                                                    </button>
                                                </div>
                                                <summary class="comment-meta">
                                                    Line: ${c.line || c.original_line}
                                                </summary>
                                                <div class="comment-body">
                                                    <md-block>${escapeHtml(c.body)}</md-block>
                                                </div>
                                            </details>
                                        </div>
                                    `).join('')}
                                </div>
                            </details>
                        </div>
                    `;
        }).join('')}
            </details>
        </div>
    `;
    }

    const validReviews = reviews.filter(r => r.body);
    if (validReviews.length > 0) {
        html += `
      <div class="comment-section">
      <details open>
        <summary class="section-header">
            Reviews (${validReviews.length})
        </summary>
        ${validReviews.map(r => `
          <div class="comment summary">
            <details open>
                <div class="shortcuts">
                    <button class="copy-btn" title="Copy comment" data-copy="${escapeHtml(c.body)}"><i class='bx bxs-copy'></i><span>Copied!</span></button>
                    <a href="${c.html_url}" target="_blank" rel="noopener noreferrer" title="Comment link"><i class='bx  bx-link'  ></i></a>
                </div>
                <summary class="comment-meta">${escapeHtml(r.user.login)} • ${r.state}</summary>
                <div class="comment-body"><md-block>${escapeHtml(r.body)}</md-block></div>
            </details>
          </div>
        `).join('')}
        </details>
      </div>
    `;
    }

    if (generalComments.length === 0 && validReviewComments.length === 0 && validReviews.length === 0) {
        html += '<p class="placeholder error"><i class="bx bx-x-circle add"></i> No comments found for this PR.</p>';
    }

    container.innerHTML = html;

    setupEditButtons(container);
    setupCopyButtons();

}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
