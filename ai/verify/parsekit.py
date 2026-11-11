"""Turn the documents of the Brewline set into text that keeps what matters: sections and tables. The lessons show this file."""
import re


def pdf_pages(path):
    """One string for each page. A PDF has no headings and no table cells inside, only text placed on a page, so this is all that a text extractor sees."""
    import pypdf
    return [p.extract_text() or '' for p in pypdf.PdfReader(str(path)).pages]


def _row(cells):
    return '| ' + ' | '.join(c.strip() for c in cells) + ' |'


def docx_markdown(path):
    """Headings become # lines and tables become pipe rows, in the order of the document."""
    import docx
    from docx.table import Table
    from docx.text.paragraph import Paragraph
    d = docx.Document(str(path))
    out = []
    for child in d.element.body.iterchildren():
        if child.tag.endswith('}p'):
            p = Paragraph(child, d)
            m = re.match(r'Heading (\d)', p.style.name or '')
            if p.text.strip():
                out.append(('#' * int(m.group(1)) + ' ' if m else '') + p.text.strip())
        elif child.tag.endswith('}tbl'):
            t = Table(child, d)
            out += [_row([c.text for c in r.cells]) for r in t.rows]
    return '\n\n'.join(out)


def html_naive(html):
    """What you get from get_text(): the navigation, the script, the footer, and a table with its cells in a row of words."""
    from bs4 import BeautifulSoup
    return BeautifulSoup(html, 'html.parser').get_text(' ')


def html_markdown(html):
    """Drop what is not content, keep headings, and write a table as rows, so that a cell stays next to its column."""
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, 'html.parser')
    for tag in soup(['script', 'style', 'nav', 'footer', 'head']):
        tag.decompose()
    out = []
    for el in soup.body.find_all(['h1', 'h2', 'h3', 'p', 'table'], recursive=True):
        if el.name == 'table':
            out += [_row([c.get_text(' ', strip=True) for c in tr.find_all(['th', 'td'])]) for tr in el.find_all('tr')]
        elif el.name == 'p':
            out.append(el.get_text(' ', strip=True))
        else:
            out.append('#' * int(el.name[1]) + ' ' + el.get_text(' ', strip=True))
    return '\n\n'.join(out)
