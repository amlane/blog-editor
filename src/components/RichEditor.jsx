import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import Highlight from '@tiptap/extension-highlight'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import { useEffect, useRef, useCallback } from 'react'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered,
  Quote, Code, Minus, Link as LinkIcon, Image as ImageIcon,
  Highlighter, Undo, Redo, RemoveFormatting
} from 'lucide-react'

// Convert HTML to simple Markdown (for saving to .md files)
function htmlToMarkdown(html) {
  // We use a DOM parser approach for reliability
  const el = document.createElement('div')
  el.innerHTML = html

  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent

    const tag = node.tagName?.toLowerCase()
    const children = Array.from(node.childNodes).map(processNode).join('')

    switch (tag) {
      case 'h1': return `\n# ${children}\n`
      case 'h2': return `\n## ${children}\n`
      case 'h3': return `\n### ${children}\n`
      case 'h4': return `\n#### ${children}\n`
      case 'p': return `\n${children}\n`
      case 'strong': case 'b': return `**${children}**`
      case 'em': case 'i': return `*${children}*`
      case 'u': return `<u>${children}</u>`
      case 's': case 'del': return `~~${children}~~`
      case 'code': return node.closest?.('pre') ? children : `\`${children}\``
      case 'pre': {
        const codeEl = node.querySelector('code')
        const lang = codeEl?.className?.match(/language-(\w+)/)?.[1] || ''
        return `\n\`\`\`${lang}\n${codeEl?.textContent || children}\n\`\`\`\n`
      }
      case 'blockquote': return `\n> ${children.trim().replace(/\n/g, '\n> ')}\n`
      case 'ul': return '\n' + Array.from(node.children).map(li => `- ${li.textContent}`).join('\n') + '\n'
      case 'ol': return '\n' + Array.from(node.children).map((li, i) => `${i + 1}. ${li.textContent}`).join('\n') + '\n'
      case 'li': return children
      case 'a': {
        const href = node.getAttribute('href') || ''
        return `[${children}](${href})`
      }
      case 'img': {
        const src = node.getAttribute('src') || ''
        const alt = node.getAttribute('alt') || ''
        return `![${alt}](${src})`
      }
      case 'hr': return '\n---\n'
      case 'br': return '\n'
      case 'mark': return `==${children}==`
      default: return children
    }
  }

  let md = processNode(el)
  // Clean up excessive blank lines
  md = md.replace(/\n{3,}/g, '\n\n').trim()
  return md
}

// Convert Markdown back to HTML for the editor
function markdownToHtml(md) {
  if (!md) return ''
  let html = md
    // Code blocks first (before inline code)
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre><code class="language-${lang}">${escHtml(code.trim())}</code></pre>`)
    // Headings
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr>')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
    // Ordered lists  
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/<u>(.+?)<\/u>/g, '<u>$1</u>')
    .replace(/==(.+?)==/g, '<mark>$1</mark>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Links and images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Paragraphs — wrap bare lines
    .replace(/^(?!<[a-z]|$)(.+)$/gm, '<p>$1</p>')

  return html
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const lowlight = createLowlight(common)

export function editorToMarkdown(editor) {
  return htmlToMarkdown(editor.getHTML())
}

export default function RichEditor({ initialMarkdown, onChange }) {
  // Track the last markdown we pushed INTO the editor from outside,
  // so we can distinguish "external load" from "user is typing" and
  // avoid the feedback loop that causes cursor jumps.
  const lastExternalMarkdown = useRef(initialMarkdown)
  const isSettingContent = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Underline,
      Highlight,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      Image,
      Placeholder.configure({ placeholder: 'Start writing…' }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: markdownToHtml(initialMarkdown),
    onUpdate: ({ editor }) => {
      if (isSettingContent.current) return
      const md = htmlToMarkdown(editor.getHTML())
      // Sync immediately so the useEffect below sees no change and skips setContent,
      // preventing the cursor-to-end jump on every keystroke.
      lastExternalMarkdown.current = md
      onChange?.(md)
    },
  })

  // Only reset editor content when initialMarkdown changes due to an
  // external load (navigating to a different post), NOT the keystroke
  // feedback loop from the parent storing markdown state.
  useEffect(() => {
    if (!editor || initialMarkdown === undefined) return
    // If it matches what we last pushed in, this is the echo from our
    // own onChange — ignore it to avoid cursor jumps.
    if (initialMarkdown === lastExternalMarkdown.current) return

    lastExternalMarkdown.current = initialMarkdown
    isSettingContent.current = true
    editor.commands.setContent(markdownToHtml(initialMarkdown), false)
    isSettingContent.current = false
  }, [initialMarkdown, editor])

  const setLink = useCallback(() => {
    const prev = editor.getAttributes('link').href
    const url = window.prompt('URL', prev)
    if (url === null) return
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const addImage = useCallback(() => {
    const url = window.prompt('Image URL')
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }, [editor])

  if (!editor) return null

  const ToolBtn = ({ onClick, active, disabled, title, children }) => (
    <button
      type="button"
      className={`toolbar-btn ${active ? 'active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  )

  return (
    <div className="rich-editor">
      <div className="toolbar">
        <div className="toolbar-group">
          <ToolBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo"><Undo size={15} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo"><Redo size={15} /></ToolBtn>
        </div>
        <div className="toolbar-sep" />
        <div className="toolbar-group">
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Heading 1"><Heading1 size={15} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2"><Heading2 size={15} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3"><Heading3 size={15} /></ToolBtn>
        </div>
        <div className="toolbar-sep" />
        <div className="toolbar-group">
          <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold"><Bold size={15} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic"><Italic size={15} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline"><UnderlineIcon size={15} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough"><Strikethrough size={15} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Highlight"><Highlighter size={15} /></ToolBtn>
        </div>
        <div className="toolbar-sep" />
        <div className="toolbar-group">
          <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list"><List size={15} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered list"><ListOrdered size={15} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote"><Quote size={15} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code block"><Code size={15} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider"><Minus size={15} /></ToolBtn>
        </div>
        <div className="toolbar-sep" />
        <div className="toolbar-group">
          <ToolBtn onClick={setLink} active={editor.isActive('link')} title="Add link"><LinkIcon size={15} /></ToolBtn>
          <ToolBtn onClick={addImage} title="Add image"><ImageIcon size={15} /></ToolBtn>
          <ToolBtn onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} title="Clear formatting"><RemoveFormatting size={15} /></ToolBtn>
        </div>
      </div>

      <EditorContent editor={editor} className="editor-content" />
    </div>
  )
}
