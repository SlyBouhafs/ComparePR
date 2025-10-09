A small webapp that helps writing and reviewing comparison PRs.

1. Clone the repo.
2. Install dependencies `npm install`
3. Run the app `npm start`

Go to https://localhost:3000 start comparing PRs!

## Features

- Compares 3 PRs side-by-side
- No CORS issues (backend proxy handles GitHub API calls)
- Works with private repositories
- Responsive design
- Dark mode by default
- Shows all comment types (general, review, inline)  
- Quick copy and link button on every comment
- Comments organized by files and ordered by lines.
- Collapsible comment sections, file sections and line sections.
- Comments count for comment sections and files.
- Supports comments editing.
- Secure token storage using browser localStorage