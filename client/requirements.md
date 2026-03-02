## Packages
react-dropzone | Better file upload drag-and-drop experience
date-fns | Date formatting
clsx | Class name merging (already in stack but good to ensure)
tailwind-merge | Class merging (already in stack)
lucide-react | Icons

## Notes
Tailwind Config - extend fontFamily:
fontFamily: {
  sans: ["var(--font-sans)"],
  display: ["var(--font-display)"],
}
File uploads expect POST /api/documents with multipart/form-data containing a 'file' field.
