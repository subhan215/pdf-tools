import { useEditor, EditorContent, Editor, Extension } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { forwardRef, useEffect, useImperativeHandle } from 'react'
import Image from '@tiptap/extension-image'
import FontFamily from '@tiptap/extension-font-family'

// Custom FontSize extension
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] }
  },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ''),
          renderHTML: attributes => {
            if (!attributes.fontSize) return {}
            return { style: `font-size: ${attributes.fontSize}` }
          },
        },
      },
    }]
  },
  addCommands(): any {
    return {
      setFontSize: (fontSize: string) => ({ commands }: { commands: any }) => {
        return commands.setMark('textStyle', { fontSize })
      },
      unsetFontSize: () => ({ chain }: { chain: any }) => {
        return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run()
      },
    }
  },
})

// Custom LineSpacing extension - vertical spacing between lines
const LineSpacing = Extension.create({
  name: 'lineSpacing',
  addOptions() {
    return { types: ['paragraph', 'heading'] }
  },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        lineSpacing: {
          default: null,
          parseHTML: element => element.style.lineHeight || null,
          renderHTML: attributes => {
            if (!attributes.lineSpacing) return {}
            return { style: `line-height: ${attributes.lineSpacing}` }
          },
        },
      },
    }]
  },
  addCommands(): any {
    return {
      setLineSpacing: (spacing: string) => ({ commands }: { commands: any }) => {
        return this.options.types.every((type: string) => commands.updateAttributes(type, { lineSpacing: spacing }))
      },
      unsetLineSpacing: () => ({ commands }: { commands: any }) => {
        return this.options.types.every((type: string) => commands.resetAttributes(type, 'lineSpacing'))
      },
    }
  },
})

export interface RichTextEditorRef {
  toggleBold: () => void
  toggleItalic: () => void
  toggleUnderline: () => void
  toggleStrike: () => void
  setHeading: (level: 1 | 2 | 3) => void
  setAlign: (align: 'left' | 'center' | 'right' | 'justify') => void
  toggleBulletList: () => void
  toggleOrderedList: () => void
  setColor: (color: string) => void
  toggleHighlight: (color?: string) => void
  setLink: (url: string) => void
  unsetLink: () => void
  insertTable: (rows?: number, cols?: number) => void
  deleteTable: () => void
  undo: () => void
  redo: () => void
  setFontFamily: (font: string) => void
  setFontSize: (size: string) => void
  setLineSpacing: (spacing: string) => void
  getEditor: () => Editor | null
}

interface RichTextEditorProps {
  content: string
  onChange?: (html: string) => void
  className?: string
  editable?: boolean
}

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({ content, onChange, className, editable = true }, ref) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Image,
      FontFamily,
      FontSize,
      LineSpacing,
    ],
    content,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
      // Reset stored marks when editor is empty to prevent old formatting from persisting
      if (editor.isEmpty) {
        editor.commands.unsetAllMarks()
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none h-full',
      },
    },
  })

  // Sync content if it changes externally
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      if (editor.getHTML() !== content) {
        editor.commands.setContent(content)
      }
    }
  }, [content, editor])

  useEffect(() => {
    if (editor) {
      editor.setEditable(editable)
    }
  }, [editable, editor])

  useImperativeHandle(ref, () => ({
    toggleBold: () => editor?.chain().focus().toggleBold().run(),
    toggleItalic: () => editor?.chain().focus().toggleItalic().run(),
    toggleUnderline: () => editor?.chain().focus().toggleUnderline().run(),
    toggleStrike: () => editor?.chain().focus().toggleStrike().run(),
    setHeading: (level) => editor?.chain().focus().toggleHeading({ level }).run(),
    setAlign: (align) => editor?.chain().focus().setTextAlign(align).run(),
    toggleBulletList: () => editor?.chain().focus().toggleBulletList().run(),
    toggleOrderedList: () => editor?.chain().focus().toggleOrderedList().run(),
    setColor: (color) => editor?.chain().focus().setColor(color).run(),
    toggleHighlight: (color) => editor?.chain().focus().toggleHighlight(color ? { color } : undefined).run(),
    setLink: (url) => editor?.chain().focus().setLink({ href: url }).run(),
    unsetLink: () => editor?.chain().focus().unsetLink().run(),
    insertTable: (rows = 3, cols = 3) => editor?.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run(),
    deleteTable: () => editor?.chain().focus().deleteTable().run(),
    undo: () => editor?.chain().focus().undo().run(),
    redo: () => editor?.chain().focus().redo().run(),
    setFontFamily: (font) => editor?.chain().focus().setFontFamily(font).run(),
    setFontSize: (size) => (editor?.commands as any).setFontSize(size),
    setLineSpacing: (spacing) => (editor?.commands as any).setLineSpacing(spacing),
    getEditor: () => editor,
  }))

  return (
    <div className={className}>
      <EditorContent editor={editor} className="h-full" />
    </div>
  )
})

RichTextEditor.displayName = "RichTextEditor"

export default RichTextEditor
