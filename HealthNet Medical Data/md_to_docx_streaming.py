#!/usr/bin/env python3
"""
Streaming Markdown to DOCX converter for large files.
Processes the markdown file line by line without loading into memory.
"""

import re
import sys
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

def md_to_docx_streaming(md_file_path, docx_file_path):
    doc = Document()
    
    # Set default font
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Calibri'
    font.size = Pt(11)
    
    # Configure heading styles
    for i in range(1, 5):
        heading_style = doc.styles[f'Heading {i}']
        heading_style.font.name = 'Calibri'
        heading_style.font.color.rgb = RGBColor(0x1E, 0x4D, 0x8C)  # Dark blue
        if i == 1:
            heading_style.font.size = Pt(24)
            heading_style.font.bold = True
        elif i == 2:
            heading_style.font.size = Pt(18)
            heading_style.font.bold = True
        elif i == 3:
            heading_style.font.size = Pt(14)
            heading_style.font.bold = True
        else:
            heading_style.font.size = Pt(12)
            heading_style.font.bold = True
    
    # Current table data
    table_data = []
    in_table = False
    in_code_block = False
    code_lines = []
    
    line_count = 0
    paragraph_count = 0
    table_count = 0
    
    with open(md_file_path, 'r', encoding='utf-8') as f:
        for line in f:
            line_count += 1
            stripped = line.rstrip('\n')
            
            # Code blocks
            if stripped.startswith('```'):
                if in_code_block:
                    # End code block
                    if code_lines:
                        p = doc.add_paragraph()
                        p.style = doc.styles['Normal']
                        run = p.add_run('\n'.join(code_lines))
                        run.font.name = 'Courier New'
                        run.font.size = Pt(9)
                        paragraph_count += 1
                    code_lines = []
                    in_code_block = False
                else:
                    in_code_block = True
                continue
            
            if in_code_block:
                code_lines.append(stripped)
                continue
            
            # Tables
            if '|' in stripped and not stripped.startswith('#') and not stripped.startswith('>'):
                # Check if it's a table separator line
                if re.match(r'^\s*\|?[\s:]*[-]+[\s:]*\|', stripped):
                    continue  # Skip separator lines
                # Parse table row
                cells = [cell.strip() for cell in stripped.split('|')]
                cells = [c for c in cells if c]  # Remove empty cells
                if cells:
                    table_data.append(cells)
                    in_table = True
                continue
            elif in_table and table_data:
                # End of table, create it
                try:
                    num_cols = max(len(row) for row in table_data)
                    if num_cols > 0 and len(table_data) > 0:
                        table = doc.add_table(rows=len(table_data), cols=num_cols)
                        table.style = 'Table Grid'
                        for i, row_data in enumerate(table_data):
                            for j, cell_text in enumerate(row_data):
                                if j < num_cols:
                                    cell = table.rows[i].cells[j]
                                    cell.text = cell_text
                        table_count += 1
                except Exception:
                    pass
                table_data = []
                in_table = False
            
            # Empty lines
            if not stripped.strip():
                continue
            
            # Headings
            if stripped.startswith('# '):
                doc.add_heading(stripped[2:], level=1)
                paragraph_count += 1
            elif stripped.startswith('## '):
                doc.add_heading(stripped[3:], level=2)
                paragraph_count += 1
            elif stripped.startswith('### '):
                doc.add_heading(stripped[4:], level=3)
                paragraph_count += 1
            elif stripped.startswith('#### '):
                doc.add_heading(stripped[5:], level=4)
                paragraph_count += 1
            # Blockquotes
            elif stripped.startswith('> '):
                p = doc.add_paragraph()
                p.style = 'Quote'
                p.add_run(stripped[2:])
                paragraph_count += 1
            # Bullet points
            elif stripped.startswith('- ') or stripped.startswith('* '):
                text = stripped[2:]
                # Handle bold and italic
                p = doc.add_paragraph(style='List Bullet')
                add_formatted_text(p, text)
                paragraph_count += 1
            # Numbered lists
            elif re.match(r'^\d+\.\s', stripped):
                text = re.sub(r'^\d+\.\s', '', stripped)
                p = doc.add_paragraph(style='List Number')
                add_formatted_text(p, text)
                paragraph_count += 1
            # Horizontal rules
            elif stripped == '---' or stripped == '***' or stripped == '___':
                doc.add_paragraph('_' * 50)
                paragraph_count += 1
            # Regular paragraphs
            else:
                p = doc.add_paragraph()
                add_formatted_text(p, stripped)
                paragraph_count += 1
            
            # Progress update every 5000 lines
            if line_count % 5000 == 0:
                print(f"Processed {line_count:,} lines...", file=sys.stderr)
    
    # Add any remaining table
    if in_table and table_data:
        try:
            num_cols = max(len(row) for row in table_data)
            if num_cols > 0 and len(table_data) > 0:
                table = doc.add_table(rows=len(table_data), cols=num_cols)
                table.style = 'Table Grid'
                for i, row_data in enumerate(table_data):
                    for j, cell_text in enumerate(row_data):
                        if j < num_cols:
                            cell = table.rows[i].cells[j]
                            cell.text = cell_text
        except Exception:
            pass
    
    print(f"Saving document...", file=sys.stderr)
    doc.save(docx_file_path)
    
    return {
        'lines': line_count,
        'paragraphs': paragraph_count,
        'tables': table_count
    }

def add_formatted_text(paragraph, text):
    """Add text with bold and italic formatting."""
    # Handle bold and italic markdown
    parts = re.split(r'(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*|`.*?`)', text)
    for part in parts:
        if part.startswith('***') and part.endswith('***'):
            run = paragraph.add_run(part[3:-3])
            run.bold = True
            run.italic = True
        elif part.startswith('**') and part.endswith('**'):
            run = paragraph.add_run(part[2:-2])
            run.bold = True
        elif part.startswith('*') and part.endswith('*') and len(part) > 2:
            run = paragraph.add_run(part[1:-1])
            run.italic = True
        elif part.startswith('`') and part.endswith('`'):
            run = paragraph.add_run(part[1:-1])
            run.font.name = 'Courier New'
            run.font.size = Pt(9)
        else:
            paragraph.add_run(part)

if __name__ == '__main__':
    md_path = '/mnt/agents/output/HealthNet_AI_Medical_Knowledge_Base.md'
    docx_path = '/mnt/agents/output/HealthNet_AI_Medical_Knowledge_Base.docx'
    
    print(f"Converting {md_path} to {docx_path}...", file=sys.stderr)
    stats = md_to_docx_streaming(md_path, docx_path)
    
    print(f"\nConversion complete!")
    print(f"Lines processed: {stats['lines']:,}")
    print(f"Paragraphs created: {stats['paragraphs']:,}")
    print(f"Tables created: {stats['tables']:,}")
