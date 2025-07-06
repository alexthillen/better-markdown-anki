# Better Markdown Anki

A powerful React-based Anki add-on that transforms your flashcards with advanced markdown rendering, interactive features, and modern web technologies for an enhanced study experience.

## Preview

![Better Markdown Anki Review](https://raw.githubusercontent.com/alexthillen/better-markdown-anki/refs/heads/main/.github/assets/better-markdown-anki-example.gif)

![Better Markdown Anki Preview](https://raw.githubusercontent.com/alexthillen/better-markdown-anki/refs/heads/main/.github/assets/better-markdown-anki-preview.png)

## Features

### 🎨 Enhanced Visual Experience
- **Theme-aware design** that automatically adapts to Anki's light/dark mode
- **Color-coded card sections** with distinct styling for front, back, and extra content
- **Modern UI components** built with React and Mantine UI library

### 📝 Advanced Markdown Support
- **Full markdown rendering** with proper formatting for headers, lists, tables, and more
- **LaTeX math support** using KaTeX for both inline (`$...$`) and block (`$$...$$`) equations
- **Syntax highlighting** for code blocks with language-specific coloring
- **HTML entity decoding** for proper character display

### 🔄 Interactive Cloze Deletions
- **Toggle switches** for each cloze deletion to show/hide content dynamically
- **Smart cloze processing** that preserves formatting within code blocks and math expressions
- **Visual indicators** for active/inactive cloze states

### 🏷️ Smart Card Organization
- **Tag display** with styled badges for easy categorization
- **Difficulty indicators** to show card complexity at a glance

## Installation

1. Download the add-on from the Anki add-on repository or by downloading the `.apkg`.
2. In Anki, go to **Tools** → **Add-ons** → **Install from file...**
3. Select the downloaded file and restart Anki
4. The add-on will automatically create the necessary note types on first launch

## Note Types

The add-on creates two specialized note types:

### Better Markdown : Basic
- **Fields**: Front, Back, Extra, Difficulty
- **Use case**: Traditional question-answer flashcards with markdown formatting

### Better Markdown : Cloze
- **Fields**: Text, Back Extra, Difficulty  
- **Use case**: Interactive cloze deletion cards with enhanced markdown support

## Usage

1. Create a new note using one of the "Better Markdown" note types
2. Write your content using standard markdown syntax
3. The add-on will automatically render your markdown with enhanced styling
4. Math expressions can be written using LaTeX syntax
5. Use toggle switches to interact with cloze deletions dynamically

## Technical Architecture

### Core Technologies
- **React 19** with modern hooks and functional components
- **Mantine UI** for consistent, accessible component design
- **Vite** for fast development and optimized builds
- **TypeScript** support for type safety

### Markdown Processing Pipeline
- **`ReactMarkdown`** for base markdown parsing
- **`remark-math`** + **`rehype-katex`** for mathematical expressions
- **`react-syntax-highlighter`** for code block formatting

### Key Features
- **DOM mutation observation** for real-time card updates
- **Automatic theme detection** from Anki's CSS classes
- **Python backend integration** with Anki's API
- **Automatic template and field management** with version control

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Configuration

The add-on includes automatic configuration management:
- Templates are updated automatically when the add-on loads
- Missing fields are added to existing note types
- Theme mode detection from Anki's CSS classes
- Content changes monitored through DOM mutation observation

## Browser Compatibility

Optimized for modern browsers with support for ES2020+ features, CSS custom properties, and DOM MutationObserver API.

