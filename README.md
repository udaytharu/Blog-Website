# Blog Website

## Code Structure

```
Blog-Website-main/
├── config/                # Database configuration (if backend is used)
├── editor_login_page/
│   ├── editor_page/
│   │   ├── editor.html    # Editor dashboard and post management UI
│   │   ├── editor.js      # Editor dashboard logic, rich text editor, post CRUD
│   │   ├── editor.css     # Editor dashboard styles
│   ├── editorlog.html     # Editor login page
│   ├── editorlog.js       # Editor login logic and feedback
│   ├── editorlog.css      # Editor login styles
├── user_login_page/
│   ├── user_page/
│   │   ├── user.html      # User-facing blog page
│   │   ├── user.js        # User page logic (show more/hide, search, filter, like, comment)
│   │   ├── user.css       # User page styles
│   ├── userlog.html       # User login page
│   ├── userlog.js         # User login logic
│   ├── userlog.css        # User login styles
├── models/                # Data models (if backend is used)
├── server.js              # Backend server (if used)
├── style.css              # Shared/global styles
├── script.js              # Shared/global scripts
├── README.md              # Project documentation
└── ...                    # Other config and support files
```

- **editor_page/**: All files for the editor dashboard, post creation, and management.
- **user_page/**: All files for the user-facing blog experience.
- **models/**, **server.js**, **config/**: Backend logic and database (if used).

## Project Description
A modern, full-featured blog platform that allows editors to create, format, and manage posts with a rich text editor, and users to browse, search, and interact with posts. The project is designed for easy content management, responsive user experience, and clear separation between editor and user roles.

## Features

### Editor Page
- **Rich Text Editor**: Create and edit blog posts with formatting options (bold, italic, underline, lists, links, images).
- **Toolbar**: Easily apply formatting using toolbar buttons. Underline, bold, italic, lists, links, and images are supported.
- **Image Upload**: Add images to posts via upload and insert them directly into the content.
- **Link Handling**: When inserting a link, if you do not include 'http://' or 'https://', it is added automatically so the link always works.
- **Post Management**: Create, edit, draft, publish, and delete posts. Save drafts and manage published content.
- **Sidebar Navigation**: Quickly access dashboard, posts, drafts, media, analytics, and settings.
- **Profile Management**: Update editor profile and settings.
- **Login Feedback**: Success messages are shown in green, errors in red for clear feedback.

### User Page
- **Responsive Post Grid**: Posts are displayed in a masonry (zig-zag) layout that adapts to screen size.
- **Show More/Hide**: Long post content is truncated with a 'Show more' link. Click to expand, and 'Hide' to collapse.
- **Search and Filter**: Real-time search and filter for posts by title or content.
- **Like and Comment**: Users can like and comment on posts.
- **No Scrollbars in Content**: Post content area expands/collapses with show more/hide, no scrollbars.

## How to Use

### Editor Page
1. **Login as Editor**: Use the editor login page to access the dashboard.
2. **Create/Edit Posts**: Use the 'New Post' or 'Edit' options. Format content using the toolbar above the content area.
3. **Add Images**: Use the image button in the toolbar or the image upload section.
4. **Insert Links**: Use the link button; URLs are auto-corrected to be absolute.
5. **Save or Publish**: Save as draft or publish immediately. Manage drafts and published posts from the sidebar.
6. **Profile & Settings**: Update your profile and settings from the sidebar.

### User Page
1. **Browse Posts**: Posts are shown in a responsive, zig-zag grid.
2. **Show More/Hide**: For long posts, click 'Show more' to expand and 'Hide' to collapse.
3. **Search & Filter**: Use the search box and filter dropdowns to find posts.
4. **Like & Comment**: Interact with posts by liking or commenting.

## Getting Started
1. Clone the repository
2. Install dependencies with `npm install` (if backend is used)
3. Open `index.html` or run server.js if backend as needed by `node server.js`

---

For more details, see the code and comments in each file.
